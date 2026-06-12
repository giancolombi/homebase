import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import { isFamilyMember, resolveFamilyId } from "./lib/familyAuth.js";
import pool from "./db.js";

const router = Router();

// Verify the caller belongs to the same family as the target member.
// Returns the member row (id, family_id, is_owner) or null after sending
// the error response.
async function resolveMemberForCaller(
  req: AuthRequest,
  res: Response,
  memberId: string,
): Promise<{ id: string; family_id: string; is_owner: boolean } | null> {
  const result = await pool.query(
    `SELECT id, family_id, is_owner FROM family_members WHERE id = $1`,
    [memberId],
  );
  const member = result.rows[0];
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return null;
  }
  if (!(await isFamilyMember(req.user!.id, member.family_id))) {
    res.status(403).json({ error: "Not a member of this family" });
    return null;
  }
  return member;
}

// GET /api/family/members — list members for the authenticated user's family
router.get("/members", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;

  try {
    const result = await pool.query(
      `SELECT id, name, role, email, color_index, is_owner, is_admin,
                invite_status, invite_sent_at, user_id
         FROM family_members
         WHERE family_id = $1
         ORDER BY is_owner DESC, name ASC`,
      [familyId],
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        email: row.email,
        colorIndex: row.color_index,
        isOwner: row.is_owner,
        isAdmin: row.is_admin,
        inviteStatus: row.invite_status,
        inviteSentAt: row.invite_sent_at,
        hasAccount: !!row.user_id,
      })),
    );
  } catch (err) {
    console.error("Get members error:", err);
    res.status(500).json({ error: "Failed to get members" });
  }
});

// POST /api/family/members — add a member to a family
router.post(
  "/members",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { name, role, email, colorIndex } = req.body;
    const familyId = await resolveFamilyId(req, res);
    if (!familyId) return;

    if (!name || !role) {
      res.status(400).json({ error: "name and role are required" });
      return;
    }

    try {
      const result = await pool.query(
        `INSERT INTO family_members
           (family_id, name, role, email, color_index, is_owner, invite_status)
         VALUES ($1, $2, $3, $4, $5, false, $6)
         RETURNING id`,
        [
          familyId,
          name,
          role,
          email || null,
          colorIndex ?? 0,
          role === "adult" ? "pending" : null,
        ],
      );

      res.status(201).json({
        id: result.rows[0].id,
        name,
        role,
        email: email || null,
        colorIndex: colorIndex ?? 0,
      });
    } catch (err) {
      console.error("Add member error:", err);
      res.status(500).json({ error: "Failed to add member" });
    }
  },
);

// PATCH /api/family/members/:memberId — update profile fields.
// Email and role are deliberately not updatable here: the member email is
// the key that links a member row to a user account (and to invites).
router.patch(
  "/members/:memberId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const memberId = req.params.memberId as string;
    const { name, colorIndex, avatarUrl } = req.body as {
      name?: string;
      colorIndex?: number;
      avatarUrl?: string | null;
    };

    try {
      const member = await resolveMemberForCaller(req, res, memberId);
      if (!member) return;

      const sets: string[] = [];
      const values: unknown[] = [];
      if (typeof name === "string" && name.trim()) {
        values.push(name.trim());
        sets.push(`name = $${values.length}`);
      }
      if (typeof colorIndex === "number") {
        values.push(colorIndex);
        sets.push(`color_index = $${values.length}`);
      }
      if (avatarUrl !== undefined) {
        values.push(avatarUrl);
        sets.push(`avatar_url = $${values.length}`);
      }
      if (sets.length === 0) {
        res.status(400).json({ error: "No updatable fields provided" });
        return;
      }

      values.push(memberId);
      await pool.query(
        `UPDATE family_members SET ${sets.join(", ")} WHERE id = $${values.length}`,
        values,
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Update member error:", err);
      res.status(500).json({ error: "Failed to update member" });
    }
  },
);

// DELETE /api/family/members/:memberId — remove a member from the family
router.delete(
  "/members/:memberId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const memberId = req.params.memberId as string;

    try {
      const member = await resolveMemberForCaller(req, res, memberId);
      if (!member) return;

      if (member.is_owner) {
        res.status(400).json({ error: "The family owner cannot be removed" });
        return;
      }

      await pool.query(`DELETE FROM family_members WHERE id = $1`, [memberId]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Delete member error:", err);
      res.status(500).json({ error: "Failed to delete member" });
    }
  },
);

// POST /api/family/members/:memberId/toggle-admin — promote/demote admin
router.post(
  "/members/:memberId/toggle-admin",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { memberId } = req.params;

    try {
      // Verify the requesting user is an owner or admin
      const callerResult = await pool.query(
        `SELECT fm.is_owner, fm.is_admin, fm.family_id
         FROM family_members fm
         WHERE fm.user_id = $1
           AND fm.family_id = (
             SELECT family_id FROM family_members WHERE id = $2
           )`,
        [req.user!.id, memberId],
      );

      if (callerResult.rows.length === 0) {
        res.status(403).json({ error: "Not a member of this family" });
        return;
      }

      const caller = callerResult.rows[0];
      if (!caller.is_owner && !caller.is_admin) {
        res.status(403).json({ error: "Only admins can change roles" });
        return;
      }

      // Get the target member
      const targetResult = await pool.query(
        `SELECT id, role, is_owner, is_admin FROM family_members WHERE id = $1`,
        [memberId],
      );

      if (targetResult.rows.length === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      const target = targetResult.rows[0];

      if (target.is_owner) {
        res.status(400).json({ error: "Cannot change owner's admin status" });
        return;
      }

      if (target.role !== "adult") {
        res.status(400).json({ error: "Only adults can be admins" });
        return;
      }

      // Toggle admin status
      const newIsAdmin = !target.is_admin;

      // Prevent removing the last admin
      if (!newIsAdmin) {
        const adminCount = await pool.query(
          `SELECT COUNT(*) FROM family_members
           WHERE family_id = $1 AND (is_admin = true OR is_owner = true)`,
          [caller.family_id],
        );
        if (parseInt(adminCount.rows[0].count) <= 1) {
          res.status(400).json({
            error:
              "Cannot remove the last admin. At least one admin is required.",
          });
          return;
        }
      }

      await pool.query(
        `UPDATE family_members SET is_admin = $1 WHERE id = $2`,
        [newIsAdmin, memberId],
      );

      res.json({ isAdmin: newIsAdmin });
    } catch (err) {
      console.error("Toggle admin error:", err);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  },
);

export default router;
