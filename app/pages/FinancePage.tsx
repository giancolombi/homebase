import { useMemo, useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ManageBankAccountsDialog } from "@/components/finance/ManageBankAccountsDialog";

const PIE_COLORS = [
  "hsl(25, 95%, 53%)",
  "hsl(173, 58%, 39%)",
  "hsl(262, 52%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 93%, 47%)",
  "hsl(199, 89%, 48%)",
  "hsl(0, 84%, 60%)",
  "hsl(150, 60%, 40%)",
];

export default function FinancePage() {
  const { bankAccounts, transactions, updateBankAccount, updateTransaction } =
    useFamilyStore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState("");

  const featured = bankAccounts.filter((a) => a.isFeatured);
  const others = bankAccounts.filter((a) => !a.isFeatured);

  const expensesByCategory = useMemo(() => {
    const map: Record<
      string,
      { total: number; transactions: typeof transactions }
    > = {};
    for (const t of transactions.filter((t) => t.amount < 0)) {
      if (!map[t.category]) map[t.category] = { total: 0, transactions: [] };
      map[t.category].total += Math.abs(t.amount);
      map[t.category].transactions.push(t);
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [transactions]);

  const pieData = expensesByCategory.map(([name, data]) => ({
    name,
    value: data.total,
  }));

  const handleSetGoal = (accountId: string) => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      updateBankAccount(accountId, { savingsGoal: val });
    }
    setEditingGoal(null);
    setGoalInput("");
  };

  const getMonthsToGoal = (account: (typeof bankAccounts)[0]) => {
    if (!account.savingsGoal) return null;
    const balances = account.monthlyBalances;
    if (balances.length < 2) return null;
    const avgGrowth =
      (balances[balances.length - 1].balance - balances[0].balance) /
      (balances.length - 1);
    if (avgGrowth <= 0) return Infinity;
    return Math.ceil((account.savingsGoal - account.balance) / avgGrowth);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 md:px-6 md:py-4 bg-card border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Finance
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Monthly cashflow overview
            </p>
          </div>
          <ManageBankAccountsDialog />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
        {/* Featured accounts */}
        {featured.map((account) => {
          const balances = account.monthlyBalances;
          const lastTwo = balances.slice(-2);
          const delta =
            lastTwo.length === 2 ? lastTwo[1].balance - lastTwo[0].balance : 0;
          const isPositive = delta >= 0;
          const monthsToGoal = getMonthsToGoal(account);

          return (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {account.institution}
                    </p>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Delta */}
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-semibold",
                    isPositive ? "text-accent" : "text-destructive",
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  This month: {isPositive ? "+" : ""}$
                  {Math.abs(delta).toLocaleString()}
                </div>

                {/* Chart */}
                <div className="h-32 md:h-48">
                  <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                    <LineChart data={balances}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.split("-")[1]}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString()}`
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="hsl(25, 95%, 53%)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Savings goal */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    {account.savingsGoal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Goal: ${account.savingsGoal.toLocaleString()}
                          {monthsToGoal !== null &&
                            monthsToGoal !== Infinity && (
                              <span className="font-semibold text-foreground ml-1">
                                ~{monthsToGoal} months away
                              </span>
                            )}
                        </p>
                        <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.min((account.balance / account.savingsGoal) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : editingGoal === account.id ? (
                      <div className="flex gap-1 flex-1">
                        <Input
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          placeholder="Target $"
                          className="h-7 text-xs"
                          type="number"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSetGoal(account.id)}
                        >
                          Set
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingGoal(account.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Set savings goal
                      </button>
                    )}
                  </div>

                  {/* Months to goal chart */}
                  {account.savingsGoal &&
                    monthsToGoal &&
                    monthsToGoal !== Infinity && (
                      <div className="h-24 md:h-36">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minHeight={1}
                        >
                          <LineChart
                            data={Array.from(
                              { length: monthsToGoal + 1 },
                              (_, i) => ({
                                month: i,
                                projected: Math.min(
                                  account.balance +
                                    ((account.savingsGoal! - account.balance) /
                                      monthsToGoal) *
                                      i,
                                  account.savingsGoal!,
                                ),
                              }),
                            )}
                          >
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 9 }}
                              label={{
                                value: "months",
                                position: "bottom",
                                fontSize: 9,
                                offset: -5,
                              }}
                            />
                            <YAxis
                              tick={{ fontSize: 9 }}
                              tickFormatter={(v) =>
                                `$${(v / 1000).toFixed(0)}k`
                              }
                            />
                            <Line
                              type="monotone"
                              dataKey="projected"
                              stroke="hsl(173, 58%, 39%)"
                              strokeWidth={2}
                              strokeDasharray="4 2"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Other accounts */}
        {others.length > 0 && (
          <div className="space-y-2 md:space-y-3">
            <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase">
              Other Accounts
            </p>
            {others.map((a) => (
              <Card
                key={a.id}
                className="p-3 md:p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {a.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.institution}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  ${a.balance.toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Expense categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={9}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown */}
            <div className="space-y-1">
              {expensesByCategory.map(([cat, data], i) => (
                <div key={cat}>
                  <button
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedCategory(expandedCategory === cat ? null : cat)
                    }
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-xs md:text-sm font-medium text-foreground flex-1 text-left">
                      {cat}
                    </span>
                    <span className="text-xs md:text-sm font-semibold text-foreground">
                      ${data.total.toFixed(2)}
                    </span>
                    {expandedCategory === cat ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  {expandedCategory === cat && (
                    <div className="ml-5 space-y-1 pb-2">
                      {data.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center gap-2 text-xs py-1"
                        >
                          <span className="flex-1 text-muted-foreground">
                            {tx.description}
                          </span>
                          <span className="text-foreground font-medium">
                            ${Math.abs(tx.amount).toFixed(2)}
                          </span>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {tx.date.split("-").slice(1).join("/")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
