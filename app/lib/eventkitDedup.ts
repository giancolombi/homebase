// Source-of-truth for "given a set of EventKit sourceTitle strings, which
// of our OAuth/CalDAV providers should we auto-pause to avoid duplicating
// events?".
//
// EKSource.title returns strings like "iCloud", "Gmail", "Google",
// "Outlook", "Exchange", "Office 365", or the user's email address. We do
// case-insensitive substring matching against a known list — anything that
// doesn't match (e.g. "Subscribed Calendars") never pauses anything.
//
// api/calendar.ts duplicates this logic on the server side because the
// boundary is HTTP — there's no module sharing across api/ and app/. Kept
// in lockstep by:
//   - the unit test in app/test/eventkitDedup.test.ts (here)
//   - the "Source-to-provider matching for pause" Gherkin scenario in
//     specs/features/external-calendar-sync.feature

export type DedupProvider = "apple" | "google" | "outlook";

export function matchProvidersFromSources(
  sources: Iterable<string>,
): DedupProvider[] {
  const lowered = Array.from(sources, (s) => s.toLowerCase()).filter(
    (s) => s.length > 0,
  );
  const includesAny = (substrs: string[]) =>
    lowered.some((src) => substrs.some((s) => src.includes(s)));

  const out: DedupProvider[] = [];
  if (includesAny(["icloud"])) out.push("apple");
  if (includesAny(["google", "gmail"])) out.push("google");
  if (includesAny(["outlook", "office", "exchange"])) out.push("outlook");
  return out;
}
