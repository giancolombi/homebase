import { useFamilyStore } from "@/store/familyStore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MEMBER_COLORS, getMemberInitials, generateId } from "@/lib/memberColors";
import { cn } from "@/lib/utils";
import { ArrowLeft, RotateCcw, Users, Calendar, Trash2, Shield, Mail, Check, Plus, Home } from "lucide-react";
import { AddMemberDialog } from "@/components/settings/AddMemberDialog";
import { EditProfileDialog } from "@/components/settings/EditProfileDialog";

const providers = [
  { id: "google" as const, name: "Google", icon: "🔵" },
  { id: "outlook" as const, name: "Outlook", icon: "🟦" },
  { id: "apple" as const, name: "Apple", icon: "⚪" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    familyName, members, currentUserId, calendarConnections,
    resetOnboarding, removeMember, toggleCalendarConnection,
    addCalendarConnection,
  } = useFamilyStore();

  const currentUser = members.find((m) => m.id === currentUserId);
  const childMembers = members.filter((m) => m.role === "child");
  const otherAdults = members.filter((m) => m.role === "adult" && m.id !== currentUserId);

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
    calendarConnections.some((c) => c.memberId === memberId && c.provider === provider && c.connected);

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-sm border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-foreground">Settings</h1>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* Family members */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> {familyName}
              </CardTitle>
              <AddMemberDialog />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Current user */}
            {currentUser && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                <Avatar className="h-8 w-8">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className={cn("text-xs font-bold text-primary-foreground", MEMBER_COLORS[currentUser.colorIndex])}>
                      {getMemberInitials(currentUser.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Admin{currentUser.email ? ` · ${currentUser.email}` : ""}</p>
                </div>
                <EditProfileDialog />
              </div>
            )}

            {/* Other adults */}
            {otherAdults.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn("text-xs font-bold text-primary-foreground", MEMBER_COLORS[m.colorIndex])}>
                    {getMemberInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Mail className="h-2.5 w-2.5" /> Invited
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Adult{m.email ? ` · ${m.email}` : ""}</p>
                </div>
                <button onClick={() => removeMember(m.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}

            {/* Children */}
            {childMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn("text-xs font-bold text-primary-foreground", MEMBER_COLORS[m.colorIndex])}>
                    {getMemberInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> Managed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Child</p>
                </div>
                <button onClick={() => removeMember(m.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Your calendars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Your Calendars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {currentUser && providers.map((p) => {
              const connected = isConnected(currentUser.id, p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleConnect(currentUser.id, p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                    connected ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:border-primary/15"
                  )}
                >
                  <span className="text-sm">{p.icon}</span>
                  <span className="flex-1 text-sm font-medium text-foreground">{p.name}</span>
                  {connected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Managed children's calendars */}
        {childMembers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Children's Calendars
              </CardTitle>
              <p className="text-xs text-muted-foreground">Managed through Homebase — no external account needed</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {childMembers.map((child) => {
                const hasHomebase = calendarConnections.some(
                  (c) => c.memberId === child.id && c.provider === "homebase" && c.connected
                );
                return (
                  <div key={child.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">{child.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <Home className="h-3 w-3" />
                        <span className="font-medium">Homebase calendar</span>
                        {hasHomebase && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Events are managed by you directly in Homebase. Optionally link an external calendar:
                    </p>
                    {providers.map((p) => {
                      const connected = isConnected(child.id, p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleConnect(child.id, p.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
                            connected ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:border-primary/15"
                          )}
                        >
                          <span className="text-xs">{p.icon}</span>
                          <span className="flex-1 text-xs font-medium text-foreground">{p.name}</span>
                          {connected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Other adults note */}
        {otherAdults.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{otherAdults.map((m) => m.name).join(", ")}</strong>
              {" "}will manage their own calendar connections after accepting their invite.
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button variant="destructive" className="w-full" size="sm" onClick={() => { resetOnboarding(); navigate("/"); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Homebase
          </Button>
        </div>
      </div>
    </div>
  );
}
