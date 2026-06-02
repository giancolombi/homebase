import type { Budget, Transaction } from "@/types/family";

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number; // 0–100+, how much of the budget is used
  over: boolean;
}

// Sum spending (negative amounts) per category for the given YYYY-MM month and
// compare against each budget's monthly limit.
export function computeBudgetStatus(
  budgets: Budget[],
  transactions: Transaction[],
  month: string,
): BudgetStatus[] {
  const spentByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue; // income / refunds don't count as spend
    if (!t.date.startsWith(month)) continue;
    spentByCategory[t.category] =
      (spentByCategory[t.category] ?? 0) + Math.abs(t.amount);
  }

  return budgets.map((b) => {
    const spent = spentByCategory[b.category] ?? 0;
    const remaining = b.monthlyLimit - spent;
    const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    return {
      category: b.category,
      limit: b.monthlyLimit,
      spent,
      remaining,
      pct,
      over: spent > b.monthlyLimit,
    };
  });
}

/** Current month as YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}
