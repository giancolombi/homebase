import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { PlaidApi } from "plaid";

// Verifies the `Plaid-Verification` header on incoming Plaid webhooks.
//
// Plaid signs each webhook with an ES256 JWT whose `request_body_sha256` claim
// is the SHA-256 of the exact request body. We:
//   1. read the key id (kid) from the JWT header,
//   2. fetch the matching public JWK from Plaid (cached per kid),
//   3. verify the JWT signature + freshness (<5 min),
//   4. confirm the body hash matches the raw bytes we received.
// Any failure → reject, so an attacker can't forge a webhook to force syncs.

const keyCache = new Map<string, string>(); // kid -> SPKI PEM

async function getVerificationPem(
  client: PlaidApi,
  kid: string,
): Promise<string | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;
  try {
    const resp = await client.webhookVerificationKeyGet({ key_id: kid });
    const jwk = resp.data.key;
    if (jwk.expired_at) return null; // rotated-out key — refuse
    const pem = crypto
      .createPublicKey({
        key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
        format: "jwk",
      })
      .export({ type: "spki", format: "pem" })
      .toString();
    keyCache.set(kid, pem);
    return pem;
  } catch (err) {
    console.error("Plaid webhook key fetch failed:", err);
    return null;
  }
}

export async function verifyPlaidWebhook(
  client: PlaidApi,
  verificationHeader: string | undefined,
  rawBody: Buffer | undefined,
): Promise<boolean> {
  if (!verificationHeader || !rawBody) return false;

  const decoded = jwt.decode(verificationHeader, { complete: true });
  if (!decoded || typeof decoded === "string") return false;
  const { alg, kid } = decoded.header;
  if (alg !== "ES256" || !kid) return false;

  const pem = await getVerificationPem(client, kid);
  if (!pem) return false;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(verificationHeader, pem, {
      algorithms: ["ES256"],
      maxAge: "5m",
    }) as jwt.JwtPayload;
  } catch {
    return false;
  }

  const expected = payload["request_body_sha256"];
  if (typeof expected !== "string") return false;

  const actual = crypto.createHash("sha256").update(rawBody).digest("hex");
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
