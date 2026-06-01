import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import pool from "./db.js";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
} from "./lib/email.js";
import { JWT_SECRET, isDevelopment } from "./lib/env.js";
import { normalizeEmail, passwordError } from "./lib/validation.js";
import { rateLimit } from "./lib/rateLimit.js";
const APP_URL = process.env.APP_URL || "http://localhost:8080";

const router = Router();
const JWT_EXPIRES_IN = "7d";

// Throttle the unauthenticated auth surface to blunt credential stuffing and
// reset-token brute force: 20 requests per IP per 15 minutes per route.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
}

// Kept as an alias so existing route signatures don't have to churn. The
// `req.user?: AuthUser` shape itself lives in api/types/express.d.ts and is
// applied to every Express Request.
export type AuthRequest = Request;

// Middleware to verify JWT and attach user to request. Typed as RequestHandler
// so it satisfies Express's overloads without `as any` at every use site.
export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      full_name: string | null;
      iat?: number;
    };

    // Confirm the user still exists and the token was issued after their last
    // password change. This invalidates every session on password reset /
    // change and immediately rejects tokens for deleted accounts. The 5s grace
    // absorbs sub-second rounding of the JWT `iat` (issued-at) claim.
    const result = await pool.query(
      "SELECT password_changed_at FROM users WHERE id = $1",
      [payload.sub],
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const pwChangedAt = result.rows[0].password_changed_at as Date | null;
    if (
      pwChangedAt &&
      payload.iat &&
      payload.iat * 1000 < new Date(pwChangedAt).getTime() - 5000
    ) {
      res.status(401).json({ error: "Session expired, please sign in again" });
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      full_name: payload.full_name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

function signToken(user: {
  id: string;
  email: string;
  full_name: string | null;
}) {
  return jwt.sign(
    { sub: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

// Build the user payload returned by signin / signup / me. Including familyId
// and onboardingComplete on every auth response is what lets the frontend's
// AuthContext sync route the user correctly without waiting for a separate
// /me call.
async function userPayload(user: {
  id: string;
  email: string;
  full_name: string | null;
}) {
  const familyResult = await pool.query(
    `SELECT f.id, f.onboarding_completed_at FROM families f
     JOIN family_members fm ON fm.family_id = f.id
     WHERE fm.user_id = $1
     LIMIT 1`,
    [user.id],
  );
  const familyRow = familyResult.rows[0];
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    familyId: familyRow?.id ?? null,
    onboardingComplete: !!familyRow?.onboarding_completed_at,
  };
}

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req: Request, res: Response) => {
  const { email: rawEmail, password, full_name } = req.body;
  if (!rawEmail || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const pwError = passwordError(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }
  const email = normalizeEmail(rawEmail);

  try {
    // Check if user already exists (case-insensitive)
    const existing = await pool.query(
      "SELECT id FROM users WHERE lower(email) = $1",
      [email],
    );
    if (existing.rows.length > 0) {
      res
        .status(409)
        .json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await argon2.hash(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name`,
      [email, passwordHash, full_name || null],
    );

    const user = result.rows[0];

    // Auto-create profile
    await pool.query(
      `INSERT INTO profiles (id, display_name) VALUES ($1, $2)`,
      [user.id, user.full_name],
    );

    // Fire-and-forget welcome email — failure here shouldn't block signup.
    sendWelcomeEmail({
      to: user.email,
      fullName: user.full_name,
      appUrl: APP_URL,
    }).catch((err) => console.warn("Welcome email failed:", err));

    const token = signToken(user);
    res.status(201).json({
      user: await userPayload(user),
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/signin
router.post("/signin", authLimiter, async (req: Request, res: Response) => {
  const { email: rawEmail, password } = req.body;
  if (!rawEmail || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const email = normalizeEmail(rawEmail);

  try {
    const result = await pool.query(
      "SELECT id, email, full_name, password_hash FROM users WHERE lower(email) = $1",
      [email],
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user);
    res.json({
      user: await userPayload(user),
      token,
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Sign in failed" });
  }
});

// GET /api/auth/me  — validate token and return user
router.get("/me", async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      full_name: string | null;
    };

    // Verify user still exists in the database
    const result = await pool.query(
      "SELECT id, email, full_name FROM users WHERE id = $1",
      [payload.sub],
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    res.json({ user: await userPayload(result.rows[0]) });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// POST /api/auth/update-password
router.post(
  "/update-password",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { currentPassword, password } = req.body;
    const pwError = passwordError(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required" });
      return;
    }

    try {
      // Verify the current password before allowing a change — a live session
      // alone must not be enough to take over the account.
      const userRow = await pool.query(
        "SELECT email, full_name, password_hash FROM users WHERE id = $1",
        [req.user!.id],
      );
      if (userRow.rows.length === 0) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const current = userRow.rows[0];
      const valid = await argon2.verify(current.password_hash, currentPassword);
      if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const passwordHash = await argon2.hash(password);
      // Stamp password_changed_at so all other sessions are invalidated, then
      // issue a fresh token for THIS session so the caller stays signed in.
      await pool.query(
        "UPDATE users SET password_hash = $1, password_changed_at = now() WHERE id = $2",
        [passwordHash, req.user!.id],
      );
      // Notify (async). Email is the most reliable signal of unauthorized
      // password changes, so always send even if it slows the response.
      sendPasswordChangedEmail({ to: req.user!.email }).catch((err) =>
        console.warn("Password-changed email failed:", err),
      );
      const token = signToken({
        id: req.user!.id,
        email: current.email,
        full_name: current.full_name,
      });
      res.json({ message: "Password updated", token });
    } catch (err) {
      console.error("Update password error:", err);
      res.status(500).json({ error: "Failed to update password" });
    }
  },
);

// POST /api/auth/request-reset
// In a real app this would send an email with a reset token.
// For now, it generates a short-lived JWT that the client can use.
router.post(
  "/request-reset",
  authLimiter,
  async (req: Request, res: Response) => {
    const { email: rawEmail } = req.body;
    if (!rawEmail) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const email = normalizeEmail(rawEmail);

    try {
      const result = await pool.query(
        "SELECT id, email, full_name FROM users WHERE lower(email) = $1",
        [email],
      );
      // Always return success to prevent email enumeration
      if (result.rows.length === 0) {
        res.json({
          message: "If that email is registered, a reset link has been sent.",
        });
        return;
      }

      const user = result.rows[0];
      const resetToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          full_name: user.full_name,
          purpose: "reset",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

      // Try to send the email. If RESEND_API_KEY isn't configured the mailer
      // falls back to console logging so dev/E2E flows still work.
      const { sent } = await sendPasswordResetEmail({ to: email, resetUrl });
      if (!sent) {
        console.log(`Password reset URL for ${email}: ${resetUrl}`);
      }

      res.json({
        message: "If that email is registered, a reset link has been sent.",
        // Include the token ONLY in development (never staging/prod) so local
        // and E2E flows can complete the reset without an inbox. Gated on an
        // explicit NODE_ENV === "development" so an unset NODE_ENV can't leak it.
        ...(!sent && isDevelopment && { resetToken }),
      });
    } catch (err) {
      console.error("Request reset error:", err);
      res.status(500).json({ error: "Failed to process reset request" });
    }
  },
);

// POST /api/auth/reset-password  — use reset token to set new password
router.post(
  "/reset-password",
  authLimiter,
  async (req: Request, res: Response) => {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: "Token and password are required" });
      return;
    }
    const pwError = passwordError(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        purpose?: string;
      };
      if (payload.purpose !== "reset") {
        res.status(400).json({ error: "Invalid reset token" });
        return;
      }

      const passwordHash = await argon2.hash(password);
      // Stamp password_changed_at to invalidate any sessions issued before the
      // reset (a compromised session can't survive the user resetting).
      const updated = await pool.query(
        "UPDATE users SET password_hash = $1, password_changed_at = now() WHERE id = $2 RETURNING email",
        [passwordHash, payload.sub],
      );

      const updatedEmail = updated.rows[0]?.email;
      if (updatedEmail) {
        sendPasswordChangedEmail({ to: updatedEmail }).catch((err) =>
          console.warn("Password-changed email failed:", err),
        );
      }

      res.json({ message: "Password has been reset. You can now sign in." });
    } catch {
      res.status(400).json({ error: "Invalid or expired reset token" });
    }
  },
);

export default router;
