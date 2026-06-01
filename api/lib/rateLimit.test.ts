import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { rateLimit } from "./rateLimit";

function fakeReqRes(ip: string, path: string) {
  const req = { ip, path } as Request;
  const state = { statusCode: 0, body: undefined as unknown };
  const res = {
    set: vi.fn(),
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      state.body = payload;
      return res;
    },
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, state };
}

describe("rateLimit", () => {
  it("allows requests up to the limit then blocks with 429", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });

    for (let i = 0; i < 3; i++) {
      const { req, res, next, state } = fakeReqRes("1.1.1.1", "/signin");
      limiter(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(state.statusCode).toBe(0);
    }

    const { req, res, next, state } = fakeReqRes("1.1.1.1", "/signin");
    limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(429);
  });

  it("tracks limits per IP+path independently", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });

    const a = fakeReqRes("1.1.1.1", "/signin");
    limiter(a.req, a.res, a.next);
    expect(a.next).toHaveBeenCalledOnce();

    // Different IP — fresh bucket.
    const b = fakeReqRes("2.2.2.2", "/signin");
    limiter(b.req, b.res, b.next);
    expect(b.next).toHaveBeenCalledOnce();

    // Same IP, different path — fresh bucket.
    const c = fakeReqRes("1.1.1.1", "/signup");
    limiter(c.req, c.res, c.next);
    expect(c.next).toHaveBeenCalledOnce();
  });
});
