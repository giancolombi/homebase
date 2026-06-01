import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import { expandRecurringEvents } from "./recurrence";
import type { CalendarEvent } from "@/types/family";

function ev(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e1",
    title: "Test",
    date: "2026-06-01",
    startTime: "09:00",
    endTime: "10:00",
    memberId: "m1",
    recurrence: "none",
    ...overrides,
  };
}

const start = parseISO("2026-06-01");
const end = parseISO("2026-06-30");

describe("expandRecurringEvents", () => {
  it("passes non-recurring events through unchanged", () => {
    const out = expandRecurringEvents([ev({})], start, end);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("e1");
  });

  it("expands a weekly event into one occurrence per week in range", () => {
    const out = expandRecurringEvents(
      [ev({ recurrence: "weekly" })],
      start,
      end,
    );
    // Jun 1, 8, 15, 22, 29 → 5 occurrences
    expect(out.map((e) => e.date)).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
  });

  it("keeps the original id on the start-date occurrence and namespaces the rest", () => {
    const out = expandRecurringEvents(
      [ev({ recurrence: "weekly" })],
      start,
      end,
    );
    expect(out[0].id).toBe("e1");
    expect(out[1].id).toBe("e1::2026-06-08");
  });

  it("expands daily and monthly recurrences", () => {
    const daily = expandRecurringEvents(
      [ev({ recurrence: "daily" })],
      start,
      parseISO("2026-06-05"),
    );
    expect(daily).toHaveLength(5);

    const monthly = expandRecurringEvents(
      [ev({ recurrence: "monthly" })],
      start,
      parseISO("2026-09-15"),
    );
    expect(monthly.map((e) => e.date)).toEqual([
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
  });

  it("only emits occurrences inside the requested range", () => {
    const out = expandRecurringEvents(
      [ev({ date: "2026-05-01", recurrence: "weekly" })],
      start,
      end,
    );
    expect(out.every((e) => e.date >= "2026-06-01")).toBe(true);
  });
});
