import type { Request, Response, NextFunction } from "express";

// Minimal dependency-free fixed-window rate limiter. Keyed by client IP +
// route path. Intended for the auth surface (sign-in / sign-up / reset) to
// blunt credential stuffing and reset-token brute force. Not a substitute for
// an edge/CDN limiter, but a meaningful in-app backstop.

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    // Opportunistic prune so the map can't grow without bound.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (now > b.resetAt) buckets.delete(k);
      }
    }

    const key = `${req.ip ?? "unknown"}:${req.path}`;
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > opts.max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({
        error:
          opts.message || "Too many requests. Please try again in a moment.",
      });
      return;
    }

    next();
  };
}
