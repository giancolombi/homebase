import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { calendar } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Loader2 } from "lucide-react";

interface Props {
  familyId: string | null;
  // When `trigger` is given the dialog manages its own open state. When
  // `open`/`onOpenChange` are given the parent controls it (e.g. opening the
  // dialog from a row click in the providers list).
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  defaultAppleId?: string;
}

export function AppleConnectDialog({
  familyId,
  trigger,
  open: controlledOpen,
  onOpenChange,
  defaultAppleId,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
  const [appleId, setAppleId] = useState(defaultAppleId ?? "");
  const [appPassword, setAppPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      toast({
        title: "Finish onboarding first",
        description: "You need a family before linking a calendar.",
        variant: "destructive",
      });
      return;
    }
    if (!appleId.trim() || !appPassword.trim()) return;

    setSubmitting(true);
    try {
      await calendar.connectApple(familyId, appleId.trim(), appPassword.trim());
      toast({
        title: "iCloud Calendar connected",
        description: `Pulling events from ${appleId.trim()}.`,
      });
      // Refetch connections + events so the UI updates immediately.
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setOpen(false);
      setAppPassword("");
    } catch (err) {
      toast({
        title: "Couldn't connect iCloud",
        description: errorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect iCloud Calendar</DialogTitle>
          <DialogDescription>
            Apple doesn't support sign-in with OAuth, so you'll need an
            app-specific password from your Apple ID account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apple-id">Apple ID</Label>
            <Input
              id="apple-id"
              type="email"
              autoComplete="username"
              placeholder="you@icloud.com"
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apple-password">App-specific password</Label>
            <Input
              id="apple-password"
              type="password"
              autoComplete="off"
              placeholder="abcd-efgh-ijkl-mnop"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generate one at{" "}
              <a
                href="https://account.apple.com/account/manage"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                account.apple.com
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              under{" "}
              <strong>Sign-In and Security → App-Specific Passwords</strong>.
              Homebase stores it encrypted and only uses it to read your
              calendar.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Connecting…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
