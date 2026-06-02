import { describe, it, expect } from "vitest";
import { computeBudgetStatus } from "./budgets";
import type { Budget, Transaction } from "@/types/family";

const budgets: Budget[] = [
  { category: "Groceries", monthlyLimit: 400 },
  { category: "Dining", monthlyLimit: 150 },
];

function tx(category: string, amount: number, date: string): Transaction {
  return {
    id: date + amount,
    accountId: "a",
    description: "x",
    amount,
    date,
    category,
  };
}

describe("computeBudgetStatus", () => {
  it("sums spend per category for the month and flags over-budget", () => {
    const status = computeBudgetStatus(
      budgets,
      [
        tx("Groceries", -120, "2026-06-03"),
        tx("Groceries", -100, "2026-06-20"),
        tx("Dining", -200, "2026-06-10"),
      ],
      "2026-06",
    );
    const groceries = status.find((s) => s.category === "Groceries")!;
    const dining = status.find((s) => s.category === "Dining")!;
    expect(groceries.spent).toBe(220);
    expect(groceries.remaining).toBe(180);
    expect(groceries.over).toBe(false);
    expect(dining.spent).toBe(200);
    expect(dining.over).toBe(true);
  });

  it("ignores income and other months", () => {
    const status = computeBudgetStatus(
      budgets,
      [
        tx("Groceries", 500, "2026-06-01"), // income
        tx("Groceries", -50, "2026-05-30"), // previous month
      ],
      "2026-06",
    );
    expect(status.find((s) => s.category === "Groceries")!.spent).toBe(0);
  });

  it("handles a zero limit without dividing by zero", () => {
    const status = computeBudgetStatus(
      [{ category: "Misc", monthlyLimit: 0 }],
      [tx("Misc", -10, "2026-06-01")],
      "2026-06",
    );
    expect(status[0].pct).toBe(0);
    expect(status[0].over).toBe(true);
  });
});
