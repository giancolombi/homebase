import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calendar,
  type CalendarConnectionResponse,
  type CalendarEventResponse,
} from "@/lib/api";
import { useEffect } from "react";

const STALE_MINUTES = 15;

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

    const staleThreshold = Date.now() - STALE_MINUTES * 60 * 1000;

    for (const conn of connections) {
      if (!conn.connected || conn.provider === "homebase") continue;

      const lastSynced = conn.lastSyncedAt
        ? new Date(conn.lastSyncedAt).getTime()
        : 0;

      if (lastSynced < staleThreshold) {
        syncMutation.mutate(conn.id);
      }
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
