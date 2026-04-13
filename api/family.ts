import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";

const router = Router();

// GET /api/family/members — list members for the authenticated user's family
router.get(
  "/members",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.query as { familyId: string };

    if (!familyId) {
      res.status(400).json({ error: "familyId is required" });
      return;
    }

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
    } catch (err: any) {
      console.error("Get members error:", err);
      res.status(500).json({ error: "Failed to get members" });
    }
  },
);

// POST /api/family/members/:memberId/toggle-admin — promote/demote admin
router.post(
  "/members/:memberId/toggle-admin",
  requireAuth as any,
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
      await pool.query(
        `UPDATE family_members SET is_admin = $1 WHERE id = $2`,
        [newIsAdmin, memberId],
      );

      res.json({ isAdmin: newIsAdmin });
    } catch (err: any) {
      console.error("Toggle admin error:", err);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  },
);

export default router;
