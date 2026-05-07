import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  Calendar,
  Shield,
  Home,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calendar as calendarApi } from "@/lib/api";
import {
  useCalendarSync,
  useDisconnectCalendar,
} from "@/hooks/use-calendar-sync";
import { toast } from "@/hooks/use-toast";
import { formatCalendarError } from "@/lib/calendarErrors";

const externalProviders = [
  { id: "google" as const, name: "Google Calendar", icon: "🔵" },
  { id: "outlook" as const, name: "Outlook Calendar", icon: "🟦" },
  { id: "apple" as const, name: "Apple Calendar", icon: "⚪" },
];

export default function StepCalendarConnect({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUserId, members, calendarConnections } = useFamilyStore();
  const familyId = useFamilyStore((s) => s.familyId);

  const { connections: apiConnections, isSyncing } = useCalendarSync(
    familyId || null,
  );
  const disconnectMutation = useDisconnectCalendar();

  const currentUser = members.find((m) => m.id === currentUserId);
  const childMembers = members.filter((m) => m.role === "child");
  const adultMembers = members.filter(
    (m) => m.role === "adult" && m.id !== currentUserId,
  );

  // Surface OAuth result via toast after the popup redirects the parent back.
  useEffect(() => {
    const connected = searchParams.get("calendarConnected");
    const error = searchParams.get("calendarError");
    if (connected) {
      toast({
        title: "Calendar connected",
        description: `Your ${connected} calendar has been connected.`,
      });
      setSearchParams({}, { replace: true });
    }
    if (error) {
      const t = formatCalendarError({
        error,
        description: searchParams.get("calendarErrorDescription"),
        subcode: searchParams.get("calendarErrorSubcode"),
      });
      toast({ ...t, variant: "destructive" });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = (provider: "google" | "outlook" | "apple") => {
    if (!familyId) {
      toast({
        title: "Family not set up yet",
        description: "Please go back and finish adding family members first.",
        variant: "destructive",
      });
      return;
    }
    if (provider === "apple") {
      toast({
        title: "Apple Calendar coming soon",
        description: "Apple Calendar integration isn't available yet.",
      });
      return;
    }

    const url = calendarApi.getAuthUrl(provider, familyId, "/");
    const popup = window.open(url, "calendar-auth", "width=500,height=700");
    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 500);
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  const isConnected = (memberId: string, provider: string) => {
    // Real OAuth connections are tied to the current user's member row in the
    // DB. Show them on the current user's row only.
    if (provider === "homebase") {
      return calendarConnections.some(
        (c) =>
          c.memberId === memberId && c.provider === provider && c.connected,
      );
    }
    if (memberId !== currentUser?.id) return false;
    return (
      apiConnections?.some((c) => c.provider === provider && c.connected) ??
      false
    );
  };

  const getApiConnection = (provider: string) =>
    apiConnections?.find((c) => c.provider === provider);

  const renderProviderList = (memberId: string) => (
    <div className="space-y-1.5">
      {externalProviders.map((p) => {
        const connected = isConnected(memberId, p.id);
        const apiConn =
          memberId === currentUser?.id ? getApiConnection(p.id) : undefined;
        return (
          <div key={p.id} className="space-y-1">
            <button
              onClick={() => handleConnect(p.id)}
              disabled={!familyId}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                connected
                  ? "bg-primary/5 border-primary/25"
                  : "bg-card border-border hover:border-primary/15",
                !familyId && "opacity-50 cursor-not-allowed",
              )}
            >
              <span className="text-sm">{p.icon}</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">
                  {p.name}
                </span>
                {apiConn?.externalEmail && (
                  <p className="text-[11px] text-muted-foreground">
                    {apiConn.externalEmail}
                  </p>
                )}
              </div>
              {connected && apiConn ? (
                <div className="flex items-center gap-1.5">
                  {isSyncing && (
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnect(apiConn.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded"
                    title="Disconnect"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ) : connected ? (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              ) : null}
            </button>
            {apiConn?.syncError && (
              <p className="text-[11px] text-destructive px-2.5">
                Sync error: {apiConn.syncError}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Connect Your Calendars
          </h2>
          <p className="text-sm text-muted-foreground">
            Link your own calendars to share availability
          </p>
        </div>
      </div>

      {/* Current user's calendars */}
      {currentUser && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Your calendars
            </p>
          </div>
          {renderProviderList(currentUser.id)}
        </div>
      )}

      {/* Children — Homebase-managed calendars */}
      {childMembers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Children's calendars
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
            {childMembers.map((child) => {
              const hasHomebase = isConnected(child.id, "homebase");
              return (
                <div key={child.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {child.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <Home className="h-3 w-3" />
                      <span className="font-medium">Homebase calendar</span>
                      {hasHomebase && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Managed through Homebase — no external account needed.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note about other adults */}
      {adultMembers.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              {adultMembers.map((m) => m.name).join(", ")}
            </strong>{" "}
            will connect their own calendars when they accept their invite and
            complete their own setup.
          </p>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <Button onClick={onComplete} className="w-full" size="lg">
          Get Started
        </Button>
        <button
          onClick={onComplete}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}
