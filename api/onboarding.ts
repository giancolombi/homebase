import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";

const router = Router();

// POST /api/onboarding/complete
// Creates the user's profile, family, members, and default task categories.
// Calendar connections are NOT created here — they're written by the
// /api/calendar/callback/:provider OAuth callback as the user connects each
// provider during the calendar step. This endpoint is idempotent: if the user
// already owns a family, it returns the existing family + member map.
router.post(
  "/complete",
  requireAuth as any,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { profile, familyName, members } = req.body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Update/insert profile
      if (profile) {
        await client.query(
          `INSERT INTO profiles (id, display_name, color_index)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             color_index = EXCLUDED.color_index,
             updated_at = now()`,
          [userId, profile.display_name, profile.color_index ?? 0],
        );
      }

      // Idempotency: if this user already owns a family, return it instead
      // of creating a duplicate. Lets the user navigate back/forward through
      // onboarding steps without spawning extra families.
      const existing = await client.query(
        `SELECT id FROM families WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );

      if (existing.rows.length > 0) {
        const familyId = existing.rows[0].id;
        const ownerRow = await client.query(
          `SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2 LIMIT 1`,
          [familyId, userId],
        );
        const ownerDbId = ownerRow.rows[0]?.id ?? null;

        await client.query("COMMIT");
        res.json({
          familyId,
          ownerMemberId: ownerDbId,
          memberIdMap: {},
          alreadyExisted: true,
        });
        return;
      }

      // Create family
      const familyResult = await client.query(
        `INSERT INTO families (name, owner_id)
         VALUES ($1, $2)
         RETURNING id`,
        [familyName, userId],
      );
      const familyId = familyResult.rows[0].id;

      // Create owner member
      const ownerMember = members.find((m: any) => m.is_owner);
      const ownerResult = await client.query(
        `INSERT INTO family_members (family_id, user_id, name, role, email, color_index, is_owner, invite_status)
         VALUES ($1, $2, $3, $4, $5, $6, true, 'accepted')
         RETURNING id`,
        [
          familyId,
          userId,
          ownerMember?.name || req.user!.email,
          ownerMember?.role || "adult",
          ownerMember?.email || req.user!.email,
          ownerMember?.color_index ?? 1,
        ],
      );
      const ownerDbId = ownerResult.rows[0].id;

      const idMap: Record<string, string> = {};
      if (ownerMember?.local_id) {
        idMap[ownerMember.local_id] = ownerDbId;
      }

      // Other members
      const otherMembers = members.filter((m: any) => !m.is_owner);
      for (const m of otherMembers) {
        const result = await client.query(
          `INSERT INTO family_members (family_id, name, role, email, color_index, is_owner, invite_status)
           VALUES ($1, $2, $3, $4, $5, false, $6)
           RETURNING id`,
          [
            familyId,
            m.name,
            m.role,
            m.email || null,
            m.color_index ?? 0,
            m.role === "adult" ? "pending" : null,
          ],
        );
        if (m.local_id) {
          idMap[m.local_id] = result.rows[0].id;
        }
      }

      // Default task categories
      const defaultCategories = ["Home", "School", "Work", "Health", "Errands"];
      for (const name of defaultCategories) {
        await client.query(
          `INSERT INTO task_categories (family_id, name) VALUES ($1, $2)`,
          [familyId, name],
        );
      }

      await client.query("COMMIT");

      res.json({
        familyId,
        ownerMemberId: ownerDbId,
        memberIdMap: idMap,
        alreadyExisted: false,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Onboarding error:", err);
      res.status(500).json({ error: err?.message || "Onboarding failed" });
    } finally {
      client.release();
    }
  },
);

export default router;
