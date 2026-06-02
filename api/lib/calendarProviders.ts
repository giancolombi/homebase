export interface NormalizedEvent {
  externalId: string;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay: boolean;
  location: string | null;
  rawData: unknown;
}

// Safety cap so a runaway calendar (or an API that never stops paginating)
// can't loop forever. 20 pages * 250 = 5000 events per sync window.
const MAX_PAGES = 20;

function formatTime(isoDateTime: string): { date: string; time: string } {
  const d = new Date(isoDateTime);
  return {
    date: d.toISOString().split("T")[0],
    time: d.toTimeString().slice(0, 5), // HH:mm
  };
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
}

export function mapGoogleEvent(event: GoogleEvent): NormalizedEvent {
  const allDay = !event.start.dateTime;
  if (allDay) {
    return {
      externalId: event.id,
      title: event.summary || "(No title)",
      description: event.description || null,
      date: event.start.date!,
      startTime: "00:00",
      endTime: "23:59",
      allDay: true,
      location: event.location || null,
      rawData: event,
    };
  }
  const start = formatTime(event.start.dateTime!);
  const end = formatTime(event.end.dateTime!);
  return {
    externalId: event.id,
    title: event.summary || "(No title)",
    description: event.description || null,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    allDay: false,
    location: event.location || null,
    rawData: event,
  };
}

async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  const out: NormalizedEvent[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const data = (await res.json()) as {
      items?: GoogleEvent[];
      nextPageToken?: string;
    };
    for (const e of data.items || []) {
      if (e.status !== "cancelled") out.push(mapGoogleEvent(e));
    }
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  return out;
}

interface OutlookEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
}

export function mapOutlookEvent(event: OutlookEvent): NormalizedEvent {
  if (event.isAllDay) {
    return {
      externalId: event.id,
      title: event.subject || "(No title)",
      description: event.bodyPreview || null,
      date: event.start.dateTime.split("T")[0],
      startTime: "00:00",
      endTime: "23:59",
      allDay: true,
      location: event.location?.displayName || null,
      rawData: event,
    };
  }
  // Microsoft Graph returns UTC times for calendarView
  const start = formatTime(event.start.dateTime + "Z");
  const end = formatTime(event.end.dateTime + "Z");
  return {
    externalId: event.id,
    title: event.subject || "(No title)",
    description: event.bodyPreview || null,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    allDay: false,
    location: event.location?.displayName || null,
    rawData: event,
  };
}

async function fetchOutlookEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  const out: NormalizedEvent[] = [];
  const params = new URLSearchParams({
    startDateTime: new Date(timeMin).toISOString(),
    endDateTime: new Date(timeMax).toISOString(),
    $top: "250",
    $orderby: "start/dateTime",
    $select: "id,subject,bodyPreview,location,start,end,isAllDay",
  });

  let url: string | undefined =
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }
    const data = (await res.json()) as {
      value?: OutlookEvent[];
      "@odata.nextLink"?: string;
    };
    for (const e of data.value || []) out.push(mapOutlookEvent(e));
    url = data["@odata.nextLink"];
    pages += 1;
  }

  return out;
}

export async function fetchEvents(
  provider: string,
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  if (provider === "google") {
    return fetchGoogleEvents(accessToken, timeMin, timeMax);
  }
  if (provider === "outlook") {
    return fetchOutlookEvents(accessToken, timeMin, timeMax);
  }
  throw new Error(`Unsupported provider: ${provider}`);
}
