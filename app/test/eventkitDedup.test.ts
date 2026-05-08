import { describe, expect, it } from "vitest";
import { matchProvidersFromSources } from "@/lib/eventkitDedup";

// Mirrors the "Source-to-provider matching for pause" scenario in
// specs/features/external-calendar-sync.feature. If this test fails, the
// matrix in the feature file and the matcher have drifted.

describe("matchProvidersFromSources", () => {
  it("matches iCloud → apple", () => {
    expect(matchProvidersFromSources(["iCloud"])).toEqual(["apple"]);
    expect(matchProvidersFromSources(["icloud"])).toEqual(["apple"]);
  });

  it("matches Google / Gmail → google", () => {
    expect(matchProvidersFromSources(["Google"])).toEqual(["google"]);
    expect(matchProvidersFromSources(["Gmail"])).toEqual(["google"]);
    // Email-shaped sourceTitles count too — Apple sometimes returns the
    // user's address as the source.
    expect(matchProvidersFromSources(["alex@gmail.com"])).toEqual(["google"]);
  });

  it("matches Outlook / Office / Exchange → outlook", () => {
    expect(matchProvidersFromSources(["Outlook"])).toEqual(["outlook"]);
    expect(matchProvidersFromSources(["Office 365"])).toEqual(["outlook"]);
    expect(matchProvidersFromSources(["Microsoft Exchange"])).toEqual([
      "outlook",
    ]);
  });

  it("returns multiple providers when sources span them", () => {
    expect(
      matchProvidersFromSources(["iCloud", "Gmail", "Outlook"]).sort(),
    ).toEqual(["apple", "google", "outlook"]);
  });

  it("ignores unknown sources", () => {
    expect(
      matchProvidersFromSources(["Subscribed Calendars", "US Holidays"]),
    ).toEqual([]);
  });

  it("handles empty input safely", () => {
    expect(matchProvidersFromSources([])).toEqual([]);
    expect(matchProvidersFromSources([""])).toEqual([]);
  });
});
