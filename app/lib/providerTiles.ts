import { isCapacitorIOS } from "@/lib/platform";

// The external calendar providers a user can connect, shared by the
// Settings page (shortName) and the onboarding calendar step (name).
export const EXTERNAL_PROVIDERS = [
  {
    id: "google" as const,
    name: "Google Calendar",
    shortName: "Google",
    icon: "🔵",
  },
  {
    id: "outlook" as const,
    name: "Outlook Calendar",
    shortName: "Outlook",
    icon: "🟦",
  },
  {
    id: "apple" as const,
    name: "Apple Calendar",
    shortName: "Apple",
    icon: "⚪",
  },
];

export type ExternalProviderId = (typeof EXTERNAL_PROVIDERS)[number]["id"];

// On iOS the EventKit card already covers iCloud (and every other account
// the user has added in iOS Settings → Calendar). The Apple tile is
// CalDAV-with-app-specific-password — only useful on web where there's no
// device calendar to read.
export function visibleProviders() {
  return isCapacitorIOS()
    ? EXTERNAL_PROVIDERS.filter((p) => p.id !== "apple")
    : EXTERNAL_PROVIDERS;
}
