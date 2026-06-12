import type { Response } from "express";
import pool from "../db.js";
import type { AuthRequest } from "../auth.js";

/**
 * Check whether a user belongs to a family. Authorization for any
 * family-scoped resource must go through this (directly or via
 * resolveFamilyId) — knowing a UUID is never enough.
 */
export async function isFamilyMember(
  userId: string,
  familyId: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM family_members
     WHERE family_id = $1 AND user_id = $2
     LIMIT 1`,
    [familyId, userId],
  );
  return result.rows.length > 0;
}

/**
 * Resolve a familyId from the request (query or body) and verify that the
 * authenticated user is a member of that family. Returns the familyId when
 * the check passes, or null when a response has already been sent (400/403).
 *
 * Routes should use it like:
 *
 *   const familyId = await resolveFamilyId(req, res);
 *   if (!familyId) return;
 */
export async function resolveFamilyId(
  req: AuthRequest,
  res: Response,
): Promise<string | null> {
  const familyId =
    (req.query.familyId as string | undefined) ||
    (req.body && typeof req.body === "object"
      ? (req.body as { familyId?: string }).familyId
      : undefined);

  if (!familyId) {
    res.status(400).json({ error: "familyId is required" });
    return null;
  }
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  if (!(await isFamilyMember(req.user.id, familyId))) {
    res.status(403).json({ error: "Not a member of this family" });
    return null;
  }

  return familyId;
}
