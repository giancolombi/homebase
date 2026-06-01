import {
  addDays,
  addMonths,
  isAfter,
  isBefore,
  parseISO,
  format,
} from "date-fns";
import type { CalendarEvent } from "@/types/family";

// Cap how many occurrences a single recurring event can generate, so a bad
// range or a daily rule over a huge window can't blow up rendering.
const MAX_OCCURRENCES = 366;

function step(date: Date, recurrence: CalendarEvent["recurrence"]): Date {
  switch (recurrence) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      return addMonths(date, 1);
    default:
      return addDays(date, 1);
  }
}

/**
 * Expand recurring events into concrete dated occurrences within
 * [rangeStart, rangeEnd] (inclusive). Non-recurring events are returned as-is.
 *
 * Each generated occurrence gets a composite id `${baseId}::${yyyy-MM-dd}` so
 * keys stay unique; the occurrence on the event's own start date keeps the
 * original id so it remains directly editable/deletable.
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.recurrence || event.recurrence === "none") {
      out.push(event);
      continue;
    }

    const base = parseISO(event.date);
    let cursor = base;
    let count = 0;

    while (!isAfter(cursor, rangeEnd) && count < MAX_OCCURRENCES) {
      if (!isBefore(cursor, rangeStart)) {
        const dateStr = format(cursor, "yyyy-MM-dd");
        out.push({
          ...event,
          id: dateStr === event.date ? event.id : `${event.id}::${dateStr}`,
          date: dateStr,
          // Occurrences render like single events; recurrence metadata is kept
          // for editing the series but doesn't re-expand.
          recurrence: event.recurrence,
        });
      }
      cursor = step(cursor, event.recurrence);
      count += 1;
    }
  }

  return out;
}
