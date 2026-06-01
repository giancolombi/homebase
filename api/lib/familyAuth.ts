import type { Response } from "express";
import pool from "../db.js";
import type { AuthRequest } from "../auth.js";

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

  const result = await pool.query(
    `SELECT 1 FROM family_members
     WHERE family_id = $1 AND user_id = $2
     LIMIT 1`,
    [familyId, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(403).json({ error: "Not a member of this family" });
    return null;
  }

  return familyId;
}

/**
 * Look up the caller's membership row in a family. Returns the owner/admin
 * flags, or null if the user is not a member.
 */
export async function getFamilyMembership(
  userId: string,
  familyId: string,
): Promise<{ isOwner: boolean; isAdmin: boolean } | null> {
  const result = await pool.query(
    `SELECT is_owner, is_admin FROM family_members
     WHERE family_id = $1 AND user_id = $2
     LIMIT 1`,
    [familyId, userId],
  );
  if (result.rows.length === 0) return null;
  return {
    isOwner: !!result.rows[0].is_owner,
    isAdmin: !!result.rows[0].is_admin,
  };
}

/**
 * Like resolveFamilyId, but also requires the caller to be an owner or admin
 * of the family. Returns the familyId or null when a 4xx has been sent.
 */
export async function resolveFamilyAdmin(
  req: AuthRequest,
  res: Response,
): Promise<string | null> {
  const familyId = await resolveFamilyId(req, res);
  if (!familyId) return null;
  const membership = await getFamilyMembership(req.user!.id, familyId);
  if (!membership || (!membership.isOwner && !membership.isAdmin)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return familyId;
}

/**
 * Verify the caller can access a calendar connection: the connection must
 * exist and belong to a family the caller is a member of. Returns the
 * connection's family/member/provider, or null when not accessible.
 */
export async function verifyConnectionAccess(
  userId: string,
  connectionId: string,
): Promise<{ familyId: string; memberId: string; provider: string } | null> {
  const result = await pool.query(
    `SELECT cc.family_id, cc.member_id, cc.provider
     FROM calendar_connections cc
     JOIN family_members fm
       ON fm.family_id = cc.family_id AND fm.user_id = $2
     WHERE cc.id = $1
     LIMIT 1`,
    [connectionId, userId],
  );
  if (result.rows.length === 0) return null;
  return {
    familyId: result.rows[0].family_id,
    memberId: result.rows[0].member_id,
    provider: result.rows[0].provider,
  };
}
