import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { sendInviteEmail, sendInviteAcceptedEmail } from "./lib/email.js";
import { JWT_SECRET } from "./lib/env.js";
import { getFamilyMembership } from "./lib/familyAuth.js";

const router = Router();
const APP_URL = process.env.APP_URL || "http://localhost:8080";

// POST /api/invite/send — send an invite email to a family member
router.post("/send", requireAuth, async (req: AuthRequest, res: Response) => {
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

    // The caller must be an owner/admin of the member's family. This both
    // closes the cross-family hole (sending invites for arbitrary families)
    // and enforces "only admins can invite".
    const membership = await getFamilyMembership(
      req.user!.id,
      member.family_id,
    );
    if (!membership) {
      res.status(403).json({ error: "Not a member of this family" });
      return;
    }
    if (!membership.isOwner && !membership.isAdmin) {
      res.status(403).json({ error: "Only admins can send invites" });
      return;
    }

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

    // Check that the existing email isn't already registered (case-insensitive)
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE lower(email) = lower($1)",
      [member.email],
    );

    if (existingUser.rows.length > 0) {
      // User exists — link them to the family member and mark accepted
      await pool.query(
        `UPDATE family_members
           SET user_id = $1, invite_status = 'accepted'
           WHERE id = $2`,
        [existingUser.rows[0].id, member.id],
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
      [inviteToken, member.id],
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
  } catch (err) {
    console.error("Send invite error:", err);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

// POST /api/invite/accept — accept an invite
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

    // Check if user already belongs to a family
    const existingMembership = await pool.query(
      `SELECT fm.id, fm.family_id, fm.is_owner, f.name as family_name
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1`,
      [userId],
    );

    if (existingMembership.rows.length > 0) {
      const current = existingMembership.rows[0];

      // Owners cannot leave their family
      if (current.is_owner) {
        res.status(400).json({
          error: `You are the owner of "${current.family_name}". Transfer ownership or delete your family before joining another.`,
          isOwner: true,
          currentFamilyName: current.family_name,
        });
        return;
      }

      // Remove user from their current family
      await pool.query(
        `UPDATE family_members SET user_id = NULL WHERE id = $1`,
        [current.id],
      );
    }

    // Link user to the new family member
    await pool.query(
      `UPDATE family_members
       SET user_id = $1, invite_status = 'accepted', invite_token = NULL
       WHERE id = $2`,
      [userId, payload.memberId],
    );

    // Notify the family owner that the invite was accepted. Best-effort —
    // accept response shouldn't fail if email or lookup fails.
    try {
      const ownerInfo = await pool.query(
        `SELECT u.email AS owner_email, f.name AS family_name,
                fm_invitee.name AS invitee_name, u_invitee.email AS invitee_email
         FROM families f
         JOIN users u ON u.id = f.owner_id
         JOIN family_members fm_invitee ON fm_invitee.id = $1
         JOIN users u_invitee ON u_invitee.id = $2
         WHERE f.id = $3`,
        [payload.memberId, userId, payload.familyId],
      );
      const row = ownerInfo.rows[0];
      if (row?.owner_email && row.owner_email !== row.invitee_email) {
        sendInviteAcceptedEmail({
          to: row.owner_email,
          inviteeName: row.invitee_name ?? "A new member",
          inviteeEmail: row.invitee_email ?? payload.email,
          familyName: row.family_name ?? "your family",
        }).catch((err) => console.warn("Invite-accepted email failed:", err));
      }
    } catch (notifyErr) {
      console.warn(
        "Could not look up owner for invite notification:",
        notifyErr,
      );
    }

    res.json({
      familyId: payload.familyId,
      memberId: payload.memberId,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
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

    // Check if the invited email already has an account and family
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [payload.email],
    );

    let currentFamily = null;
    let isOwnerOfCurrentFamily = false;

    if (existingUser.rows.length > 0) {
      const membershipResult = await pool.query(
        `SELECT fm.is_owner, f.name as family_name
         FROM family_members fm
         JOIN families f ON f.id = fm.family_id
         WHERE fm.user_id = $1`,
        [existingUser.rows[0].id],
      );
      if (membershipResult.rows.length > 0) {
        currentFamily = membershipResult.rows[0].family_name;
        isOwnerOfCurrentFamily = membershipResult.rows[0].is_owner;
      }
    }

    res.json({
      email: payload.email,
      familyName: familyResult.rows[0]?.name || "Unknown family",
      memberName: memberResult.rows[0]?.name || "Unknown",
      hasExistingAccount: existingUser.rows.length > 0,
      currentFamily,
      isOwnerOfCurrentFamily,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      res.status(400).json({ error: "Invite has expired" });
      return;
    }
    res.status(400).json({ error: "Invalid invite token" });
  }
});

export default router;
