// Apple iCloud Calendar via CalDAV. Apple doesn't support OAuth for iCloud
// Calendar — users authenticate with their Apple ID + an app-specific password
// generated at https://account.apple.com/account/manage (Sign-In and Security
// → App-Specific Passwords). We store the password encrypted alongside
// Google/Outlook OAuth tokens.

import { createDAVClient, type DAVCalendar } from "tsdav";
import * as ical from "node-ical";
import type { NormalizedEvent } from "./calendarProviders.js";

const ICLOUD_CALDAV_URL = "https://caldav.icloud.com/";

async function getICloudClient(appleId: string, appPassword: string) {
  return createDAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: {
      username: appleId,
      password: appPassword,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

// Throws if the credentials are wrong / iCloud refuses the login. Caller
// should catch and surface a user-friendly error.
export async function validateAppleCredentials(
  appleId: string,
  appPassword: string,
): Promise<void> {
  const client = await getICloudClient(appleId, appPassword);
  // Listing calendars is the cheapest authenticated call. iCloud responds
  // with 401/Unauthorized if the password is wrong, which tsdav surfaces as
  // a thrown error.
  await client.fetchCalendars();
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// node-ical typings allow string OR { val, params } for fields like summary
// (when the VEVENT carries iCal parameters such as LANGUAGE=en-US). Coerce
// to a plain string and treat empty as null.
function stringField(value: unknown): string | null {
  if (typeof value === "string") return value || null;
  if (value && typeof value === "object" && "val" in value) {
    const v = (value as { val?: unknown }).val;
    return typeof v === "string" && v ? v : null;
  }
  return null;
}

export async function fetchAppleEvents(
  appleId: string,
  appPassword: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  const client = await getICloudClient(appleId, appPassword);
  const calendars: DAVCalendar[] = await client.fetchCalendars();

  const startISO = new Date(timeMin).toISOString();
  const endISO = new Date(timeMax).toISOString();

  const events: NormalizedEvent[] = [];

  for (const calendar of calendars) {
    if (!calendar.url) continue;
    // Skip non-event calendars (Reminders/tasks list — VTODO not VEVENT).
    if (
      Array.isArray(calendar.components) &&
      !calendar.components.includes("VEVENT")
    ) {
      continue;
    }

    let objects;
    try {
      objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: startISO, end: endISO },
      });
    } catch (err) {
      // Some shared calendars on iCloud reject time-range queries; skip them
      // rather than fail the whole sync.
      console.warn(
        `Skipping iCloud calendar "${calendar.displayName ?? calendar.url}":`,
        err,
      );
      continue;
    }

    for (const obj of objects) {
      if (!obj.data) continue;
      let parsed: ical.CalendarResponse;
      try {
        parsed = ical.sync.parseICS(obj.data);
      } catch {
        continue;
      }

      for (const component of Object.values(parsed)) {
        if (!component || component.type !== "VEVENT") continue;
        const ev = component;

        const start = ev.start;
        const end = ev.end;
        if (!start || !end) continue;

        // node-ical sets `datetype` to "date" for all-day events.
        const allDay =
          (ev as unknown as { datetype?: string }).datetype === "date";

        const startDate = start as Date;
        const endDate = end as Date;
        const date = localDate(startDate);
        const startTime = allDay ? "00:00" : localTime(startDate);
        const endTime = allDay ? "23:59" : localTime(endDate);

        events.push({
          externalId: ev.uid || `${calendar.url}::${startDate.toISOString()}`,
          title: stringField(ev.summary) || "(No title)",
          description: stringField(ev.description),
          date,
          startTime,
          endTime,
          allDay,
          location: stringField(ev.location),
          rawData: { calendarUrl: calendar.url, ics: obj.data },
        });
      }
    }
  }

  return events;
}
