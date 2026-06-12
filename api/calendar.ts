import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthRequest } from "./auth.js";
import { isFamilyMember, resolveFamilyId } from "./lib/familyAuth.js";
import pool from "./db.js";
import { JWT_SECRET, APP_URL } from "./lib/config.js";
import { encrypt, decrypt } from "./lib/encryption.js";
import {
  createOAuthState,
  verifyOAuthState,
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getUserEmail,
} from "./lib/oauth.js";
import { fetchEvents } from "./lib/calendarProviders.js";
import { validateAppleCredentials, fetchAppleEvents } from "./lib/caldav.js";
import { errorMessage } from "./lib/errors.js";

const router = Router();

// POST /api/calendar/oauth-token — mint a 60-second single-purpose token
// that the OAuth popup passes back as ?token=. The session JWT itself must
// never travel in a URL (URLs end up in browser history, Referer headers,
// and server access logs).
router.post("/oauth-token", requireAuth, (req: AuthRequest, res: Response) => {
  const token = jwt.sign(
    { sub: req.user!.id, purpose: "calendar-oauth" },
    JWT_SECRET,
    { expiresIn: "60s" },
  );
  res.json({ token });
});

// GET /api/calendar/auth/:provider — redirect to OAuth provider
// No requireAuth — this is a browser redirect (popup), not XHR.
// Identity comes from the short-lived purpose token minted by /oauth-token.
router.get("/auth/:provider", async (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const { token, familyId, returnTo } = req.query as {
    token?: string;
    familyId?: string;
    returnTo?: string;
  };

  if (!token || !familyId) {
    res.status(400).json({ error: "token and familyId are required" });
    return;
  }

  if (!["google", "outlook"].includes(provider)) {
    res.status(400).json({ error: "Unsupported provider" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as {
      sub: string;
      purpose?: string;
    };
    if (payload.purpose !== "calendar-oauth") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Look up the member ID for this user in this family
    const memberResult = await pool.query(
      `SELECT id FROM family_members
       WHERE family_id = $1 AND user_id = $2
       LIMIT 1`,
      [familyId, payload.sub],
    );

    if (memberResult.rows.length === 0) {
      res.status(404).json({ error: "Member not found in family" });
      return;
    }

    const memberId = memberResult.rows[0].id;

    const state = createOAuthState({
      userId: payload.sub,
      memberId,
      familyId,
      provider,
      returnTo: sanitizeReturnTo(returnTo),
    });

    const url = getAuthUrl(provider, state);
    res.redirect(url);
  } catch (err) {
    console.error("OAuth auth error:", err);
    res.status(500).json({ error: "Failed to start OAuth flow" });
  }
});

// Only allow returnTo values that are same-origin app paths to avoid
// open-redirect risk. Defaults to /settings to match the legacy behavior.
function sanitizeReturnTo(returnTo: string | undefined): string {
  if (!returnTo) return "/settings";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//"))
    return "/settings";
  return returnTo;
}

// Build the URL the popup should send the parent to. Encodes everything via
// URLSearchParams so error_description payloads (often multi-word, with
// punctuation, sometimes containing AADSTS codes) can't break out into HTML
// or query syntax.
function buildReturnUrl(
  returnTo: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  return `${APP_URL}${returnTo}?${search.toString()}`;
}

// HTML page that hands a URL to the parent window and closes the popup.
// `url` MUST already be a fully-encoded absolute URL — we still JSON.stringify
// it to be defense-in-depth against breaking out of the string literal.
function popupRedirectHtml(url: string, message: string): string {
  return `<!DOCTYPE html><html><body><script>
  if (window.opener) {
    window.opener.location.href = ${JSON.stringify(url)};
  }
  window.close();
</script><p>${message}</p></body></html>`;
}

// GET /api/calendar/callback/:provider — OAuth callback
router.get("/callback/:provider", async (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const { code, state, error, error_description, error_subcode } =
    req.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
      error_subcode?: string;
    };

  // Best-effort: pull returnTo out of state up front so error paths can
  // redirect the user back to where they started. Falls back to /settings.
  let returnTo = "/settings";
  if (state) {
    try {
      const peek = verifyOAuthState(state);
      if (peek.returnTo) returnTo = peek.returnTo;
    } catch {
      // state may be expired/invalid — leave returnTo as default
    }
  }

  if (error) {
    console.error("OAuth callback error:", {
      error,
      error_subcode,
      error_description,
    });
    const url = buildReturnUrl(returnTo, {
      calendarError: error,
      calendarErrorDescription: error_description,
      calendarErrorSubcode: error_subcode,
    });
    res.send(
      popupRedirectHtml(
        url,
        "Connection cancelled. You can close this window.",
      ),
    );
    return;
  }

  if (!code || !state) {
    res.redirect(buildReturnUrl(returnTo, { calendarError: "missing_params" }));
    return;
  }

  try {
    const stateData = verifyOAuthState(state);
    if (stateData.returnTo) returnTo = stateData.returnTo;

    if (stateData.provider !== provider) {
      res.redirect(
        buildReturnUrl(returnTo, { calendarError: "provider_mismatch" }),
      );
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCode(provider, code);

    // Get user's email from provider
    const externalEmail = await getUserEmail(provider, tokens.access_token);

    // Encrypt tokens
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    // Upsert calendar connection
    await pool.query(
      `INSERT INTO calendar_connections
           (family_id, member_id, provider, email, connected,
            access_token_encrypted, refresh_token_encrypted,
            token_expires_at, external_email)
         VALUES ($1, $2, $3, $4, true, $5, $6, $7, $4)
         ON CONFLICT ON CONSTRAINT calendar_connections_member_provider_unique
         DO UPDATE SET
           connected = true,
           access_token_encrypted = $5,
           refresh_token_encrypted = COALESCE($6, calendar_connections.refresh_token_encrypted),
           token_expires_at = $7,
           external_email = $4,
           sync_error = NULL,
           updated_at = now()`,
      [
        stateData.familyId,
        stateData.memberId,
        provider,
        externalEmail,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
      ],
    );

    // Send a page that closes the popup and notifies the opener
    const successUrl = buildReturnUrl(returnTo, {
      calendarConnected: provider,
    });
    res.send(
      popupRedirectHtml(
        successUrl,
        "Calendar connected! You can close this window.",
      ),
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    const failUrl = buildReturnUrl(returnTo, {
      calendarError: "exchange_failed",
      calendarErrorDescription: errorMessage(err, ""),
    });
    res.send(
      popupRedirectHtml(
        failUrl,
        "Connection failed. You can close this window.",
      ),
    );
  }
});

// POST /api/calendar/apple/connect — connect an iCloud Calendar via CalDAV.
// Apple doesn't support OAuth for iCloud, so the user enters their Apple ID
// and an app-specific password generated at appleid.apple.com. We validate
// against iCloud, then store the encrypted password in the same column as
// Google/Outlook access tokens (provider='apple' distinguishes the row).
router.post(
  "/apple/connect",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { familyId, appleId, appPassword } = req.body as {
      familyId?: string;
      appleId?: string;
      appPassword?: string;
    };

    if (!familyId || !appleId || !appPassword) {
      res
        .status(400)
        .json({ error: "familyId, appleId, and appPassword are required" });
      return;
    }

    // Resolve the user's member row in this family (mirrors the OAuth flow).
    const memberResult = await pool.query(
      `SELECT id FROM family_members
       WHERE family_id = $1 AND user_id = $2
       LIMIT 1`,
      [familyId, userId],
    );
    if (memberResult.rows.length === 0) {
      res.status(404).json({ error: "Member not found in family" });
      return;
    }
    const memberId = memberResult.rows[0].id;

    // Validate against iCloud before persisting anything.
    try {
      await validateAppleCredentials(appleId, appPassword);
    } catch (err) {
      console.warn("iCloud auth rejected:", err);
      res.status(401).json({
        error:
          "Apple rejected those credentials. Make sure you're using an app-specific password from appleid.apple.com (not your regular Apple ID password).",
      });
      return;
    }

    const encryptedPassword = encrypt(appPassword);
    // App-specific passwords don't expire on a fixed schedule — set far-future
    // so the existing isExpired check in getValidAccessToken never triggers
    // for Apple rows (we'll branch around it anyway).
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 50);

    try {
      await pool.query(
        `INSERT INTO calendar_connections
           (family_id, member_id, provider, email, connected,
            access_token_encrypted, token_expires_at, external_email)
         VALUES ($1, $2, 'apple', $3, true, $4, $5, $3)
         ON CONFLICT ON CONSTRAINT calendar_connections_member_provider_unique
         DO UPDATE SET
           connected = true,
           access_token_encrypted = $4,
           token_expires_at = $5,
           email = $3,
           external_email = $3,
           sync_error = NULL,
           updated_at = now()`,
        [familyId, memberId, appleId, encryptedPassword, farFuture],
      );
      res.json({ ok: true, externalEmail: appleId });
    } catch (err) {
      console.error("Apple connect error:", err);
      res
        .status(500)
        .json({ error: errorMessage(err, "Failed to save iCloud connection") });
    }
  },
);

// GET /api/calendar/connections — list connections for a family
router.get(
  "/connections",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;

    try {
      const result = await pool.query(
        `SELECT id, member_id, provider, email, external_email,
                connected, last_synced_at, sync_error, paused_at
         FROM calendar_connections
         WHERE family_id = $1
           AND access_token_encrypted IS NOT NULL`,
        [familyId],
      );

      res.json(
        result.rows.map((row) => ({
          id: row.id,
          memberId: row.member_id,
          provider: row.provider,
          email: row.email,
          externalEmail: row.external_email,
          connected: row.connected,
          lastSyncedAt: row.last_synced_at,
          syncError: row.sync_error,
          pausedAt: row.paused_at,
        })),
      );
    } catch (err) {
      console.error("Get connections error:", err);
      res.status(500).json({ error: "Failed to get connections" });
    }
  },
);

// Helper: get a valid access token, refreshing if needed
async function getValidAccessToken(connectionId: string): Promise<{
  accessToken: string;
  provider: string;
  memberId: string;
  familyId: string;
  externalEmail: string | null;
}> {
  const result = await pool.query(
    `SELECT id, provider, member_id, family_id, external_email,
            access_token_encrypted, refresh_token_encrypted, token_expires_at
     FROM calendar_connections
     WHERE id = $1 AND connected = true`,
    [connectionId],
  );

  if (result.rows.length === 0) {
    throw new Error("Connection not found or not connected");
  }

  const conn = result.rows[0];

  // Apple stores an app-specific password in access_token_encrypted; it
  // doesn't expire on a token clock and there's no refresh flow. Just decrypt
  // and return.
  if (conn.provider === "apple") {
    return {
      accessToken: decrypt(conn.access_token_encrypted),
      provider: conn.provider,
      memberId: conn.member_id,
      familyId: conn.family_id,
      externalEmail: conn.external_email,
    };
  }

  const now = new Date();
  const expiresAt = new Date(conn.token_expires_at);

  // If token is still valid (with 5min buffer), use it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return {
      accessToken: decrypt(conn.access_token_encrypted),
      provider: conn.provider,
      memberId: conn.member_id,
      familyId: conn.family_id,
      externalEmail: conn.external_email,
    };
  }

  // Token expired — refresh it
  if (!conn.refresh_token_encrypted) {
    throw new Error("No refresh token available");
  }

  const refreshToken = decrypt(conn.refresh_token_encrypted);
  const tokens = await refreshAccessToken(conn.provider, refreshToken);

  const newAccessTokenEncrypted = encrypt(tokens.access_token);
  const newTokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  // Update stored tokens
  await pool.query(
    `UPDATE calendar_connections
     SET access_token_encrypted = $1,
         token_expires_at = $2,
         updated_at = now()
     WHERE id = $3`,
    [newAccessTokenEncrypted, newTokenExpiresAt, connectionId],
  );

  return {
    accessToken: tokens.access_token,
    provider: conn.provider,
    memberId: conn.member_id,
    familyId: conn.family_id,
    externalEmail: conn.external_email,
  };
}

// POST /api/calendar/sync/:connectionId — sync events from provider
router.post(
  "/sync/:connectionId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const connectionId = req.params.connectionId as string;

    try {
      // Only members of the connection's family may trigger a sync (which
      // refreshes and decrypts the stored provider tokens).
      const connLookup = await pool.query(
        `SELECT family_id FROM calendar_connections WHERE id = $1`,
        [connectionId],
      );
      if (connLookup.rows.length === 0) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }
      if (!(await isFamilyMember(req.user!.id, connLookup.rows[0].family_id))) {
        res.status(403).json({ error: "Not a member of this family" });
        return;
      }

      const { accessToken, provider, memberId, familyId, externalEmail } =
        await getValidAccessToken(connectionId);

      // Fetch 30 days back, 60 days forward
      const now = new Date();
      const timeMin = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const timeMax = new Date(
        now.getTime() + 60 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const events =
        provider === "apple"
          ? await fetchAppleEvents(
              externalEmail ?? "",
              accessToken,
              timeMin,
              timeMax,
            )
          : await fetchEvents(provider, accessToken, timeMin, timeMax);

      // Upsert events
      for (const event of events) {
        await pool.query(
          `INSERT INTO synced_calendar_events
             (connection_id, family_id, member_id, external_id,
              title, description, date, start_time, end_time,
              all_day, location, source_provider, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (connection_id, external_id)
           DO UPDATE SET
             title = $5, description = $6, date = $7,
             start_time = $8, end_time = $9, all_day = $10,
             location = $11, raw_data = $13, updated_at = now()`,
          [
            connectionId,
            familyId,
            memberId,
            event.externalId,
            event.title,
            event.description,
            event.date,
            event.startTime,
            event.endTime,
            event.allDay,
            event.location,
            provider,
            JSON.stringify(event.rawData),
          ],
        );
      }

      // Remove events no longer in provider
      const externalIds = events.map((e) => e.externalId);
      if (externalIds.length > 0) {
        await pool.query(
          `DELETE FROM synced_calendar_events
           WHERE connection_id = $1
             AND external_id != ALL($2::text[])`,
          [connectionId, externalIds],
        );
      } else {
        // No events returned — clear all synced events for this connection
        await pool.query(
          `DELETE FROM synced_calendar_events WHERE connection_id = $1`,
          [connectionId],
        );
      }

      // Update last synced
      await pool.query(
        `UPDATE calendar_connections
         SET last_synced_at = now(), sync_error = NULL, updated_at = now()
         WHERE id = $1`,
        [connectionId],
      );

      res.json({ syncedCount: events.length });
    } catch (err) {
      console.error("Sync error:", err);
      const msg = errorMessage(err);

      // Mark sync error on the connection
      await pool
        .query(
          `UPDATE calendar_connections
           SET sync_error = $1, updated_at = now()
           WHERE id = $2`,
          [msg, connectionId],
        )
        .catch(() => {});

      // If token was revoked, disconnect
      if (msg.includes("401") || msg.includes("invalid_grant")) {
        await pool
          .query(
            `UPDATE calendar_connections
             SET connected = false, updated_at = now()
             WHERE id = $1`,
            [connectionId],
          )
          .catch(() => {});
      }

      res.status(500).json({ error: "Sync failed" });
    }
  },
);

// GET /api/calendar/events — get merged events for a family
router.get("/events", requireAuth, async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query as {
    startDate: string;
    endDate: string;
  };

  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;

  if (!startDate || !endDate) {
    res.status(400).json({ error: "startDate and endDate are required" });
    return;
  }

  try {
    // Homebase events
    const homebaseResult = await pool.query(
      `SELECT id, member_id, title, description,
                date, start_time, end_time, recurrence
         FROM calendar_events
         WHERE family_id = $1 AND date BETWEEN $2 AND $3`,
      [familyId, startDate, endDate],
    );

    // Synced external events
    const syncedResult = await pool.query(
      `SELECT id, member_id, title, description,
                date, start_time, end_time, all_day,
                location, source_provider
         FROM synced_calendar_events
         WHERE family_id = $1 AND date BETWEEN $2 AND $3`,
      [familyId, startDate, endDate],
    );

    const events = [
      ...homebaseResult.rows.map((row) => ({
        id: row.id,
        memberId: row.member_id,
        title: row.title,
        description: row.description,
        date: row.date.toISOString().split("T")[0],
        startTime: row.start_time,
        endTime: row.end_time,
        recurrence: row.recurrence,
        source: "homebase" as const,
      })),
      ...syncedResult.rows.map((row) => ({
        id: row.id,
        memberId: row.member_id,
        title: row.title,
        description: row.description,
        date: row.date.toISOString().split("T")[0],
        startTime: row.start_time,
        endTime: row.end_time,
        recurrence: "none" as const,
        allDay: row.all_day,
        location: row.location,
        source: row.source_provider as "google" | "outlook",
      })),
    ];

    res.json(events);
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Failed to get events" });
  }
});

// DELETE /api/calendar/connections/:connectionId — disconnect
router.delete(
  "/connections/:connectionId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { connectionId } = req.params;

    try {
      // If we're deleting an eventkit connection, restore any OAuth/CalDAV
      // connections this member had auto-paused by EventKit. paused_at
      // distinguishes "auto-paused by sync" from "user explicitly
      // disconnected" — only the former should be reactivated.
      const lookup = await pool.query(
        `SELECT family_id, member_id, provider FROM calendar_connections
         WHERE id = $1`,
        [connectionId],
      );
      const row = lookup.rows[0];

      if (!row) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }
      // Only members of the connection's family may disconnect it.
      if (!(await isFamilyMember(req.user!.id, row.family_id))) {
        res.status(403).json({ error: "Not a member of this family" });
        return;
      }

      await pool.query(`DELETE FROM calendar_connections WHERE id = $1`, [
        connectionId,
      ]);

      if (row?.provider === "eventkit") {
        await pool.query(
          `UPDATE calendar_connections
           SET connected = true,
               paused_at = NULL,
               updated_at = now()
           WHERE family_id = $1 AND member_id = $2
             AND paused_at IS NOT NULL`,
          [row.family_id, row.member_id],
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Delete connection error:", err);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  },
);

// POST /api/calendar/eventkit/sync — replace the iOS user's EventKit-sourced
// calendar events for this family with the supplied batch.
//
// The iOS app reads the device's Calendar app (which already aggregates
// iCloud, Google, Outlook, and any other calendar accounts the user has
// added) via EventKit, normalizes each event, and ships the batch here on
// app open + on EKEventStoreChanged. We mirror them into
// synced_calendar_events under a per-(family, member) "eventkit" connection
// so other family members see the iOS user's calendar without each having
// to connect the same accounts independently.
router.post(
  "/eventkit/sync",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { familyId, events } = req.body as {
      familyId?: string;
      events?: Array<{
        externalId: string;
        title: string;
        description?: string | null;
        date: string;
        startTime?: string | null;
        endTime?: string | null;
        allDay?: boolean;
        location?: string | null;
        sourceTitle?: string | null;
      }>;
    };

    if (!familyId || !Array.isArray(events)) {
      res.status(400).json({ error: "familyId and events[] are required" });
      return;
    }

    const memberResult = await pool.query(
      `SELECT id FROM family_members
       WHERE family_id = $1 AND user_id = $2
       LIMIT 1`,
      [familyId, userId],
    );
    if (memberResult.rows.length === 0) {
      res.status(404).json({ error: "Member not found in family" });
      return;
    }
    const memberId = memberResult.rows[0].id;

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 50);

    try {
      // Get-or-create the eventkit connection row. Distinct from OAuth
      // connections — provider='eventkit', no token, no refresh.
      const upsertConn = await pool.query(
        `INSERT INTO calendar_connections
           (family_id, member_id, provider, email, connected,
            access_token_encrypted, token_expires_at, external_email)
         VALUES ($1, $2, 'eventkit', $3, true, $4, $5, $3)
         ON CONFLICT ON CONSTRAINT calendar_connections_member_provider_unique
         DO UPDATE SET connected = true, updated_at = now()
         RETURNING id`,
        [familyId, memberId, req.user!.email, "device", farFuture],
      );
      const connectionId = upsertConn.rows[0].id;

      for (const event of events) {
        await pool.query(
          `INSERT INTO synced_calendar_events
             (connection_id, family_id, member_id, external_id,
              title, description, date, start_time, end_time,
              all_day, location, source_provider, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'eventkit', $12)
           ON CONFLICT (connection_id, external_id)
           DO UPDATE SET
             title = $5, description = $6, date = $7,
             start_time = $8, end_time = $9, all_day = $10,
             location = $11, raw_data = $12, updated_at = now()`,
          [
            connectionId,
            familyId,
            memberId,
            event.externalId,
            event.title,
            event.description ?? null,
            event.date,
            event.startTime ?? null,
            event.endTime ?? null,
            !!event.allDay,
            event.location ?? null,
            JSON.stringify({ sourceTitle: event.sourceTitle ?? null }),
          ],
        );
      }

      // Drop events that aren't in this batch — the iOS app sends the
      // canonical current view of the calendar each time.
      const externalIds = events.map((e) => e.externalId);
      if (externalIds.length > 0) {
        await pool.query(
          `DELETE FROM synced_calendar_events
           WHERE connection_id = $1 AND external_id != ALL($2::text[])`,
          [connectionId, externalIds],
        );
      } else {
        await pool.query(
          `DELETE FROM synced_calendar_events WHERE connection_id = $1`,
          [connectionId],
        );
      }

      // Dedup against existing OAuth/CalDAV connections for this member.
      // EventKit returns events for every account synced to the iPhone, so
      // any provider whose sourceTitle appears in this batch would otherwise
      // double up the calendar via /api/calendar/sync.
      const sources = new Set(
        events
          .map((e) => (e.sourceTitle ?? "").toLowerCase())
          .filter((s) => s.length > 0),
      );
      const overlap: string[] = [];
      const matchAny = (substrs: string[]) =>
        Array.from(sources).some((src) => substrs.some((s) => src.includes(s)));
      if (matchAny(["icloud"])) overlap.push("apple");
      if (matchAny(["google", "gmail"])) overlap.push("google");
      if (matchAny(["outlook", "office", "exchange"])) overlap.push("outlook");

      if (overlap.length > 0) {
        await pool.query(
          `UPDATE calendar_connections
           SET connected = false,
               paused_at = now(),
               sync_error = NULL,
               updated_at = now()
           WHERE family_id = $1 AND member_id = $2
             AND provider = ANY($3::text[])`,
          [familyId, memberId, overlap],
        );
        // Drop the now-redundant events so they don't linger on the
        // family calendar view.
        await pool.query(
          `DELETE FROM synced_calendar_events
           WHERE connection_id IN (
             SELECT id FROM calendar_connections
             WHERE family_id = $1 AND member_id = $2
               AND provider = ANY($3::text[])
           )`,
          [familyId, memberId, overlap],
        );
      }

      res.json({
        ok: true,
        count: events.length,
        connectionId,
        pausedProviders: overlap,
      });
    } catch (err) {
      console.error("EventKit sync error:", err);
      res.status(500).json({ error: "Failed to sync EventKit events" });
    }
  },
);

export default router;
