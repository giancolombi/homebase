import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.js";
import pool from "./db.js";
import { resolveFamilyId } from "./lib/familyAuth.js";

const router = Router();

// GET /api/foodlab/ratings?familyId= — all ratings for the family
router.get("/ratings", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const result = await pool.query(
      `SELECT member_id, dish, version, rating, notes, rated_on::text AS rated_on
       FROM foodlab_ratings WHERE family_id = $1`,
      [familyId],
    );
    res.json(
      result.rows.map((r) => ({
        memberId: r.member_id,
        dish: r.dish,
        version: r.version,
        rating: r.rating,
        notes: r.notes,
        date: r.rated_on,
      })),
    );
  } catch (err) {
    console.error("Get foodlab ratings error:", err);
    res.status(500).json({ error: "Failed to get ratings" });
  }
});

// PUT /api/foodlab/ratings — upsert one rating (per member, dish, version)
router.put("/ratings", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { memberId, dish, version, rating, notes } = req.body as {
    memberId?: string;
    dish?: string;
    version?: string;
    rating?: number;
    notes?: string;
  };
  if (!dish || (version !== "veg" && version !== "meat")) {
    res.status(400).json({ error: "dish and version (veg|meat) are required" });
    return;
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1–5" });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO foodlab_ratings
         (family_id, member_id, dish, version, rating, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (family_id, member_id, dish, version)
       DO UPDATE SET rating = $5, notes = $6, rated_on = now()`,
      [familyId, memberId ?? null, dish, version, rating, notes ?? ""],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Upsert foodlab rating error:", err);
    res.status(500).json({ error: "Failed to save rating" });
  }
});

// GET /api/foodlab/dietary?familyId= — per-member dietary restrictions map
router.get("/dietary", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  try {
    const result = await pool.query(
      `SELECT member_id, restrictions FROM member_dietary WHERE family_id = $1`,
      [familyId],
    );
    const map: Record<string, unknown> = {};
    for (const row of result.rows) map[row.member_id] = row.restrictions;
    res.json(map);
  } catch (err) {
    console.error("Get dietary error:", err);
    res.status(500).json({ error: "Failed to get dietary restrictions" });
  }
});

// PUT /api/foodlab/dietary — upsert one member's restrictions
router.put("/dietary", requireAuth, async (req: AuthRequest, res: Response) => {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return;
  const { memberId, restrictions } = req.body as {
    memberId?: string;
    restrictions?: unknown;
  };
  if (!memberId || typeof restrictions !== "object" || restrictions === null) {
    res.status(400).json({ error: "memberId and restrictions are required" });
    return;
  }
  try {
    // Member must belong to this family.
    const member = await pool.query(
      `SELECT 1 FROM family_members WHERE id = $1 AND family_id = $2`,
      [memberId, familyId],
    );
    if (member.rows.length === 0) {
      res.status(400).json({ error: "Member not in family" });
      return;
    }
    await pool.query(
      `INSERT INTO member_dietary (member_id, family_id, restrictions, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (member_id)
       DO UPDATE SET restrictions = $3, updated_at = now()`,
      [memberId, familyId, JSON.stringify(restrictions)],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Upsert dietary error:", err);
    res.status(500).json({ error: "Failed to save dietary restrictions" });
  }
});

export default router;
