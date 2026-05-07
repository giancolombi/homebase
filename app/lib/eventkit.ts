// EventKit JS bridge.
//
// Talks to the custom Capacitor plugin defined in
// capacitor/EventKitPlugin/EventKitPlugin.swift. On non-iOS platforms (web,
// Android until we ship that) every call returns a "not available" result
// so feature-detection-via-call works without a platform check at every
// site.
//
// Why route through Capacitor.registerPlugin: it's the published API for
// custom plugins on Capacitor 8+. The native side registers under the name
// "EventKit" in EventKitPlugin.m.

import { Capacitor, registerPlugin } from "@capacitor/core";

export interface EventKitEvent {
  externalId: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  sourceTitle: string | null;
  calendarTitle: string | null;
  startISO: string;
  endISO: string;
}

export interface EventKitCalendar {
  id: string;
  title: string;
  sourceTitle: string;
  color: string;
  allowsModifications: boolean;
}

export type EventKitAuthStatus =
  | "notDetermined"
  | "restricted"
  | "denied"
  | "authorized"
  | "fullAccess"
  | "writeOnly"
  | "unavailable";

interface EventKitPluginInterface {
  requestAccess(): Promise<{ granted: boolean }>;
  currentAuthorizationStatus(): Promise<{ status: EventKitAuthStatus }>;
  listCalendars(): Promise<{ calendars: EventKitCalendar[] }>;
  fetchEvents(opts: {
    timeMin: string;
    timeMax: string;
  }): Promise<{ events: EventKitEvent[] }>;
  observeChanges(): Promise<{ ok: boolean }>;
  stopObserving(): Promise<{ ok: boolean }>;
  addListener(
    eventName: "eventStoreChanged",
    cb: () => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const EventKit = registerPlugin<EventKitPluginInterface>("EventKit");

export function isEventKitAvailable(): boolean {
  return (
    Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("EventKit")
  );
}

export async function requestEventKitAccess(): Promise<boolean> {
  if (!isEventKitAvailable()) return false;
  const { granted } = await EventKit.requestAccess();
  return granted;
}

export async function eventKitAuthorizationStatus(): Promise<EventKitAuthStatus> {
  if (!isEventKitAvailable()) return "unavailable";
  const { status } = await EventKit.currentAuthorizationStatus();
  return status;
}

export async function listEventKitCalendars(): Promise<EventKitCalendar[]> {
  if (!isEventKitAvailable()) return [];
  const { calendars } = await EventKit.listCalendars();
  return calendars;
}

export async function fetchEventKitEvents(
  timeMin: Date,
  timeMax: Date,
): Promise<EventKitEvent[]> {
  if (!isEventKitAvailable()) return [];
  const { events } = await EventKit.fetchEvents({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  });
  return events;
}

export async function observeEventKitChanges(
  cb: () => void,
): Promise<() => void> {
  if (!isEventKitAvailable()) return () => undefined;
  await EventKit.observeChanges();
  const sub = await EventKit.addListener("eventStoreChanged", cb);
  return () => {
    sub.remove();
    EventKit.stopObserving();
  };
}
