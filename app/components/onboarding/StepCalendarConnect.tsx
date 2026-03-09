import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Calendar, Shield, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/memberColors";

const externalProviders = [
  { id: "google" as const, name: "Google Calendar", icon: "🔵" },
  { id: "outlook" as const, name: "Outlook Calendar", icon: "🟦" },
  { id: "apple" as const, name: "Apple Calendar", icon: "⚪" },
];

export default function StepCalendarConnect({
  onComplete,
  onBack,
  saving = false,
}: {
  onComplete: () => void;
  onBack: () => void;
  saving?: boolean;
}) {
  const { currentUserId, members, calendarConnections, addCalendarConnection, toggleCalendarConnection } =
    useFamilyStore();

  const currentUser = members.find((m) => m.id === currentUserId);
  const childMembers = members.filter((m) => m.role === "child");
  const adultMembers = members.filter((m) => m.role === "adult" && m.id !== currentUserId);

  const handleConnect = (memberId: string, provider: "google" | "outlook" | "apple") => {
    const existing = calendarConnections.find(
      (c) => c.memberId === memberId && c.provider === provider
    );
    if (existing) {
      toggleCalendarConnection(existing.id);
    } else {
      addCalendarConnection({
        id: generateId(),
        provider,
        email: `${provider}@example.com`,
        connected: true,
        memberId,
      });
    }
  };

  const isConnected = (memberId: string, provider: string) =>
    calendarConnections.some(
      (c) => c.memberId === memberId && c.provider === provider && c.connected
    );

  const renderProviderList = (memberId: string) => (
    <div className="space-y-1.5">
      {externalProviders.map((p) => {
        const connected = isConnected(memberId, p.id);
        return (
          <button
            key={p.id}
            onClick={() => handleConnect(memberId, p.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
              connected
                ? "bg-primary/5 border-primary/25"
                : "bg-card border-border hover:border-primary/15"
            )}
          >
            <span className="text-sm">{p.icon}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{p.name}</span>
            {connected && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Connect Your Calendars</h2>
          <p className="text-sm text-muted-foreground">Link your own calendars to share availability</p>
        </div>
      </div>

      {/* Current user's calendars */}
      {currentUser && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Your calendars</p>
          </div>
          {renderProviderList(currentUser.id)}
        </div>
      )}

      {/* Children — Homebase-managed calendars */}
      {childMembers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Children's calendars</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
            {childMembers.map((child) => {
              const hasHomebase = isConnected(child.id, "homebase");
              return (
                <div key={child.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{child.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <Home className="h-3 w-3" />
                      <span className="font-medium">Homebase calendar</span>
                      {hasHomebase && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Managed through Homebase. You can also link an external calendar below.
                  </p>
                  {renderProviderList(child.id)}
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
            <strong className="text-foreground">{adultMembers.map((m) => m.name).join(", ")}</strong>
            {" "}will connect their own calendars when they accept their invite and complete their own setup.
          </p>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <Button onClick={onComplete} className="w-full" size="lg" disabled={saving}>
          {saving ? "Setting up..." : "Get Started"}
        </Button>
        {!saving && (
          <button
            onClick={onComplete}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            I'll do this later
          </button>
        )}
      </div>
    </div>
  );
}
