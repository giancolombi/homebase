import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";

const router = Router();

// GET /api/family/members — list members for the authenticated user's family
router.get("/members", requireAuth, async (req: AuthRequest, res: Response) => {
  // Verify the caller is a member of the requested family before exposing
  // names, emails and roles (prevents cross-family enumeration).
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

    // Verify the caller belongs to the family they're adding a member to.
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

// PUT /api/family/members/:memberId — update a member's profile. A member can
// edit their own row; owners/admins can edit anyone in the family.
router.put(
  "/members/:memberId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { memberId } = req.params;
    const { name, email, colorIndex } = req.body as {
      name?: string;
      email?: string | null;
      colorIndex?: number;
    };

    try {
      const targetResult = await pool.query(
        `SELECT family_id, user_id FROM family_members WHERE id = $1`,
        [memberId],
      );
      if (targetResult.rows.length === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const target = targetResult.rows[0];

      const callerResult = await pool.query(
        `SELECT is_owner, is_admin FROM family_members
         WHERE family_id = $1 AND user_id = $2`,
        [target.family_id, req.user!.id],
      );
      if (callerResult.rows.length === 0) {
        res.status(403).json({ error: "Not a member of this family" });
        return;
      }
      const caller = callerResult.rows[0];
      const isSelf = target.user_id && target.user_id === req.user!.id;
      if (!isSelf && !caller.is_owner && !caller.is_admin) {
        res.status(403).json({ error: "Cannot edit other members" });
        return;
      }

      // Build a dynamic update from the provided fields only.
      const sets: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined) {
        sets.push(`name = $${i++}`);
        values.push(name);
      }
      if (email !== undefined) {
        sets.push(`email = $${i++}`);
        values.push(email ? email.trim().toLowerCase() : null);
      }
      if (colorIndex !== undefined) {
        sets.push(`color_index = $${i++}`);
        values.push(colorIndex);
      }
      if (sets.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      values.push(memberId);

      const result = await pool.query(
        `UPDATE family_members SET ${sets.join(", ")}
         WHERE id = $${i}
         RETURNING id, name, role, email, color_index, is_owner, is_admin,
                   invite_status, invite_sent_at, user_id`,
        values,
      );
      const row = result.rows[0];
      res.json({
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
      });
    } catch (err) {
      console.error("Update member error:", err);
      res.status(500).json({ error: "Failed to update member" });
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

// DELETE /api/family/members/:memberId — remove a member (owner/admin only).
// Cascades the member's calendar connections and, if they had an account,
// their push device tokens so a removed person stops receiving family data.
router.delete(
  "/members/:memberId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { memberId } = req.params;

    try {
      const targetResult = await pool.query(
        `SELECT id, family_id, role, is_owner, is_admin, user_id
         FROM family_members WHERE id = $1`,
        [memberId],
      );
      if (targetResult.rows.length === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const target = targetResult.rows[0];

      // Caller must be an owner/admin of the target's family.
      const callerResult = await pool.query(
        `SELECT is_owner, is_admin FROM family_members
         WHERE family_id = $1 AND user_id = $2`,
        [target.family_id, req.user!.id],
      );
      if (callerResult.rows.length === 0) {
        res.status(403).json({ error: "Not a member of this family" });
        return;
      }
      const caller = callerResult.rows[0];
      if (!caller.is_owner && !caller.is_admin) {
        res.status(403).json({ error: "Only admins can remove members" });
        return;
      }

      if (target.is_owner) {
        res.status(400).json({ error: "Cannot remove the family owner" });
        return;
      }

      // Don't strand the family without an admin.
      if (target.is_admin) {
        const adminCount = await pool.query(
          `SELECT COUNT(*) FROM family_members
           WHERE family_id = $1 AND (is_admin = true OR is_owner = true)`,
          [target.family_id],
        );
        if (parseInt(adminCount.rows[0].count, 10) <= 1) {
          res.status(400).json({
            error: "Cannot remove the last admin. Promote someone else first.",
          });
          return;
        }
      }

      await pool.query(
        `DELETE FROM calendar_connections WHERE member_id = $1`,
        [memberId],
      );
      if (target.user_id) {
        await pool.query(`DELETE FROM device_tokens WHERE user_id = $1`, [
          target.user_id,
        ]);
      }
      await pool.query(`DELETE FROM family_members WHERE id = $1`, [memberId]);

      res.json({ success: true });
    } catch (err) {
      console.error("Remove member error:", err);
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

export default router;
