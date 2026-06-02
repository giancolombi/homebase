import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  passwordError,
  MIN_PASSWORD_LENGTH,
} from "./validation";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Gian@Example.COM ")).toBe("gian@example.com");
  });

  it("treats case-variant emails as equal once normalized", () => {
    expect(normalizeEmail("A@B.com")).toBe(normalizeEmail("a@b.COM"));
  });
});

describe("passwordError", () => {
  it("rejects passwords shorter than the minimum", () => {
    expect(passwordError("short")).toMatch(/at least/);
  });

  it("rejects non-string input", () => {
    expect(passwordError(undefined)).toMatch(/at least/);
    expect(passwordError(12345678)).toMatch(/at least/);
  });

  it("accepts a password meeting length + letter/number rules", () => {
    expect(passwordError("abcdef12")).toBeNull();
    expect("abcdef12".length).toBe(MIN_PASSWORD_LENGTH);
  });

  it("rejects an all-letters or all-numbers password", () => {
    expect(passwordError("abcdefgh")).toMatch(/letter and one number/);
    expect(passwordError("12345678")).toMatch(/letter and one number/);
  });
});
