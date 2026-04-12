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

function formatTime(isoDateTime: string): { date: string; time: string } {
  const d = new Date(isoDateTime);
  return {
    date: d.toISOString().split("T")[0],
    time: d.toTimeString().slice(0, 5), // HH:mm
  };
}

async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }

  const data = (await res.json()) as {
    items: Array<{
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      status?: string;
    }>;
  };

  return (data.items || [])
    .filter((e) => e.status !== "cancelled")
    .map((event) => {
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
    });
}

async function fetchOutlookEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<NormalizedEvent[]> {
  const params = new URLSearchParams({
    startDateTime: new Date(timeMin).toISOString(),
    endDateTime: new Date(timeMax).toISOString(),
    $top: "250",
    $orderby: "start/dateTime",
    $select: "id,subject,bodyPreview,location,start,end,isAllDay",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Microsoft Graph API error: ${error}`);
  }

  const data = (await res.json()) as {
    value: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      location?: { displayName?: string };
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      isAllDay?: boolean;
    }>;
  };

  return (data.value || []).map((event) => {
    if (event.isAllDay) {
      const date = event.start.dateTime.split("T")[0];
      return {
        externalId: event.id,
        title: event.subject || "(No title)",
        description: event.bodyPreview || null,
        date,
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
  });
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
