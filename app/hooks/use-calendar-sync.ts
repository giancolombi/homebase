import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendar } from "@/lib/api";
import { useEffect } from "react";

const STALE_MINUTES = 15;

// A connection whose sync keeps failing never advances lastSyncedAt, so
// without an attempt log every connections refetch (window focus, any
// invalidation) would re-fire a doomed sync POST. Module-level so multiple
// mounted consumers share it instead of double-syncing.
const lastAttemptAt = new Map<string, number>();

export function useCalendarConnections(familyId: string | null) {
  return useQuery({
    queryKey: ["calendar-connections", familyId],
    queryFn: () => calendar.getConnections(familyId!),
    enabled: !!familyId,
  });
}

export function useCalendarSync(familyId: string | null) {
  const queryClient = useQueryClient();
  const { data: connections } = useCalendarConnections(familyId);

  const syncMutation = useMutation({
    mutationFn: (connectionId: string) => calendar.syncConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-events"],
      });
      queryClient.invalidateQueries({
        queryKey: ["calendar-connections"],
      });
    },
  });

  // Auto-sync stale connections on mount
  useEffect(() => {
    if (!connections) return;

    const now = Date.now();
    const staleThreshold = now - STALE_MINUTES * 60 * 1000;

    for (const conn of connections) {
      // Only sync real OAuth connections (not demo mode toggles)
      if (
        !conn.connected ||
        conn.provider === "homebase" ||
        !conn.externalEmail
      )
        continue;

      const lastSynced = conn.lastSyncedAt
        ? new Date(conn.lastSyncedAt).getTime()
        : 0;
      if (lastSynced >= staleThreshold) continue;

      // Rate-limit attempts per connection so persistently failing syncs
      // retry on the stale interval instead of on every refetch.
      const attempted = lastAttemptAt.get(conn.id) ?? 0;
      if (now - attempted < STALE_MINUTES * 60 * 1000) continue;
      lastAttemptAt.set(conn.id, now);

      syncMutation.mutate(conn.id);
    }
  }, [connections]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connections,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
    syncConnection: syncMutation.mutate,
  };
}

export function useCalendarEvents(
  familyId: string | null,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["calendar-events", familyId, startDate, endDate],
    queryFn: () => calendar.getEvents(familyId!, startDate, endDate),
    enabled: !!familyId,
    staleTime: STALE_MINUTES * 60 * 1000,
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      calendar.deleteConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-connections"],
      });
      queryClient.invalidateQueries({
        queryKey: ["calendar-events"],
      });
    },
  });
}
