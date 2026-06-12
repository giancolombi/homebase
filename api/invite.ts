import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthRequest } from "./auth.js";
import { isFamilyMember } from "./lib/familyAuth.js";
import pool from "./db.js";
import { JWT_SECRET, APP_URL } from "./lib/config.js";
import { sendInviteEmail, sendInviteAcceptedEmail } from "./lib/email.js";

const router = Router();

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

    // Only members of the target family may send invites for it.
    if (!(await isFamilyMember(req.user!.id, member.family_id))) {
      res.status(403).json({ error: "Not a member of this family" });
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

    // Invitees who already have a Homebase account go through the same
    // email + accept flow as everyone else (the accept page signs them in).
    // Never auto-link an existing account to a family without that user
    // explicitly accepting — doing so would let anyone pull an existing
    // user into their family just by knowing their email.

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

// POST /api/invite/accept — accept an invite. Requires authentication: the
// account being linked is always the caller's own (a body-supplied userId
// would let whoever holds the token bind an arbitrary account).
router.post("/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const userId = req.user!.id;

  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as {
      memberId: string;
      familyId: string;
      email: string;
      purpose: string;
    };

    if (payload.purpose !== "invite") {
      res.status(400).json({ error: "Invalid invite token" });
      return;
    }

    // The invite is addressed to a specific email — only that account may
    // accept it.
    if (req.user!.email.toLowerCase() !== payload.email.toLowerCase()) {
      res
        .status(403)
        .json({ error: "This invite was sent to a different email address" });
      return;
    }

    // The presented token must still be the live one stored on the member
    // row (cleared on accept), making invites single-use even though the
    // JWT itself stays cryptographically valid for 7 days.
    const memberRow = await pool.query(
      `SELECT invite_status, invite_token FROM family_members WHERE id = $1`,
      [payload.memberId],
    );
    const invitedMember = memberRow.rows[0];
    if (invitedMember?.invite_status === "accepted") {
      res.status(400).json({ error: "Invite already accepted" });
      return;
    }
    if (!invitedMember || invitedMember.invite_token !== token) {
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
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as {
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
