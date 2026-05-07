import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { auth, invite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Home, Loader2, AlertTriangle } from "lucide-react";

interface InviteInfo {
  email: string;
  familyName: string;
  memberName: string;
  hasExistingAccount?: boolean;
  currentFamily?: string | null;
  isOwnerOfCurrentFamily?: boolean;
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(!!token);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "No invite token provided",
  );
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token) return;

    invite
      .verify(token)
      .then((info) => {
        setInviteInfo(info);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invite");
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInfo || !token) return;

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let userId: string;

      if (inviteInfo.hasExistingAccount) {
        // Existing user — sign in
        const { user } = await auth.signIn(inviteInfo.email, password);
        userId = user.id;
      } else {
        // New user — create account
        const { user } = await auth.signUp(
          inviteInfo.email,
          password,
          inviteInfo.memberName,
        );
        userId = user.id;
      }

      // Accept the invite — handles family switching on the backend
      await invite.accept(token, userId);

      // Reload to get fresh auth state with new familyId
      window.location.href = "/";
    } catch (err) {
      // If signup says "already exists", try signing in
      if (err.message?.includes("already exists")) {
        try {
          const { user } = await auth.signIn(inviteInfo.email, password);
          await invite.accept(token, user.id);
          window.location.href = "/";
          return;
        } catch (signInErr) {
          toast({
            title: "Could not accept invite",
            description: signInErr.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Could not accept invite",
          description: err.message,
          variant: "destructive",
        });
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Home className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Invite Not Valid
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Go to Homebase
          </Button>
        </div>
      </div>
    );
  }

  // Owner of another family — cannot join
  if (inviteInfo?.isOwnerOfCurrentFamily) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Cannot Join Family
          </h1>
          <p className="text-sm text-muted-foreground">
            You are the owner of <strong>{inviteInfo.currentFamily}</strong>.
            Transfer ownership or delete your family before joining another.
          </p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Go to Homebase
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Home className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            You're Invited!
          </h1>
          <p className="text-sm text-muted-foreground">
            Join <strong>{inviteInfo?.familyName}</strong> on Homebase
          </p>
        </div>

        {/* Warning if user already has a family */}
        {inviteInfo?.currentFamily && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">
              You currently belong to{" "}
              <strong>{inviteInfo.currentFamily}</strong>. Joining{" "}
              <strong>{inviteInfo.familyName}</strong> will remove you from your
              current family.
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {inviteInfo?.hasExistingAccount
                ? "Sign In to Join"
                : "Create Your Account"}
            </CardTitle>
            <CardDescription>
              {inviteInfo?.hasExistingAccount ? "Sign in" : "Sign up"} as{" "}
              <strong>{inviteInfo?.memberName}</strong> ({inviteInfo?.email})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteInfo?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Joining..."
                  : inviteInfo?.currentFamily
                    ? "Switch Family & Join"
                    : "Accept & Join Family"}
              </Button>
              {inviteInfo?.currentFamily && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => (window.location.href = "/")}
                >
                  Stay in my current family
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
