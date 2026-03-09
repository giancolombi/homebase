import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, isToday, isSameDay, parseISO } from "date-fns";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MEMBER_COLORS, MEMBER_BG_LIGHT, MEMBER_BORDER_COLORS, getMemberInitials, generateId } from "@/lib/memberColors";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AddEventDialog from "@/components/calendar/AddEventDialog";
import type { CalendarEvent } from "@/types/family";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function CalendarPage() {
  const { members, events, tasks } = useFamilyStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Merge task deadlines as calendar events
  const allEvents = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks
      .filter((t) => t.deadline && t.status !== "done")
      .map((t) => ({
        id: `task-${t.id}`,
        title: `📋 ${t.title}`,
        date: t.deadline!,
        startTime: t.deadlineTime || "09:00",
        endTime: t.deadlineTime
          ? format(new Date(`2000-01-01T${t.deadlineTime}`).getTime() + 3600000, "HH:mm")
          : "10:00",
        memberId: t.assignedTo[0] || "",
        recurrence: "none" as const,
        isTask: true,
        taskId: t.id,
      }));
    return [...events, ...taskEvents];
  }, [events, tasks]);

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
      <div className="px-4 py-3 bg-card border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedDate(addDays(selectedDate, view === "day" ? -1 : -7))} className="p-1.5 rounded-md hover:bg-muted">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {view === "day"
                ? format(selectedDate, "EEEE, MMM d")
                : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`}
            </p>
            {view === "day" && isToday(selectedDate) && (
              <span className="text-xs text-primary font-medium">Today</span>
            )}
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, view === "day" ? 1 : 7))} className="p-1.5 rounded-md hover:bg-muted">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("day")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", view === "day" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Week
            </button>
          </div>
          <Button size="sm" onClick={() => { setPreselectedTime(undefined); setShowAddEvent(true); }}>
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
  date,
  members,
  events,
  getMemberColor,
  onSlotClick,
}: {
  date: Date;
  members: any[];
  events: CalendarEvent[];
  getMemberColor: (id: string) => number;
  onSlotClick: (hour: number) => void;
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
      <div className="w-12 flex-shrink-0 border-r border-border">
        {HOURS.map((h) => (
          <div key={h} className="h-16 flex items-start justify-end pr-2 pt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
            </span>
          </div>
        ))}
      </div>

      {/* Member columns */}
      {members.map((member) => {
        const memberEvents = events.filter((e) => e.memberId === member.id);
        const colorIdx = member.colorIndex;

        return (
          <div key={member.id} className="flex-1 min-w-0 border-r border-border last:border-r-0">
            {/* Member header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-1 py-1.5 text-center">
              <Avatar className="h-6 w-6 mx-auto mb-0.5">
                <AvatarFallback className={cn("text-[8px] font-bold text-primary-foreground", MEMBER_COLORS[colorIdx])}>
                  {getMemberInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] font-medium text-foreground truncate">{member.name.split(" ")[0]}</p>
            </div>

            {/* Time slots */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-16 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSlotClick(h)}
                />
              ))}

              {/* Events */}
              {memberEvents.map((event) => {
                const [sh, sm] = event.startTime.split(":").map(Number);
                const [eh, em] = event.endTime.split(":").map(Number);
                const startMin = (sh - 6) * 60 + sm;
                const duration = (eh - sh) * 60 + (em - sm);
                const top = (startMin / 60) * 64;
                const height = Math.max((duration / 60) * 64, 24);

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 overflow-hidden",
                      MEMBER_BG_LIGHT[colorIdx],
                      MEMBER_BORDER_COLORS[colorIdx],
                      "border-l-2"
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <p className="text-[10px] font-semibold text-foreground truncate">{event.title}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {event.startTime}–{event.endTime}
                    </p>
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
  members: any[];
  getMemberColor: (id: string) => number;
}) {
  return (
    <div className="p-3 space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", MEMBER_COLORS[m.colorIndex])} />
            <span className="text-[10px] text-muted-foreground">{m.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>

      {weekDays.map((day) => {
        const dayEvts = allEvents.filter((e) => isSameDay(parseISO(e.date), day));
        return (
          <div key={day.toISOString()} className="space-y-1">
            <div className={cn("flex items-center gap-2 py-1", isToday(day) && "text-primary")}>
              <span className="text-xs font-semibold w-8">{format(day, "EEE")}</span>
              <span className={cn(
                "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
              )}>
                {format(day, "d")}
              </span>
            </div>
            {dayEvts.length === 0 ? (
              <p className="text-[10px] text-muted-foreground ml-10">No events</p>
            ) : (
              <div className="ml-10 space-y-1">
                {dayEvts.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md",
                      MEMBER_BG_LIGHT[getMemberColor(e.memberId)]
                    )}
                  >
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", MEMBER_COLORS[getMemberColor(e.memberId)])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground">{e.startTime}–{e.endTime}</p>
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
