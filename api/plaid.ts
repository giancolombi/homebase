import { Router, type Response } from "express";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type Transaction as PlaidTransaction,
  type RemovedTransaction,
} from "plaid";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";
import { encrypt, decrypt } from "./lib/encryption.js";
import { errorMessage } from "./lib/errors.js";

// Plaid SDK errors carry .response.data with rich diagnostics — narrow safely.
function plaidErrorPayload(err: unknown): unknown {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: unknown } }).response;
    if (response && typeof response === "object" && "data" in response) {
      return response.data;
    }
  }
  return err;
}

// ---------------------------------------------------------------------------
// Plaid client. Configured once from env. In production, PLAID_ENV must be
// `production`. We intentionally throw at route-time (not module load) so the
// API server still boots for unrelated routes when Plaid isn't configured.
// ---------------------------------------------------------------------------

function getClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const envName = (process.env.PLAID_ENV ??
    "sandbox") as keyof typeof PlaidEnvironments;

  if (!clientId || !secret) {
    throw new Error(
      "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.",
    );
  }
  if (!(envName in PlaidEnvironments)) {
    throw new Error(
      `Invalid PLAID_ENV "${envName}". Must be sandbox, development, or production.`,
    );
  }

  const config = new Configuration({
    basePath: PlaidEnvironments[envName],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
        "Plaid-Version": "2020-09-14",
      },
    },
  });
  return new PlaidApi(config);
}

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/plaid/link-token
//
// Returns a short-lived link_token that the frontend uses to bootstrap
// Plaid Link. Scoped to the authenticated user's family.
// ---------------------------------------------------------------------------

router.post(
  "/link-token",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;
    try {
      const client = getClient();
      const redirectUri = process.env.PLAID_REDIRECT_URI || undefined;
      const webhook = process.env.PLAID_WEBHOOK_URL || undefined;
      const resp = await client.linkTokenCreate({
        user: { client_user_id: req.user!.id },
        client_name: "Homebase",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
        ...(webhook ? { webhook } : {}),
      });
      res.json({
        linkToken: resp.data.link_token,
        expiration: resp.data.expiration,
      });
    } catch (err) {
      console.error("Plaid link-token error:", plaidErrorPayload(err));
      res
        .status(500)
        .json({ error: errorMessage(err, "Failed to create link token") });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/plaid/exchange
//
// Body: { familyId, publicToken, institution: { institution_id, name } }
// Exchanges the Link public_token for an access_token, stores the item,
// fetches all accounts, and creates matching bank_accounts rows. Kicks off
// the first transactions sync synchronously so the UI has data immediately.
// ---------------------------------------------------------------------------

interface ExchangeBody {
  familyId: string;
  publicToken: string;
  institution?: { institution_id?: string; name?: string };
}

router.post(
  "/exchange",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;
    const body = req.body as ExchangeBody;
    if (!body.publicToken) {
      res.status(400).json({ error: "publicToken is required" });
      return;
    }

    const client = getClient();
    const db = await pool.connect();
    try {
      const exchange = await client.itemPublicTokenExchange({
        public_token: body.publicToken,
      });
      const accessToken = exchange.data.access_token;
      const itemId = exchange.data.item_id;

      await db.query("BEGIN");

      const itemRow = await db.query(
        `INSERT INTO plaid_items
         (family_id, plaid_item_id, access_token_encrypted, institution_id, institution_name)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (plaid_item_id) DO UPDATE
         SET access_token_encrypted = EXCLUDED.access_token_encrypted,
             institution_id = EXCLUDED.institution_id,
             institution_name = EXCLUDED.institution_name,
             updated_at = now()
       RETURNING id`,
        [
          familyId,
          itemId,
          encrypt(accessToken),
          body.institution?.institution_id ?? null,
          body.institution?.name ?? null,
        ],
      );
      const plaidItemDbId = itemRow.rows[0].id as string;

      const accountsResp = await client.accountsGet({
        access_token: accessToken,
      });
      const institutionName =
        body.institution?.name ??
        accountsResp.data.item.institution_id ??
        "Linked account";

      for (const acct of accountsResp.data.accounts) {
        const balance = acct.balances.current ?? acct.balances.available ?? 0;
        await db.query(
          `INSERT INTO bank_accounts
           (family_id, name, institution, balance, is_featured,
            monthly_balances, plaid_item_id, plaid_account_id,
            iso_currency_code, mask, account_type, account_subtype,
            last_plaid_sync_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         ON CONFLICT (plaid_account_id) DO UPDATE
           SET name = EXCLUDED.name,
               institution = EXCLUDED.institution,
               balance = EXCLUDED.balance,
               iso_currency_code = EXCLUDED.iso_currency_code,
               mask = EXCLUDED.mask,
               account_type = EXCLUDED.account_type,
               account_subtype = EXCLUDED.account_subtype,
               last_plaid_sync_at = now(),
               updated_at = now()`,
          [
            familyId,
            acct.name,
            institutionName,
            balance,
            false,
            JSON.stringify([]),
            plaidItemDbId,
            acct.account_id,
            acct.balances.iso_currency_code ?? null,
            acct.mask ?? null,
            acct.type ?? null,
            acct.subtype ?? null,
          ],
        );
      }

      await db.query("COMMIT");

      // Kick off initial transaction sync. Done inline so the client sees data
      // on the next list call; failures don't invalidate the link itself.
      try {
        await syncItemTransactions(plaidItemDbId);
      } catch (err) {
        console.warn("Initial Plaid transaction sync failed:", err);
      }

      res.status(201).json({ itemId: plaidItemDbId });
    } catch (err) {
      await db.query("ROLLBACK").catch(() => {});
      console.error("Plaid exchange error:", plaidErrorPayload(err));
      res
        .status(500)
        .json({ error: errorMessage(err, "Failed to exchange public token") });
    } finally {
      db.release();
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/plaid/sync/:itemId
//
// Incrementally syncs transactions for one linked item using the stored
// transactions_cursor. Also refreshes account balances.
// ---------------------------------------------------------------------------

router.post(
  "/sync/:itemId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;
    const plaidItemDbId = (req.params as { itemId: string }).itemId;

    // Verify item belongs to this family
    const ownership = await pool.query(
      `SELECT 1 FROM plaid_items WHERE id = $1 AND family_id = $2`,
      [plaidItemDbId, familyId],
    );
    if (ownership.rows.length === 0) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    try {
      const counts = await syncItemTransactions(plaidItemDbId);
      res.json(counts);
    } catch (err) {
      console.error("Plaid sync error:", plaidErrorPayload(err));
      res.status(500).json({ error: errorMessage(err, "Failed to sync") });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/plaid/items/:itemId
//
// Revokes the Plaid access token and deletes the local item + its accounts
// (and thereby its transactions, via ON DELETE CASCADE).
// ---------------------------------------------------------------------------

router.delete(
  "/items/:itemId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;
    const plaidItemDbId = (req.params as { itemId: string }).itemId;

    try {
      const row = await pool.query(
        `SELECT access_token_encrypted FROM plaid_items
       WHERE id = $1 AND family_id = $2`,
        [plaidItemDbId, familyId],
      );
      if (row.rows.length === 0) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      try {
        const client = getClient();
        await client.itemRemove({
          access_token: decrypt(row.rows[0].access_token_encrypted),
        });
      } catch (err) {
        console.warn(
          "Plaid itemRemove failed (continuing with local delete):",
          err,
        );
      }

      await pool.query(`DELETE FROM plaid_items WHERE id = $1`, [
        plaidItemDbId,
      ]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Plaid item delete error:", err);
      res.status(500).json({ error: "Failed to remove item" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/plaid/webhook
//
// Plaid posts here when new transactions are available. We trigger a sync
// for the affected item. This endpoint does NOT require user auth — Plaid
// authenticates by webhook signature (not yet verified; see TODO).
// ---------------------------------------------------------------------------

router.post("/webhook", async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body ?? {};
  res.status(200).json({ acknowledged: true });
  if (webhook_type !== "TRANSACTIONS" || !item_id) return;
  if (
    ![
      "SYNC_UPDATES_AVAILABLE",
      "INITIAL_UPDATE",
      "HISTORICAL_UPDATE",
      "DEFAULT_UPDATE",
    ].includes(webhook_code)
  ) {
    return;
  }
  try {
    const row = await pool.query(
      `SELECT id FROM plaid_items WHERE plaid_item_id = $1`,
      [item_id],
    );
    if (row.rows.length === 0) return;
    await syncItemTransactions(row.rows[0].id);
  } catch (err) {
    console.error("Plaid webhook sync failed:", err);
  }
});

// ---------------------------------------------------------------------------
// Internal: sync transactions for one linked item using /transactions/sync.
// Walks the cursor until has_more=false. Upserts added/modified, deletes
// removed. Updates the item's cursor atomically at the end of each call.
// ---------------------------------------------------------------------------

interface SyncCounts {
  added: number;
  modified: number;
  removed: number;
}

async function syncItemTransactions(
  plaidItemDbId: string,
): Promise<SyncCounts> {
  const client = getClient();
  const itemRow = await pool.query(
    `SELECT access_token_encrypted, transactions_cursor
     FROM plaid_items WHERE id = $1`,
    [plaidItemDbId],
  );
  if (itemRow.rows.length === 0) {
    throw new Error("Plaid item not found");
  }
  const accessToken = decrypt(itemRow.rows[0].access_token_encrypted);
  let cursor: string | null = itemRow.rows[0].transactions_cursor;

  const added: PlaidTransaction[] = [];
  const modified: PlaidTransaction[] = [];
  const removed: RemovedTransaction[] = [];

  try {
    let hasMore = true;
    while (hasMore) {
      const resp = await client.transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
      });
      added.push(...resp.data.added);
      modified.push(...resp.data.modified);
      removed.push(...resp.data.removed);
      hasMore = resp.data.has_more;
      cursor = resp.data.next_cursor;
    }
  } catch (err) {
    await pool.query(
      `UPDATE plaid_items SET sync_error = $2, updated_at = now() WHERE id = $1`,
      [plaidItemDbId, errorMessage(err, "sync failed").slice(0, 500)],
    );
    throw err;
  }

  // Map plaid_account_id -> bank_accounts.id for this item
  const acctRows = await pool.query(
    `SELECT id, plaid_account_id, family_id FROM bank_accounts
     WHERE plaid_item_id = $1`,
    [plaidItemDbId],
  );
  const byPlaidAcct = new Map<string, { id: string; familyId: string }>();
  for (const r of acctRows.rows) {
    if (r.plaid_account_id) {
      byPlaidAcct.set(r.plaid_account_id, { id: r.id, familyId: r.family_id });
    }
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    for (const tx of [...added, ...modified]) {
      const account = byPlaidAcct.get(tx.account_id);
      if (!account) continue; // account wasn't imported — skip
      const category =
        tx.personal_finance_category?.primary ??
        tx.category?.[0] ??
        "Uncategorized";

      await db.query(
        `INSERT INTO transactions
           (family_id, account_id, description, amount, date, category,
            plaid_transaction_id, merchant_name, iso_currency_code, pending, payment_channel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (plaid_transaction_id) DO UPDATE
           SET description = EXCLUDED.description,
               amount = EXCLUDED.amount,
               date = EXCLUDED.date,
               category = EXCLUDED.category,
               merchant_name = EXCLUDED.merchant_name,
               iso_currency_code = EXCLUDED.iso_currency_code,
               pending = EXCLUDED.pending,
               payment_channel = EXCLUDED.payment_channel`,
        [
          account.familyId,
          account.id,
          tx.name,
          // Plaid: positive = outflow. Homebase convention: negative = expense.
          -tx.amount,
          tx.date,
          category,
          tx.transaction_id,
          tx.merchant_name ?? null,
          tx.iso_currency_code ?? null,
          tx.pending,
          tx.payment_channel ?? null,
        ],
      );
    }

    for (const tx of removed) {
      if (!tx.transaction_id) continue;
      await db.query(
        `DELETE FROM transactions WHERE plaid_transaction_id = $1`,
        [tx.transaction_id],
      );
    }

    // Refresh balances
    const accountsResp = await client.accountsGet({
      access_token: accessToken,
    });
    for (const acct of accountsResp.data.accounts) {
      const balance = acct.balances.current ?? acct.balances.available ?? 0;
      await db.query(
        `UPDATE bank_accounts
           SET balance = $2,
               iso_currency_code = $3,
               last_plaid_sync_at = now(),
               updated_at = now()
         WHERE plaid_account_id = $1`,
        [acct.account_id, balance, acct.balances.iso_currency_code ?? null],
      );
    }

    await db.query(
      `UPDATE plaid_items
         SET transactions_cursor = $2,
             last_synced_at = now(),
             sync_error = NULL,
             updated_at = now()
       WHERE id = $1`,
      [plaidItemDbId, cursor],
    );

    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
  }

  return {
    added: added.length,
    modified: modified.length,
    removed: removed.length,
  };
}

// ---------------------------------------------------------------------------
// GET /api/plaid/items?familyId=...
//
// Lists all Plaid-linked items for this family. Handy for a
// "manage linked banks" view.
// ---------------------------------------------------------------------------

router.get("/items", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT id, institution_id, institution_name, last_synced_at, sync_error, created_at
       FROM plaid_items WHERE family_id = $1 ORDER BY created_at DESC`,
      [familyId],
    );
    res.json(
      r.rows.map((row) => ({
        id: row.id,
        institutionId: row.institution_id,
        institutionName: row.institution_name,
        lastSyncedAt: row.last_synced_at,
        syncError: row.sync_error,
        createdAt: row.created_at,
      })),
    );
  } catch (err) {
    console.error("List plaid items error:", err);
    res.status(500).json({ error: "Failed to list linked banks" });
  }
});

export default router;
