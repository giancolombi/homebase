import { describe, it, expect } from "vitest";
import { generateUuid } from "./memberColors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("generateUuid", () => {
  it("produces a UUID-shaped string accepted by the events UUID column", () => {
    expect(generateUuid()).toMatch(UUID_RE);
  });

  it("produces unique values", () => {
    const a = generateUuid();
    const b = generateUuid();
    expect(a).not.toBe(b);
  });
});
