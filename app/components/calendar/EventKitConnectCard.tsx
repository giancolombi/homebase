import { Button } from "@/components/ui/button";
import { useEventKit } from "@/hooks/use-eventkit";
import { CalendarCheck, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// EventKit "Use my iPhone's Calendar" card. Renders only on iOS Capacitor
// builds — returns null on web/Android so call sites don't need a platform
// check. Displayed at the top of both the onboarding calendar step and the
// Settings → Your Calendars card.

export default function EventKitConnectCard() {
  const ek = useEventKit();

  if (!ek.available) return null;

  const granted = ek.status === "authorized" || ek.status === "fullAccess";
  const denied = ek.status === "denied" || ek.status === "restricted";

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {granted ? "Synced from your iPhone" : "Use my iPhone's Calendar"}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {granted
              ? "Homebase reads the calendars you've already added in iOS Settings — iCloud, Google, Outlook, Exchange, anything else."
              : "Skip OAuth and CalDAV passwords. Homebase reads your iPhone's Calendar app directly with one permission tap."}
          </p>
        </div>
      </div>

      {granted ? (
        <div className="flex items-center gap-2 pt-1">
          <CalendarCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-foreground">
            {ek.lastEventCount !== null
              ? `${ek.lastEventCount} events synced`
              : ek.syncing
                ? "Syncing…"
                : "Ready"}
          </span>
          {ek.lastSyncedAt && (
            <span className="text-[11px] text-muted-foreground">
              · {formatDistanceToNow(ek.lastSyncedAt, { addSuffix: true })}
            </span>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={ek.resync}
            disabled={ek.syncing}
            className="h-7 px-2 text-xs"
          >
            {ek.syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1">Refresh</span>
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={ek.requestAccess}
          disabled={denied}
          className="w-full"
        >
          {denied ? "Enable in iOS Settings" : "Allow Calendar access"}
        </Button>
      )}

      {ek.error && (
        <p className="text-[11px] text-destructive leading-relaxed">
          {ek.error}
        </p>
      )}
    </div>
  );
}
