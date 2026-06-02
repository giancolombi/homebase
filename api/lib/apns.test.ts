import { describe, it, expect } from "vitest";
import { isApnsConfigured, sendApns } from "./apns";

// In the test environment APNS_* env vars are unset, so APNs is unconfigured
// and sends must be safe no-ops (never throw, never hit the network).
describe("apns (unconfigured)", () => {
  it("reports not configured without APNS_* env", () => {
    expect(isApnsConfigured()).toBe(false);
  });

  it("sendApns resolves to a not_configured no-op", async () => {
    const res = await sendApns(
      "devicetoken",
      { title: "Hi", body: "There" },
      0,
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not_configured");
  });
});
