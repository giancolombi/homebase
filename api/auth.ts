import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Middleware to verify JWT and attach user to request
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
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
    };
    req.user = {
      id: payload.sub,
      email: payload.email,
      full_name: payload.full_name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

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

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
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

    const token = signToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/signin
router.post("/signin", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, email, full_name, password_hash FROM users WHERE email = $1",
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
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err: any) {
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

    const user = result.rows[0];

    // Look up the user's family
    const familyResult = await pool.query(
      `SELECT f.id FROM families f
       JOIN family_members fm ON fm.family_id = f.id
       WHERE fm.user_id = $1
       LIMIT 1`,
      [user.id],
    );
    const familyId = familyResult.rows[0]?.id || null;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        familyId,
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// POST /api/auth/update-password
router.post(
  "/update-password",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    try {
      const passwordHash = await argon2.hash(password);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        passwordHash,
        req.user!.id,
      ]);
      res.json({ message: "Password updated" });
    } catch (err: any) {
      console.error("Update password error:", err);
      res.status(500).json({ error: "Failed to update password" });
    }
  },
);

// POST /api/auth/request-reset
// In a real app this would send an email with a reset token.
// For now, it generates a short-lived JWT that the client can use.
router.post("/request-reset", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, email, full_name FROM users WHERE email = $1",
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

    // In production, send this token via email.
    // For development, return it directly.
    console.log(`Password reset token for ${email}: ${resetToken}`);
    res.json({
      message: "If that email is registered, a reset link has been sent.",
      // Include token in dev for testing (remove in production)
      ...(process.env.NODE_ENV !== "production" && { resetToken }),
    });
  } catch (err: any) {
    console.error("Request reset error:", err);
    res.status(500).json({ error: "Failed to process reset request" });
  }
});

// POST /api/auth/reset-password  — use reset token to set new password
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
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
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      payload.sub,
    ]);

    res.json({ message: "Password has been reset. You can now sign in." });
  } catch {
    res.status(400).json({ error: "Invalid or expired reset token" });
  }
});

export default router;
