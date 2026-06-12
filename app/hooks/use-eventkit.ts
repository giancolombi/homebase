import { useCallback, useEffect, useRef, useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { calendar } from "@/lib/api";
import {
  type EventKitAuthStatus,
  fetchEventKitEvents,
  isEventKitAvailable,
  observeEventKitChanges,
  eventKitAuthorizationStatus,
  requestEventKitAccess,
} from "@/lib/eventkit";
import { errorMessage } from "@/lib/errors";

// EventKit lifecycle hook for the iOS Capacitor build.
//
// On iOS:
//   - On mount, reads the current Calendar permission status.
//   - If already authorized, runs an immediate sync and registers an
//     EKEventStoreChanged observer so subsequent device-side calendar
//     changes flow up to the Homebase API automatically.
//   - Exposes requestAccess() for UI surfaces that need to prompt.
//   - Exposes resync() so the user can force a refresh.
//
// On every other platform: returns inert state (`status: "unavailable"`)
// and no-op actions, so consumers can render without any platform check
// at the call site.

export interface UseEventKitResult {
  available: boolean;
  status: EventKitAuthStatus;
  syncing: boolean;
  lastEventCount: number | null;
  lastSyncedAt: number | null;
  error: string | null;
  requestAccess: () => Promise<void>;
  resync: () => Promise<void>;
}

const PAST_DAYS = 30;
const FUTURE_DAYS = 60;

function isAuthorized(status: EventKitAuthStatus): boolean {
  return status === "authorized" || status === "fullAccess";
}

export function useEventKit(): UseEventKitResult {
  const familyId = useFamilyStore((s) => s.familyId);
  const [available] = useState(() => isEventKitAvailable());
  const [status, setStatus] = useState<EventKitAuthStatus>(
    available ? "notDetermined" : "unavailable",
  );
  const [syncing, setSyncing] = useState(false);
  const [lastEventCount, setLastEventCount] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const syncQueued = useRef(false);

  const performSync = useCallback(async (currentFamilyId: string) => {
    // EKEventStoreChanged fires in bursts. Overlapping replace-style POSTs
    // can apply out of order on the server, so coalesce: one request in
    // flight, at most one trailing re-run.
    if (syncInFlight.current) {
      syncQueued.current = true;
      return;
    }
    syncInFlight.current = true;
    setSyncing(true);
    try {
      do {
        syncQueued.current = false;
        setError(null);
        try {
          const now = Date.now();
          const timeMin = new Date(now - PAST_DAYS * 24 * 60 * 60 * 1000);
          const timeMax = new Date(now + FUTURE_DAYS * 24 * 60 * 60 * 1000);
          const ekEvents = await fetchEventKitEvents(timeMin, timeMax);

          const payload = ekEvents.map((e) => ({
            externalId: e.externalId,
            title: e.title,
            description: e.description,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
            location: e.location,
            sourceTitle: e.sourceTitle,
          }));

          const res = await calendar.syncEventKit(currentFamilyId, payload);
          setLastEventCount(res.count);
          setLastSyncedAt(Date.now());
        } catch (err) {
          setError(errorMessage(err, "EventKit sync failed"));
        }
      } while (syncQueued.current);
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, []);

  // Read initial authorization status once.
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    eventKitAuthorizationStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [available]);

  // When authorized + we have a familyId, run an initial sync and start
  // observing on-device calendar changes.
  useEffect(() => {
    if (!available || !familyId || !isAuthorized(status)) return;

    // Each effect run owns its disposer locally — a shared ref would let a
    // slow-resolving observer from a previous run clobber the current one,
    // leaking the native listener.
    let disposed = false;
    let off: (() => void) | null = null;
    performSync(familyId);

    observeEventKitChanges(() => {
      if (!disposed) performSync(familyId);
    }).then((dispose) => {
      if (disposed) {
        dispose();
      } else {
        off = dispose;
      }
    });

    return () => {
      disposed = true;
      off?.();
      off = null;
    };
  }, [available, familyId, status, performSync]);

  const requestAccess = useCallback(async () => {
    if (!available) return;
    setError(null);
    try {
      const granted = await requestEventKitAccess();
      const next = await eventKitAuthorizationStatus();
      setStatus(next);
      if (!granted) {
        setError(
          "Calendar permission was not granted. You can change this in iOS Settings → Privacy → Calendars → Homebase.",
        );
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't request Calendar access"));
    }
  }, [available]);

  const resync = useCallback(async () => {
    if (!available || !familyId || !isAuthorized(status)) return;
    await performSync(familyId);
  }, [available, familyId, status, performSync]);

  return {
    available,
    status,
    syncing,
    lastEventCount,
    lastSyncedAt,
    error,
    requestAccess,
    resync,
  };
}
