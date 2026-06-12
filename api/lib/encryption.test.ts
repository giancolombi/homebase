import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

// 32-byte hex key, test-only.
const TEST_KEY = "a".repeat(64);

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
});

describe("encryption", () => {
  it("round-trips arbitrary plaintext", async () => {
    const { encrypt, decrypt } = await import("./encryption.js");
    const samples = [
      "short",
      "ya29.a0AfH6SMC-long-oauth-token-with-dashes_and.dots",
      "unicode ✓ émoji 🏠",
      "",
    ];
    for (const plaintext of samples) {
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    }
  });

  it("produces a different ciphertext per call (random IV)", async () => {
    const { encrypt } = await import("./encryption.js");
    expect(encrypt("same input")).not.toBe(encrypt("same input"));
  });

  it("still decrypts payloads written with the legacy 16-byte IV", async () => {
    const { decrypt } = await import("./encryption.js");
    // Reproduce the pre-change format: aes-256-gcm with a 16-byte IV.
    const key = Buffer.from(TEST_KEY, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update("legacy token", "utf8", "base64");
    encrypted += cipher.final("base64");
    const legacy = [
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted,
    ].join(":");

    expect(decrypt(legacy)).toBe("legacy token");
  });

  it("rejects malformed ciphertext with a clear error", async () => {
    const { decrypt } = await import("./encryption.js");
    expect(() => decrypt("not-a-ciphertext")).toThrow(/Malformed ciphertext/);
  });

  it("rejects tampered ciphertext (GCM auth tag)", async () => {
    const { encrypt, decrypt } = await import("./encryption.js");
    const [iv, tag, data] = encrypt("secret").split(":");
    const tampered = Buffer.from(data, "base64");
    tampered[0] ^= 0xff;
    expect(() =>
      decrypt([iv, tag, tampered.toString("base64")].join(":")),
    ).toThrow();
  });

  it("rejects keys that are not 32 bytes", async () => {
    const { encrypt } = await import("./encryption.js");
    const original = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = "abcd";
    try {
      expect(() => encrypt("x")).toThrow(/32 bytes/);
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = original;
    }
  });
});
