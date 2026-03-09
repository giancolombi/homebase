import type { BankAccount, Transaction } from "@/types/family";

export const mockBankAccounts: BankAccount[] = [
  {
    id: "acc-1",
    name: "Joint Checking",
    institution: "Chase",
    balance: 8450.32,
    isFeatured: true,
    savingsGoal: undefined,
    monthlyBalances: [
      { month: "2025-10", balance: 7200 },
      { month: "2025-11", balance: 7800 },
      { month: "2025-12", balance: 8100 },
      { month: "2026-01", balance: 7900 },
      { month: "2026-02", balance: 8200 },
      { month: "2026-03", balance: 8450 },
    ],
  },
  {
    id: "acc-2",
    name: "Emergency Fund",
    institution: "Marcus",
    balance: 15230.0,
    isFeatured: true,
    savingsGoal: 25000,
    monthlyBalances: [
      { month: "2025-10", balance: 12000 },
      { month: "2025-11", balance: 12800 },
      { month: "2025-12", balance: 13500 },
      { month: "2026-01", balance: 14100 },
      { month: "2026-02", balance: 14700 },
      { month: "2026-03", balance: 15230 },
    ],
  },
  {
    id: "acc-3",
    name: "Kids College",
    institution: "Vanguard",
    balance: 42100.0,
    isFeatured: false,
    savingsGoal: 100000,
    monthlyBalances: [
      { month: "2025-10", balance: 39500 },
      { month: "2025-11", balance: 40200 },
      { month: "2025-12", balance: 40800 },
      { month: "2026-01", balance: 41200 },
      { month: "2026-02", balance: 41700 },
      { month: "2026-03", balance: 42100 },
    ],
  },
];

export const mockTransactions: Transaction[] = [
  { id: "tx-1", accountId: "acc-1", description: "Whole Foods", amount: -145.32, date: "2026-03-07", category: "Groceries" },
  { id: "tx-2", accountId: "acc-1", description: "Shell Gas", amount: -52.0, date: "2026-03-06", category: "Transportation" },
  { id: "tx-3", accountId: "acc-1", description: "Netflix", amount: -15.99, date: "2026-03-05", category: "Entertainment" },
  { id: "tx-4", accountId: "acc-1", description: "Salary Deposit", amount: 4200.0, date: "2026-03-01", category: "Income" },
  { id: "tx-5", accountId: "acc-1", description: "Mortgage", amount: -2100.0, date: "2026-03-01", category: "Housing" },
  { id: "tx-6", accountId: "acc-1", description: "Pediatrician", amount: -75.0, date: "2026-03-04", category: "Healthcare" },
  { id: "tx-7", accountId: "acc-1", description: "Target", amount: -89.45, date: "2026-03-03", category: "Shopping" },
  { id: "tx-8", accountId: "acc-1", description: "Electric Bill", amount: -125.0, date: "2026-03-02", category: "Utilities" },
  { id: "tx-9", accountId: "acc-1", description: "Starbucks", amount: -12.50, date: "2026-03-07", category: "Dining" },
  { id: "tx-10", accountId: "acc-1", description: "Amazon", amount: -67.89, date: "2026-03-06", category: "Shopping" },
  { id: "tx-11", accountId: "acc-1", description: "Gym Membership", amount: -49.99, date: "2026-03-01", category: "Health & Fitness" },
  { id: "tx-12", accountId: "acc-1", description: "Daycare", amount: -850.0, date: "2026-03-01", category: "Childcare" },
];
