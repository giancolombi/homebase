import { useState, useMemo } from "react";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { useFamilyStore } from "@/store/familyStore";
import { useCalendarEvents, useCalendarSync } from "@/hooks/use-calendar-sync";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MEMBER_COLORS,
  MEMBER_BG_LIGHT,
  MEMBER_BORDER_COLORS,
  getMemberInitials,
} from "@/lib/memberColors";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AddEventDialog from "@/components/calendar/AddEventDialog";
import type { CalendarEvent, FamilyMember } from "@/types/family";

const VISIBLE_START_HOUR = 6;
const VISIBLE_END_HOUR = 22; // exclusive — last slot is 9 PM (21:00–22:00)
const HOURS = Array.from(
  { length: VISIBLE_END_HOUR - VISIBLE_START_HOUR },
  (_, i) => i + VISIBLE_START_HOUR,
);

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isAllDayEvent(event: CalendarEvent): boolean {
  if (event.allDay) return true;
  // Defensive: providers sometimes send 00:00–23:59 without an allDay flag
  return event.startTime === "00:00" && event.endTime === "23:59";
}

interface TimedLayout {
  top: number;
  height: number;
  startsBeforeWindow: boolean;
  endsAfterWindow: boolean;
}

function getTimedLayout(event: CalendarEvent, slotHeight: number): TimedLayout {
  const startMin = parseTimeToMinutes(event.startTime);
  let endMin = parseTimeToMinutes(event.endTime);

  // Midnight-spanning: end-of-day clip so the event still renders meaningfully
  if (endMin <= startMin) endMin = 24 * 60 - 1;

  const windowStart = VISIBLE_START_HOUR * 60;
  const windowEnd = VISIBLE_END_HOUR * 60;

  const startsBeforeWindow = startMin < windowStart;
  const endsAfterWindow = endMin > windowEnd;

  const clampedStart = Math.max(startMin, windowStart);
  const clampedEnd = Math.min(endMin, windowEnd);

  const top = ((clampedStart - windowStart) / 60) * slotHeight;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * slotHeight, 24);

  return { top, height, startsBeforeWindow, endsAfterWindow };
}

export default function CalendarPage() {
  const { members, events, tasks } = useFamilyStore();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const slotHeight = isMobile ? 64 : 80; // matches h-16 / md:h-20
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const familyId = useFamilyStore((s) => s.familyId);
  const isDemo = !user || user.id === "demo-user";

  // Date range for API query
  const rangeStart = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const rangeEnd = format(
    addDays(endOfWeek(selectedDate, { weekStartsOn: 1 }), 7),
    "yyyy-MM-dd",
  );

  // Sync external calendars
  useCalendarSync(!isDemo ? familyId || null : null);

  // Fetch external events from API
  const { data: apiEvents } = useCalendarEvents(
    !isDemo ? familyId || null : null,
    rangeStart,
    rangeEnd,
  );

  // Merge task deadlines and external events as calendar events
  const allEvents = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks
      .filter((t) => t.deadline && t.status !== "done")
      .map((t) => ({
        id: `task-${t.id}`,
        title: `📋 ${t.title}`,
        date: t.deadline!,
        startTime: t.deadlineTime || "09:00",
        endTime: t.deadlineTime
          ? format(
              new Date(`2000-01-01T${t.deadlineTime}`).getTime() + 3600000,
              "HH:mm",
            )
          : "10:00",
        memberId: t.assignedTo[0] || "",
        recurrence: "none" as const,
        isTask: true,
        taskId: t.id,
      }));

    // External events from API
    const externalEvents: CalendarEvent[] = (apiEvents || []).map((e) => ({
      id: e.id,
      title:
        e.source !== "homebase"
          ? `${e.source === "google" ? "📅" : "📆"} ${e.title}`
          : e.title,
      description: e.description || undefined,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      memberId: e.memberId,
      recurrence: e.recurrence as CalendarEvent["recurrence"],
      source: e.source,
      allDay: e.allDay,
      location: e.location || undefined,
    }));

    return [...events, ...taskEvents, ...externalEvents];
  }, [events, tasks, apiEvents]);

  const dayEvents = (date: Date) =>
    allEvents.filter((e) => isSameDay(parseISO(e.date), date));

  const getMemberColor = (memberId: string) => {
    const m = members.find((m) => m.id === memberId);
    return m?.colorIndex || 1;
  };

  const handleSlotClick = (hour: number) => {
    setPreselectedTime(`${hour.toString().padStart(2, "0")}:00`);
    setShowAddEvent(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Date nav */}
      <div className="px-4 py-3 md:px-6 md:py-4 bg-card border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setSelectedDate(addDays(selectedDate, view === "day" ? -1 : -7))
            }
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-foreground">
              {view === "day"
                ? format(selectedDate, "EEEE, MMM d")
                : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`}
            </p>
            {view === "day" && isToday(selectedDate) && (
              <span className="text-xs text-primary font-medium">Today</span>
            )}
          </div>
          <button
            onClick={() =>
              setSelectedDate(addDays(selectedDate, view === "day" ? 1 : 7))
            }
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                view === "day"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                view === "week"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Week
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPreselectedTime(undefined);
              setShowAddEvent(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Event
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        {view === "day" ? (
          <DayView
            date={selectedDate}
            members={members}
            events={dayEvents(selectedDate)}
            getMemberColor={getMemberColor}
            onSlotClick={handleSlotClick}
            slotHeight={slotHeight}
          />
        ) : (
          <WeekView
            weekDays={weekDays}
            allEvents={allEvents}
            members={members}
            getMemberColor={getMemberColor}
          />
        )}
      </div>

      <AddEventDialog
        open={showAddEvent}
        onOpenChange={setShowAddEvent}
        defaultDate={format(selectedDate, "yyyy-MM-dd")}
        defaultTime={preselectedTime}
      />
    </div>
  );
}

function DayView({
  members,
  events,
  onSlotClick,
  slotHeight,
}: {
  date: Date;
  members: FamilyMember[];
  events: CalendarEvent[];
  getMemberColor: (id: string) => number;
  onSlotClick: (hour: number) => void;
  slotHeight: number;
}) {
  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Add family members to see calendars
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Time column */}
      <div className="w-12 md:w-16 flex-shrink-0 border-r border-border">
        {HOURS.map((h) => (
          <div
            key={h}
            className="h-16 md:h-20 flex items-start justify-end pr-2 pt-0.5"
          >
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {h === 0
                ? "12a"
                : h < 12
                  ? `${h}a`
                  : h === 12
                    ? "12p"
                    : `${h - 12}p`}
            </span>
          </div>
        ))}
      </div>

      {/* Member columns */}
      {members.map((member) => {
        const memberEvents = events.filter((e) => e.memberId === member.id);
        const allDayEvents = memberEvents.filter(isAllDayEvent);
        const timedEvents = memberEvents.filter((e) => !isAllDayEvent(e));
        const colorIdx = member.colorIndex;

        return (
          <div
            key={member.id}
            className="flex-1 min-w-0 border-r border-border last:border-r-0"
          >
            {/* Member header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-1 py-1.5 md:py-2 text-center">
              <Avatar className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-0.5">
                <AvatarFallback
                  className={cn(
                    "text-[8px] md:text-xs font-bold text-primary-foreground",
                    MEMBER_COLORS[colorIdx],
                  )}
                >
                  {getMemberInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] md:text-xs font-medium text-foreground truncate">
                {member.name.split(" ")[0]}
              </p>
            </div>

            {/* All-day events strip */}
            {allDayEvents.length > 0 && (
              <div className="border-b border-border bg-muted/20 px-1 py-1 space-y-1">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    title={event.title}
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] md:text-xs font-medium truncate border-l-2",
                      MEMBER_BG_LIGHT[colorIdx],
                      MEMBER_BORDER_COLORS[colorIdx],
                    )}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            )}

            {/* Time slots */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-16 md:h-20 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSlotClick(h)}
                />
              ))}

              {/* Timed events */}
              {timedEvents.map((event) => {
                const { top, height, startsBeforeWindow, endsAfterWindow } =
                  getTimedLayout(event, slotHeight);

                return (
                  <div
                    key={event.id}
                    title={`${event.title} (${event.startTime}–${event.endTime})`}
                    className={cn(
                      "absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 overflow-hidden border-l-2",
                      MEMBER_BG_LIGHT[colorIdx],
                      MEMBER_BORDER_COLORS[colorIdx],
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    {startsBeforeWindow && (
                      <p className="text-[8px] md:text-[10px] text-muted-foreground leading-none">
                        ↑ starts {event.startTime}
                      </p>
                    )}
                    <p className="text-[10px] md:text-xs font-semibold text-foreground truncate">
                      {event.title}
                    </p>
                    <p className="text-[9px] md:text-[11px] text-muted-foreground">
                      {event.startTime}–{event.endTime}
                    </p>
                    {endsAfterWindow && (
                      <p className="text-[8px] md:text-[10px] text-muted-foreground leading-none">
                        ↓ ends {event.endTime}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  weekDays,
  allEvents,
  members,
  getMemberColor,
}: {
  weekDays: Date[];
  allEvents: CalendarEvent[];
  members: FamilyMember[];
  getMemberColor: (id: string) => number;
}) {
  return (
    <div className="p-3 md:p-6 space-y-2 md:space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2.5 w-2.5 md:h-3 md:w-3 rounded-full",
                MEMBER_COLORS[m.colorIndex],
              )}
            />
            <span className="text-[10px] md:text-sm text-muted-foreground">
              {m.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      {weekDays.map((day) => {
        const dayEvts = allEvents.filter((e) =>
          isSameDay(parseISO(e.date), day),
        );
        return (
          <div key={day.toISOString()} className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 py-1",
                isToday(day) && "text-primary",
              )}
            >
              <span className="text-xs md:text-sm font-semibold w-8 md:w-10">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "text-xs md:text-sm font-bold h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full",
                  isToday(day)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
            {dayEvts.length === 0 ? (
              <p className="text-[10px] md:text-sm text-muted-foreground ml-10 md:ml-14">
                No events
              </p>
            ) : (
              <div className="ml-10 md:ml-14 space-y-1 md:space-y-1.5">
                {dayEvts.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 rounded-md",
                      MEMBER_BG_LIGHT[getMemberColor(e.memberId)],
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 md:h-2.5 md:w-2.5 rounded-full flex-shrink-0",
                        MEMBER_COLORS[getMemberColor(e.memberId)],
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">
                        {e.title}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {isAllDayEvent(e)
                          ? "All day"
                          : `${e.startTime}–${e.endTime}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
