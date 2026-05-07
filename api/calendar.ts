import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
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

const router = Router();
const APP_URL = process.env.APP_URL || "http://localhost:8080";

// GET /api/calendar/auth/:provider — redirect to OAuth provider
// No requireAuth — this is a browser redirect (popup), not XHR.
// The user's identity is verified via the JWT token passed as a query param.
router.get("/auth/:provider", async (req: Request, res: Response) => {
  const { provider } = req.params;
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
    // Verify the JWT to get the user's identity
    const jwt = await import("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
    const payload = jwt.default.verify(token, JWT_SECRET) as {
      sub: string;
    };

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
  } catch (err: any) {
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
  const { provider } = req.params;
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
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    const failUrl = buildReturnUrl(returnTo, {
      calendarError: "exchange_failed",
      calendarErrorDescription: err?.message,
    });
    res.send(
      popupRedirectHtml(
        failUrl,
        "Connection failed. You can close this window.",
      ),
    );
  }
});

// GET /api/calendar/connections — list connections for a family
router.get(
  "/connections",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.query as { familyId: string };

    if (!familyId) {
      res.status(400).json({ error: "familyId is required" });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT id, member_id, provider, email, external_email,
                connected, last_synced_at, sync_error
         FROM calendar_connections
         WHERE family_id = $1`,
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
        })),
      );
    } catch (err: any) {
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
}> {
  const result = await pool.query(
    `SELECT id, provider, member_id, family_id,
            access_token_encrypted, refresh_token_encrypted, token_expires_at
     FROM calendar_connections
     WHERE id = $1 AND connected = true`,
    [connectionId],
  );

  if (result.rows.length === 0) {
    throw new Error("Connection not found or not connected");
  }

  const conn = result.rows[0];
  const now = new Date();
  const expiresAt = new Date(conn.token_expires_at);

  // If token is still valid (with 5min buffer), use it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return {
      accessToken: decrypt(conn.access_token_encrypted),
      provider: conn.provider,
      memberId: conn.member_id,
      familyId: conn.family_id,
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
  };
}

// POST /api/calendar/sync/:connectionId — sync events from provider
router.post(
  "/sync/:connectionId",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { connectionId } = req.params;

    try {
      const { accessToken, provider, memberId, familyId } =
        await getValidAccessToken(connectionId);

      // Fetch 30 days back, 60 days forward
      const now = new Date();
      const timeMin = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const timeMax = new Date(
        now.getTime() + 60 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const events = await fetchEvents(provider, accessToken, timeMin, timeMax);

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
    } catch (err: any) {
      console.error("Sync error:", err);

      // Mark sync error on the connection
      await pool
        .query(
          `UPDATE calendar_connections
           SET sync_error = $1, updated_at = now()
           WHERE id = $2`,
          [err.message, connectionId],
        )
        .catch(() => {});

      // If token was revoked, disconnect
      if (
        err.message.includes("401") ||
        err.message.includes("invalid_grant")
      ) {
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
router.get(
  "/events",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { familyId, startDate, endDate } = req.query as {
      familyId: string;
      startDate: string;
      endDate: string;
    };

    if (!familyId || !startDate || !endDate) {
      res
        .status(400)
        .json({ error: "familyId, startDate, and endDate are required" });
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
    } catch (err: any) {
      console.error("Get events error:", err);
      res.status(500).json({ error: "Failed to get events" });
    }
  },
);

// DELETE /api/calendar/connections/:connectionId — disconnect
router.delete(
  "/connections/:connectionId",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { connectionId } = req.params;

    try {
      await pool.query(`DELETE FROM calendar_connections WHERE id = $1`, [
        connectionId,
      ]);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete connection error:", err);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  },
);

export default router;
