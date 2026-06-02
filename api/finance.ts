import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";

const router = Router();
router.use(requireAuth);

// ============ Bank accounts ============

interface BankAccountRow {
  id: string;
  name: string;
  institution: string;
  balance: string | number;
  is_featured: boolean;
  savings_goal: string | number | null;
  monthly_balances: unknown[] | null;
}

function accountRowToDTO(row: BankAccountRow) {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    balance: Number(row.balance),
    isFeatured: row.is_featured,
    savingsGoal:
      row.savings_goal === null ? undefined : Number(row.savings_goal),
    monthlyBalances: row.monthly_balances ?? [],
  };
}

// GET /api/finance/accounts?familyId=...
router.get("/accounts", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT * FROM bank_accounts WHERE family_id = $1 ORDER BY created_at ASC`,
      [familyId],
    );
    res.json(r.rows.map(accountRowToDTO));
  } catch (err) {
    console.error("List accounts error:", err);
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

interface AccountInput {
  name: string;
  institution: string;
  balance?: number;
  isFeatured?: boolean;
  savingsGoal?: number | null;
  monthlyBalances?: unknown[];
}

// POST /api/finance/accounts { familyId, ...AccountInput }
router.post("/accounts", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as AccountInput;
  if (!body.name?.trim() || !body.institution?.trim()) {
    res.status(400).json({ error: "name and institution are required" });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO bank_accounts (family_id, name, institution, balance, is_featured, savings_goal, monthly_balances)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        familyId,
        body.name.trim(),
        body.institution.trim(),
        body.balance ?? 0,
        body.isFeatured ?? false,
        body.savingsGoal ?? null,
        JSON.stringify(body.monthlyBalances ?? []),
      ],
    );
    res.status(201).json(accountRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Create account error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// PUT /api/finance/accounts/:id { familyId, ...partial }
router.put("/accounts/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as Partial<AccountInput>;
  const fields: string[] = [];
  const values: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    fields.push(`${sql} = $${values.length}`);
  };
  if (body.name !== undefined) push("name", body.name);
  if (body.institution !== undefined) push("institution", body.institution);
  if (body.balance !== undefined) push("balance", body.balance);
  if (body.isFeatured !== undefined) push("is_featured", body.isFeatured);
  if (body.savingsGoal !== undefined) push("savings_goal", body.savingsGoal);
  if (body.monthlyBalances !== undefined)
    push("monthly_balances", JSON.stringify(body.monthlyBalances));

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  try {
    values.push(req.params.id, familyId);
    const r = await pool.query(
      `UPDATE bank_accounts SET ${fields.join(", ")}
       WHERE id = $${values.length - 1} AND family_id = $${values.length}
       RETURNING *`,
      values,
    );
    if (r.rows.length === 0) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(accountRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Update account error:", err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// DELETE /api/finance/accounts/:id?familyId=...
router.delete("/accounts/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(
      `DELETE FROM bank_accounts WHERE id = $1 AND family_id = $2`,
      [req.params.id, familyId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ============ Transactions ============

interface TransactionRow {
  id: string;
  account_id: string;
  description: string;
  amount: string | number;
  date: string;
  category: string | null;
}

function txRowToDTO(row: TransactionRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
  };
}

// GET /api/finance/transactions?familyId=...
router.get("/transactions", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT id, account_id, description, amount, date, category
       FROM transactions WHERE family_id = $1 ORDER BY date DESC`,
      [familyId],
    );
    res.json(r.rows.map(txRowToDTO));
  } catch (err) {
    console.error("List transactions error:", err);
    res.status(500).json({ error: "Failed to list transactions" });
  }
});

interface TxInput {
  accountId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

// POST /api/finance/transactions { familyId, ...TxInput }
router.post("/transactions", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as TxInput;
  if (!body.accountId || !body.description || body.amount === undefined) {
    res
      .status(400)
      .json({ error: "accountId, description, amount are required" });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO transactions (family_id, account_id, description, amount, date, category)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, account_id, description, amount, date, category`,
      [
        familyId,
        body.accountId,
        body.description,
        body.amount,
        body.date,
        body.category,
      ],
    );
    res.status(201).json(txRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Create transaction error:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// PUT /api/finance/transactions/:id { familyId, ...partial }
router.put("/transactions/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const body = req.body as Partial<TxInput>;
  const fields: string[] = [];
  const values: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    fields.push(`${sql} = $${values.length}`);
  };
  if (body.accountId !== undefined) push("account_id", body.accountId);
  if (body.description !== undefined) push("description", body.description);
  if (body.amount !== undefined) push("amount", body.amount);
  if (body.date !== undefined) push("date", body.date);
  if (body.category !== undefined) push("category", body.category);

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  try {
    values.push(req.params.id, familyId);
    const r = await pool.query(
      `UPDATE transactions SET ${fields.join(", ")}
       WHERE id = $${values.length - 1} AND family_id = $${values.length}
       RETURNING id, account_id, description, amount, date, category`,
      values,
    );
    if (r.rows.length === 0) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(txRowToDTO(r.rows[0]));
  } catch (err) {
    console.error("Update transaction error:", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// DELETE /api/finance/transactions/:id?familyId=...
router.delete("/transactions/:id", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    await pool.query(
      `DELETE FROM transactions WHERE id = $1 AND family_id = $2`,
      [req.params.id, familyId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ============ Budgets ============

// GET /api/finance/budgets?familyId=...
router.get("/budgets", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const r = await pool.query(
      `SELECT category, monthly_limit FROM budgets WHERE family_id = $1
       ORDER BY category ASC`,
      [familyId],
    );
    res.json(
      r.rows.map((row) => ({
        category: row.category,
        monthlyLimit: Number(row.monthly_limit),
      })),
    );
  } catch (err) {
    console.error("List budgets error:", err);
    res.status(500).json({ error: "Failed to list budgets" });
  }
});

// PUT /api/finance/budgets { familyId, category, monthlyLimit } — upsert
router.put("/budgets", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { category, monthlyLimit } = req.body as {
    category?: string;
    monthlyLimit?: number;
  };
  if (
    !category?.trim() ||
    typeof monthlyLimit !== "number" ||
    monthlyLimit < 0
  ) {
    res
      .status(400)
      .json({ error: "category and a non-negative monthlyLimit are required" });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO budgets (family_id, category, monthly_limit)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, category)
       DO UPDATE SET monthly_limit = $3`,
      [familyId, category.trim(), monthlyLimit],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Upsert budget error:", err);
    res.status(500).json({ error: "Failed to save budget" });
  }
});

// DELETE /api/finance/budgets?familyId=...&category=...
router.delete("/budgets", async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const category = req.query.category as string | undefined;
  if (!category) {
    res.status(400).json({ error: "category is required" });
    return;
  }
  try {
    await pool.query(
      `DELETE FROM budgets WHERE family_id = $1 AND category = $2`,
      [familyId, category],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete budget error:", err);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;
