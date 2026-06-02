import pool from "../db.js";
import { sendApns, isApnsConfigured, type ApnsPayload } from "./apns.js";

// Fan a push notification out to a set of users' registered devices. APNs-only
// for now (the iOS app). No-ops when APNs isn't configured. Tokens APNs reports
// as dead are pruned. Safe to call fire-and-forget — never throws.
export async function notifyUsers(
  userIds: string[],
  payload: ApnsPayload,
): Promise<void> {
  try {
    if (!isApnsConfigured() || userIds.length === 0) return;
    const r = await pool.query(
      `SELECT token, platform FROM device_tokens WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    );
    const now = Date.now();
    for (const row of r.rows) {
      if (row.platform !== "ios") continue; // only APNs implemented
      const res = await sendApns(row.token, payload, now);
      const dead =
        res.status === 410 ||
        res.reason === "BadDeviceToken" ||
        res.reason === "Unregistered";
      if (dead) {
        await pool
          .query(`DELETE FROM device_tokens WHERE token = $1`, [row.token])
          .catch(() => undefined);
      }
    }
  } catch (err) {
    console.warn("notifyUsers failed:", err);
  }
}

// Notify every account-holding member of a family, optionally excluding one
// user (typically the actor who triggered the event).
export async function notifyFamily(
  familyId: string,
  exceptUserId: string | null,
  payload: ApnsPayload,
): Promise<void> {
  try {
    const r = await pool.query(
      `SELECT DISTINCT user_id FROM family_members
       WHERE family_id = $1 AND user_id IS NOT NULL
         AND ($2::uuid IS NULL OR user_id <> $2)`,
      [familyId, exceptUserId],
    );
    await notifyUsers(
      r.rows.map((x) => x.user_id),
      payload,
    );
  } catch (err) {
    console.warn("notifyFamily failed:", err);
  }
}

// Resolve the account-holding user IDs for a set of family member IDs (members
// can be children with no login, so some map to nothing).
export async function userIdsForMembers(
  memberIds: string[],
): Promise<string[]> {
  if (memberIds.length === 0) return [];
  const r = await pool.query(
    `SELECT user_id FROM family_members
     WHERE id = ANY($1::uuid[]) AND user_id IS NOT NULL`,
    [memberIds],
  );
  return r.rows.map((x) => x.user_id);
}
