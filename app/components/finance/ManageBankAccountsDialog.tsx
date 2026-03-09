import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useFamilyStore } from "@/store/familyStore";
import { generateId } from "@/lib/memberColors";
import { Building2, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import type { BankAccount } from "@/types/family";

export function ManageBankAccountsDialog() {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("");
  const { bankAccounts, addBankAccount, removeBankAccount, updateBankAccount } =
    useFamilyStore();

  const handleAdd = () => {
    if (!name.trim() || !institution.trim()) return;

    const parsedBalance = parseFloat(balance) || 0;
    const newAccount: BankAccount = {
      id: generateId(),
      name: name.trim(),
      institution: institution.trim(),
      balance: parsedBalance,
      isFeatured: false,
      monthlyBalances: [
        { month: "2026-01", balance: parsedBalance },
        { month: "2026-02", balance: parsedBalance },
        { month: "2026-03", balance: parsedBalance },
      ],
    };

    addBankAccount(newAccount);
    setName("");
    setInstitution("");
    setBalance("");
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Building2 className="h-4 w-4 mr-1" /> Manage Accounts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bank Account Connections</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {account.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {account.institution}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      updateBankAccount(account.id, {
                        isFeatured: !account.isFeatured,
                      })
                    }
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    title={
                      account.isFeatured
                        ? "Hide from overview"
                        : "Show in overview"
                    }
                  >
                    {account.isFeatured ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => removeBankAccount(account.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {adding ? (
            <Card className="p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="acc-name">Account Name</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Joint Checking"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc-inst">Institution</Label>
                <Input
                  id="acc-inst"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g., Chase Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc-bal">Current Balance</Label>
                <Input
                  id="acc-bal"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={!name.trim() || !institution.trim()}
                >
                  Add
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Bank Account
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
