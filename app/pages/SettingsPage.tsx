import { useEffect, useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MEMBER_COLORS, getMemberInitials } from "@/lib/memberColors";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  LogOut,
  Users,
  Calendar,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Check,
  Home,
  RefreshCw,
  Loader2,
  ExternalLink,
  X,
  Moon,
  Sun,
  Download,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AddMemberDialog } from "@/components/settings/AddMemberDialog";
import { EditProfileDialog } from "@/components/settings/EditProfileDialog";
import { AppleConnectDialog } from "@/components/settings/AppleConnectDialog";
import EventKitConnectCard from "@/components/calendar/EventKitConnectCard";
import { isCapacitorIOS } from "@/lib/platform";
import { calendar, invite, auth } from "@/lib/api";
import { openOAuth } from "@/lib/oauthBrowser";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCalendarSync,
  useDisconnectCalendar,
} from "@/hooks/use-calendar-sync";
import { useFamilyMembers, useToggleAdmin } from "@/hooks/use-family-members";
import { toast } from "@/hooks/use-toast";
import { formatCalendarError } from "@/lib/calendarErrors";

const providers = [
  { id: "google" as const, name: "Google", icon: "🔵" },
  { id: "outlook" as const, name: "Outlook", icon: "🟦" },
  { id: "apple" as const, name: "Apple", icon: "⚪" },
];

// EventKit covers iCloud on iOS — hide the Apple CalDAV tile there.
function visibleProviders() {
  return isCapacitorIOS()
    ? providers.filter((p) => p.id !== "apple")
    : providers;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    try {
      const data = await auth.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "homebase-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Permanently delete your account? If you own this family, all of its data will be deleted for everyone. This cannot be undone.",
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await auth.deleteAccount();
      await signOut();
      navigate("/");
    } catch (err) {
      toast({
        title: "Couldn't delete account",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };
  const {
    familyName,
    members,
    currentUserId,
    calendarConnections,
    removeMember,
  } = useFamilyStore();

  const familyId = useFamilyStore((s) => s.familyId);

  // Calendar sync
  const {
    connections: apiConnections,
    isSyncing,
    syncConnection,
  } = useCalendarSync(familyId || null);
  const disconnectMutation = useDisconnectCalendar();

  // Fetch real member data from API (includes isAdmin, inviteStatus, etc.)
  const { data: apiMembers } = useFamilyMembers(familyId);
  const toggleAdminMutation = useToggleAdmin();

  // Helper to get API member data by email (since local IDs don't match DB IDs)
  const getApiMember = (email?: string) =>
    apiMembers?.find((m) => m.email === email);

  // Handle OAuth redirect params
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

  const currentUser = members.find((m) => m.id === currentUserId);
  const childMembers = members.filter((m) => m.role === "child");
  const otherAdults = members.filter(
    (m) => m.role === "adult" && m.id !== currentUserId,
  );

  const [appleDialogOpen, setAppleDialogOpen] = useState(false);

  const handleConnect = (provider: "google" | "outlook" | "apple") => {
    if (!familyId) return;
    if (provider === "apple") {
      setAppleDialogOpen(true);
      return;
    }

    const url = calendar.getAuthUrl(provider, familyId);
    openOAuth({
      url,
      onClose: () => window.location.reload(),
    });
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  const isConnected = (memberId: string, provider: string) =>
    apiConnections?.some(
      (c) => c.memberId === memberId && c.provider === provider && c.connected,
    ) ?? false;

  const getApiConnection = (memberId: string, provider: string) =>
    apiConnections?.find(
      (c) => c.memberId === memberId && c.provider === provider,
    );

  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  const handleSendInvite = async (
    memberEmail: string,
    localMemberId: string,
  ) => {
    if (!familyId) return;
    setSendingInvite(localMemberId);
    try {
      const result = await invite.send(memberEmail, familyId);
      toast({
        title: "Invite sent!",
        description: result.email
          ? `Email sent to ${result.email}`
          : result.message,
      });
    } catch (err) {
      toast({
        title: "Failed to send invite",
        description: err.message,
        variant: "destructive",
      });
    }
    setSendingInvite(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppleConnectDialog
        familyId={familyId ?? null}
        open={appleDialogOpen}
        onOpenChange={setAppleDialogOpen}
      />
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 bg-card/95 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
          Settings
        </h1>
      </header>

      <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto w-full">
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
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback
                      className={cn(
                        "text-xs font-bold text-primary-foreground",
                        MEMBER_COLORS[currentUser.colorIndex],
                      )}
                    >
                      {getMemberInitials(currentUser.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      You
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admin{currentUser.email ? ` · ${currentUser.email}` : ""}
                  </p>
                </div>
                <EditProfileDialog />
              </div>
            )}

            {/* Other adults */}
            {otherAdults.map((m) => {
              const apiMember = getApiMember(m.email);
              const memberIsAdmin = apiMember?.isAdmin ?? false;
              const memberInviteStatus =
                apiMember?.inviteStatus ?? m.inviteStatus;

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-bold text-primary-foreground",
                        MEMBER_COLORS[m.colorIndex],
                      )}
                    >
                      {getMemberInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">
                        {m.name}
                      </p>
                      {memberIsAdmin && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 gap-0.5"
                        >
                          <ShieldCheck className="h-2.5 w-2.5" /> Admin
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 gap-0.5"
                      >
                        <Mail className="h-2.5 w-2.5" />{" "}
                        {memberInviteStatus === "accepted"
                          ? "Joined"
                          : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adult{m.email ? ` · ${m.email}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Admin toggle */}
                    {apiMember && (
                      <Button
                        variant={memberIsAdmin ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "text-xs h-7 px-2.5 gap-1",
                          memberIsAdmin && "bg-primary/10 text-primary",
                        )}
                        onClick={() =>
                          toggleAdminMutation.mutate(apiMember.id, {
                            onError: (err: Error) => {
                              toast({
                                title: "Cannot remove admin",
                                description: err.message,
                                variant: "destructive",
                              });
                            },
                          })
                        }
                      >
                        {memberIsAdmin && <Check className="h-3 w-3" />}
                        Admin
                      </Button>
                    )}
                    {/* Send invite */}
                    {m.email && memberInviteStatus !== "accepted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        disabled={sendingInvite === m.id}
                        onClick={() => handleSendInvite(m.email!, m.id)}
                      >
                        {sendingInvite === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Mail className="h-3 w-3 mr-1" />
                        )}
                        Send Invite
                      </Button>
                    )}
                    {/* Delete member */}
                    <button
                      onClick={() => removeMember(m.id)}
                      className="p-1 hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Children */}
            {childMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-bold text-primary-foreground",
                      MEMBER_COLORS[m.colorIndex],
                    )}
                  >
                    {getMemberInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      {m.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 gap-0.5"
                    >
                      <Shield className="h-2.5 w-2.5" /> Managed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Child</p>
                </div>
                <button
                  onClick={() => removeMember(m.id)}
                  className="p-1 hover:bg-destructive/10 rounded-lg"
                >
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
              <Calendar className="h-4 w-4 text-muted-foreground" /> Your
              Calendars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <EventKitConnectCard />
            {currentUser &&
              visibleProviders().map((p) => {
                const connected = isConnected(currentUser.id, p.id);
                const apiConn = getApiConnection(currentUser.id, p.id);
                const paused = !!apiConn?.pausedAt;
                return (
                  <div key={p.id} className="space-y-1">
                    <button
                      onClick={() =>
                        paused
                          ? undefined
                          : connected && apiConn
                            ? undefined
                            : handleConnect(p.id)
                      }
                      disabled={paused}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                        connected
                          ? "bg-primary/5 border-primary/20"
                          : paused
                            ? "bg-muted/30 border-border/60 opacity-70"
                            : "bg-card border-border hover:border-primary/15",
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
                        {paused && (
                          <p className="text-[11px] text-muted-foreground">
                            Paused — your iPhone Calendar is providing this
                          </p>
                        )}
                      </div>
                      {connected && apiConn && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              syncConnection(apiConn.id);
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Sync now"
                          >
                            {isSyncing ? (
                              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
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
                      )}
                      {connected && !apiConn && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {!connected && (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    {apiConn?.syncError && (
                      <p className="text-[11px] text-destructive px-2.5">
                        Sync error: {apiConn.syncError}
                      </p>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Managed children's calendars */}
        {childMembers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Children's
                Calendars
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Managed through Homebase — no external account needed
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {childMembers.map((child) => {
                const hasHomebase = calendarConnections.some(
                  (c) =>
                    c.memberId === child.id &&
                    c.provider === "homebase" &&
                    c.connected,
                );
                return (
                  <div key={child.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">
                        {child.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <Home className="h-3 w-3" />
                        <span className="font-medium">Homebase calendar</span>
                        {hasHomebase && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Events are managed by you directly in Homebase. Optionally
                      link an external calendar:
                    </p>
                    {visibleProviders().map((p) => {
                      const connected = isConnected(child.id, p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleConnect(p.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
                            connected
                              ? "bg-primary/5 border-primary/20"
                              : "bg-card border-border hover:border-primary/15",
                          )}
                        >
                          <span className="text-xs">{p.icon}</span>
                          <span className="flex-1 text-xs font-medium text-foreground">
                            {p.name}
                          </span>
                          {connected && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
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
              <strong className="text-foreground">
                {otherAdults.map((m) => m.name).join(", ")}
              </strong>{" "}
              will manage their own calendar connections after accepting their
              invite.
            </p>
          </div>
        )}

        {/* Preferences & account */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preferences & Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Dark mode</span>
              <Button
                size="sm"
                variant="outline"
                aria-label="Toggle dark mode"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-1" /> Light
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-1" /> Dark
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Export my data (JSON)
              </span>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-destructive">Delete account</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={handleDeleteAccount}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={() => {
              signOut();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
