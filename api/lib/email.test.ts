import { describe, it, expect } from "vitest";
import { escapeHtml } from "./email.js";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeHtml(`Tom & Jerry's "Family"`)).toBe(
      "Tom &amp; Jerry&#39;s &quot;Family&quot;",
    );
  });

  it("leaves plain names untouched", () => {
    expect(escapeHtml("Gian Colombi")).toBe("Gian Colombi");
  });
});
