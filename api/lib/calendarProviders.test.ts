import { describe, it, expect } from "vitest";
import { mapGoogleEvent, mapOutlookEvent } from "./calendarProviders";

describe("mapGoogleEvent", () => {
  it("maps an all-day event", () => {
    const out = mapGoogleEvent({
      id: "g1",
      summary: "Holiday",
      start: { date: "2026-07-04" },
      end: { date: "2026-07-05" },
    });
    expect(out).toMatchObject({
      externalId: "g1",
      title: "Holiday",
      date: "2026-07-04",
      allDay: true,
      startTime: "00:00",
      endTime: "23:59",
    });
  });

  it("maps a timed event and falls back to (No title)", () => {
    const out = mapGoogleEvent({
      id: "g2",
      start: { dateTime: "2026-07-04T15:00:00Z" },
      end: { dateTime: "2026-07-04T16:00:00Z" },
    });
    expect(out.externalId).toBe("g2");
    expect(out.title).toBe("(No title)");
    expect(out.allDay).toBe(false);
  });
});

describe("mapOutlookEvent", () => {
  it("maps an all-day event using the date portion", () => {
    const out = mapOutlookEvent({
      id: "o1",
      subject: "Conf",
      isAllDay: true,
      start: { dateTime: "2026-08-01T00:00:00.0000000", timeZone: "UTC" },
      end: { dateTime: "2026-08-02T00:00:00.0000000", timeZone: "UTC" },
    });
    expect(out).toMatchObject({
      externalId: "o1",
      date: "2026-08-01",
      allDay: true,
    });
  });

  it("treats calendarView times as UTC", () => {
    const out = mapOutlookEvent({
      id: "o2",
      subject: "Sync",
      start: { dateTime: "2026-08-01T13:00:00.0000000", timeZone: "UTC" },
      end: { dateTime: "2026-08-01T13:30:00.0000000", timeZone: "UTC" },
    });
    expect(out.date).toBe("2026-08-01");
    expect(out.allDay).toBe(false);
  });
});
