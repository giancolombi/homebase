import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
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
import { Card } from "@/components/ui/card";
import { useFamilyStore } from "@/store/familyStore";
import { generateId } from "@/lib/memberColors";
import {
  Building2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import type { BankAccount } from "@/types/family";
import { plaid, type PlaidItemResponse } from "@/lib/api";
import { pullAllData } from "@/lib/sync";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export function ManageBankAccountsDialog() {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [plaidItems, setPlaidItems] = useState<PlaidItemResponse[]>([]);
  const {
    bankAccounts,
    addBankAccount,
    removeBankAccount,
    updateBankAccount,
    familyId,
  } = useFamilyStore();

  const refreshPlaidItems = useCallback(async () => {
    if (!familyId) return;
    try {
      const items = await plaid.listItems(familyId);
      setPlaidItems(items);
    } catch (err) {
      console.warn("Failed to load linked banks:", err);
    }
  }, [familyId]);

  useEffect(() => {
    if (open) refreshPlaidItems();
  }, [open, refreshPlaidItems]);

  // Request a Plaid link_token when the dialog opens (tokens are short-lived,
  // ~30min, so we lazy-fetch on demand rather than on every mount).
  const requestLinkToken = useCallback(async () => {
    if (!familyId) {
      toast({
        title: "Finish onboarding first",
        description: "You need a family before linking a bank.",
        variant: "destructive",
      });
      return;
    }
    try {
      setLinking(true);
      const { linkToken } = await plaid.createLinkToken(familyId);
      setLinkToken(linkToken);
    } catch (err) {
      toast({
        title: "Could not start bank link",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  }, [familyId]);

  const onLinkSuccess = useCallback(
    async (
      publicToken: string,
      metadata: {
        institution?: { institution_id: string; name: string } | null;
      },
    ) => {
      if (!familyId) return;
      try {
        await plaid.exchange(
          familyId,
          publicToken,
          metadata.institution
            ? {
                institution_id: metadata.institution.institution_id,
                name: metadata.institution.name,
              }
            : undefined,
        );
        toast({
          title: "Bank connected",
          description: metadata.institution?.name
            ? `Pulled accounts from ${metadata.institution.name}.`
            : "Accounts and transactions synced.",
        });
        // Refresh local store from backend
        await pullAllData(familyId, (patch) => useFamilyStore.setState(patch));
        await refreshPlaidItems();
      } catch (err) {
        toast({
          title: "Bank link failed",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setLinkToken(null);
      }
    },
    [familyId, refreshPlaidItems],
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onLinkSuccess,
    onExit: () => setLinkToken(null),
  });

  // Auto-open Plaid Link as soon as the token is ready
  useEffect(() => {
    if (linkToken && plaidReady) openPlaid();
  }, [linkToken, plaidReady, openPlaid]);

  const handleSync = async (itemId: string) => {
    if (!familyId) return;
    try {
      setSyncingItemId(itemId);
      const result = await plaid.sync(familyId, itemId);
      toast({
        title: "Synced",
        description: `+${result.added} / ~${result.modified} / −${result.removed} transactions`,
      });
      await pullAllData(familyId, (patch) => useFamilyStore.setState(patch));
      await refreshPlaidItems();
    } catch (err) {
      toast({
        title: "Sync failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSyncingItemId(null);
    }
  };

  const handleUnlink = async (itemId: string) => {
    if (!familyId) return;
    try {
      await plaid.removeItem(familyId, itemId);
      toast({ title: "Bank unlinked" });
      await pullAllData(familyId, (patch) => useFamilyStore.setState(patch));
      await refreshPlaidItems();
    } catch (err) {
      toast({
        title: "Unlink failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

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
          <DialogDescription className="sr-only">
            Manage your connected bank accounts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {/* Plaid linked banks */}
          {plaidItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Linked banks
              </p>
              {plaidItems.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.institutionName ?? "Bank"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.lastSyncedAt
                          ? `Synced ${formatDistanceToNow(new Date(item.lastSyncedAt), { addSuffix: true })}`
                          : "Not synced yet"}
                      </p>
                      {item.syncError && (
                        <p className="text-xs text-destructive truncate">
                          {item.syncError}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleSync(item.id)}
                        disabled={syncingItemId === item.id}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                        title="Sync transactions"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${syncingItemId === item.id ? "animate-spin" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => handleUnlink(item.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Unlink bank"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Button
            variant="default"
            className="w-full"
            onClick={requestLinkToken}
            disabled={linking || !!linkToken}
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            {linking
              ? "Preparing…"
              : linkToken
                ? "Opening Plaid…"
                : plaidItems.length > 0
                  ? "Connect another bank"
                  : "Connect a bank"}
          </Button>

          {bankAccounts.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase pt-2">
              Accounts
            </p>
          )}
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
