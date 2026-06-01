import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import type { PlaidApi } from "plaid";
import { verifyPlaidWebhook } from "./plaidWebhook";

// A client whose key fetch would throw — proves these rejections happen
// BEFORE any network call (malformed input is refused up front).
const explodingClient = {
  webhookVerificationKeyGet: () => {
    throw new Error("should not be called");
  },
} as unknown as PlaidApi;

describe("verifyPlaidWebhook", () => {
  it("rejects when the verification header is missing", async () => {
    const ok = await verifyPlaidWebhook(
      explodingClient,
      undefined,
      Buffer.from("{}"),
    );
    expect(ok).toBe(false);
  });

  it("rejects when the raw body is missing", async () => {
    const ok = await verifyPlaidWebhook(explodingClient, "x.y.z", undefined);
    expect(ok).toBe(false);
  });

  it("rejects a non-JWT header", async () => {
    const ok = await verifyPlaidWebhook(
      explodingClient,
      "not-a-jwt",
      Buffer.from("{}"),
    );
    expect(ok).toBe(false);
  });

  it("rejects a token signed with a non-ES256 algorithm", async () => {
    const forged = jwt.sign(
      { request_body_sha256: "deadbeef" },
      "attacker-secret",
      { algorithm: "HS256", keyid: "abc" },
    );
    const ok = await verifyPlaidWebhook(
      explodingClient,
      forged,
      Buffer.from("{}"),
    );
    expect(ok).toBe(false);
  });
});
