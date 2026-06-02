import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { generateId } from "@/lib/memberColors";
import { toast } from "@/hooks/use-toast";

export function AddTransactionDialog() {
  const { bankAccounts, addTransaction } = useFamilyStore();
  const [open, setOpen] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");

  const reset = () => {
    setDescription("");
    setAmount("");
    setCategory("");
    setType("expense");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleSave = () => {
    const acct = accountId || bankAccounts[0]?.id;
    const value = parseFloat(amount);
    if (!acct || !description.trim() || isNaN(value)) {
      toast({
        title: "Missing details",
        description: "Pick an account and enter a description and amount.",
        variant: "destructive",
      });
      return;
    }
    // Expenses are stored as negative amounts (matches Plaid's convention).
    const signed = type === "expense" ? -Math.abs(value) : Math.abs(value);
    addTransaction({
      id: generateId(),
      accountId: acct,
      description: description.trim(),
      amount: signed,
      date,
      category: category.trim() || "Uncategorized",
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={bankAccounts.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" /> Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription className="sr-only">
            Manually record a transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select
              value={accountId || bankAccounts[0]?.id || ""}
              onValueChange={setAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Groceries at Whole Foods"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "expense" | "income")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Groceries"
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Add Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
