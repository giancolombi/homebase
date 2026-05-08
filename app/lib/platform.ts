import { Capacitor } from "@capacitor/core";

// Single source of truth for "are we running inside the iOS Capacitor app".
// Used to hide UI surfaces that don't apply on iOS (e.g. the Apple iCloud
// CalDAV dialog — EventKit already covers iCloud) or to switch behavior
// (token storage, OAuth presentation, etc.).
export const isCapacitorIOS = (): boolean => Capacitor.getPlatform() === "ios";
