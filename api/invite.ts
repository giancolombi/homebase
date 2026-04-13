import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { sendInviteEmail } from "./lib/email.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const APP_URL = process.env.APP_URL || "http://localhost:8080";

// POST /api/invite/send — send an invite email to a family member
router.post(
  "/send",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { memberId, email, familyId } = req.body;

    if (!memberId && !(email && familyId)) {
      res
        .status(400)
        .json({ error: "memberId or (email + familyId) is required" });
      return;
    }

    try {
      // Look up the member — by ID or by email + family
      const memberResult = memberId
        ? await pool.query(
            `SELECT fm.id, fm.name, fm.email, fm.role, fm.invite_status,
                    fm.family_id, f.name as family_name
             FROM family_members fm
             JOIN families f ON f.id = fm.family_id
             WHERE fm.id = $1`,
            [memberId],
          )
        : await pool.query(
            `SELECT fm.id, fm.name, fm.email, fm.role, fm.invite_status,
                    fm.family_id, f.name as family_name
             FROM family_members fm
             JOIN families f ON f.id = fm.family_id
             WHERE fm.email = $1 AND fm.family_id = $2`,
            [email, familyId],
          );

      if (memberResult.rows.length === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      const member = memberResult.rows[0];

      if (!member.email) {
        res.status(400).json({ error: "Member has no email address" });
        return;
      }

      if (member.role !== "adult") {
        res.status(400).json({ error: "Can only invite adult members" });
        return;
      }

      if (member.invite_status === "accepted") {
        res.status(400).json({ error: "Member has already accepted" });
        return;
      }

      // Check that the existing email isn't already registered
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [member.email],
      );

      if (existingUser.rows.length > 0) {
        // User exists — link them to the family member and mark accepted
        await pool.query(
          `UPDATE family_members
           SET user_id = $1, invite_status = 'accepted'
           WHERE id = $2`,
          [existingUser.rows[0].id, memberId],
        );
        res.json({
          message: "User already has an account — linked to family",
          alreadyAccepted: true,
        });
        return;
      }

      // Generate invite token (valid 7 days)
      const inviteToken = jwt.sign(
        {
          memberId: member.id,
          familyId: member.family_id,
          email: member.email,
          purpose: "invite",
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      // Store the invite token on the member
      await pool.query(
        `UPDATE family_members
         SET invite_token = $1, invite_sent_at = now()
         WHERE id = $2`,
        [inviteToken, memberId],
      );

      // Send the email
      const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;

      await sendInviteEmail({
        to: member.email,
        inviterName: req.user!.full_name || req.user!.email,
        familyName: member.family_name,
        inviteUrl,
      });

      res.json({ message: "Invite sent", email: member.email });
    } catch (err: any) {
      console.error("Send invite error:", err);
      res.status(500).json({ error: "Failed to send invite" });
    }
  },
);

// POST /api/invite/accept — accept an invite (called during signup)
router.post("/accept", async (req, res) => {
  const { token, userId } = req.body;

  if (!token || !userId) {
    res.status(400).json({ error: "token and userId are required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      memberId: string;
      familyId: string;
      email: string;
      purpose: string;
    };

    if (payload.purpose !== "invite") {
      res.status(400).json({ error: "Invalid invite token" });
      return;
    }

    // Link user to the family member
    await pool.query(
      `UPDATE family_members
       SET user_id = $1, invite_status = 'accepted', invite_token = NULL
       WHERE id = $2`,
      [userId, payload.memberId],
    );

    res.json({
      familyId: payload.familyId,
      memberId: payload.memberId,
    });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(400).json({ error: "Invite has expired" });
      return;
    }
    console.error("Accept invite error:", err);
    res.status(400).json({ error: "Invalid invite token" });
  }
});

// GET /api/invite/verify — verify an invite token is valid (for the accept page)
router.get("/verify", async (req, res) => {
  const { token } = req.query as { token?: string };

  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      memberId: string;
      familyId: string;
      email: string;
      purpose: string;
    };

    if (payload.purpose !== "invite") {
      res.status(400).json({ error: "Invalid invite token" });
      return;
    }

    // Get family info
    const familyResult = await pool.query(
      "SELECT name FROM families WHERE id = $1",
      [payload.familyId],
    );

    const memberResult = await pool.query(
      "SELECT name, invite_status FROM family_members WHERE id = $1",
      [payload.memberId],
    );

    if (memberResult.rows[0]?.invite_status === "accepted") {
      res.status(400).json({ error: "Invite already accepted" });
      return;
    }

    res.json({
      email: payload.email,
      familyName: familyResult.rows[0]?.name || "Unknown family",
      memberName: memberResult.rows[0]?.name || "Unknown",
    });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(400).json({ error: "Invite has expired" });
      return;
    }
    res.status(400).json({ error: "Invalid invite token" });
  }
});

export default router;
