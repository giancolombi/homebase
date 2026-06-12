import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth, ApiError } from "@/lib/api";

const TOKEN_KEY = "homebase-auth-token";

function mockFetch(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("auth.getSession", () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, "stored-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("keeps the token when the network is down (offline launch)", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const session = await auth.getSession();
    expect(session).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe("stored-token");
  });

  it("keeps the token on a 5xx (transient server failure)", async () => {
    mockFetch(() => jsonResponse(500, { error: "Internal server error" }));
    const session = await auth.getSession();
    expect(session).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe("stored-token");
  });

  it("clears the token only when the server rejects it (401)", async () => {
    mockFetch(() => jsonResponse(401, { error: "Invalid or expired token" }));
    const session = await auth.getSession();
    expect(session).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("returns the user when the token is valid", async () => {
    mockFetch(() =>
      jsonResponse(200, {
        user: { id: "u1", email: "a@b.c", full_name: null },
      }),
    );
    const session = await auth.getSession();
    expect(session?.user.id).toBe("u1");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("stored-token");
  });
});

describe("request error shape", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("throws ApiError carrying the HTTP status and server message", async () => {
    mockFetch(() => jsonResponse(409, { error: "already exists" }));
    try {
      await auth.signUp("a@b.c", "password123");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
      expect((err as ApiError).message).toBe("already exists");
    }
  });
});
