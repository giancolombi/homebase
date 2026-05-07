import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { errorMessage } from "./lib/errors.js";

const router = Router();

// POST /api/devices/register — register or refresh an APNs/FCM device token
// for the current user. Idempotent on the (token) unique constraint so the
// iOS app can call this on every cold start without growing the table.
router.post(
  "/register",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { token, platform, appVersion } = req.body as {
      token?: string;
      platform?: string;
      appVersion?: string;
    };
    if (!token || (platform !== "ios" && platform !== "android")) {
      res
        .status(400)
        .json({ error: "token + platform (ios|android) required" });
      return;
    }
    try {
      await pool.query(
        `INSERT INTO device_tokens (user_id, token, platform, app_version)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token)
         DO UPDATE SET
           user_id = EXCLUDED.user_id,
           platform = EXCLUDED.platform,
           app_version = EXCLUDED.app_version,
           last_seen_at = now()`,
        [req.user!.id, token, platform, appVersion ?? null],
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Device register failed:", err);
      res.status(500).json({ error: errorMessage(err, "Register failed") });
    }
  },
);

// DELETE /api/devices/:token — drop a device token (called on sign-out or
// when the OS reports the token is no longer valid).
router.delete(
  "/:token",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const token = req.params.token as string;
    if (!token) {
      res.status(400).json({ error: "token required" });
      return;
    }
    try {
      await pool.query(
        `DELETE FROM device_tokens WHERE token = $1 AND user_id = $2`,
        [token, req.user!.id],
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Device delete failed:", err);
      res.status(500).json({ error: errorMessage(err, "Delete failed") });
    }
  },
);

export default router;
