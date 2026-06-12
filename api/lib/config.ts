import "./env.js";

// Fail fast: signing auth tokens with a guessable default would let anyone
// forge a session for any user. Every consumer must import JWT_SECRET from
// here instead of reading process.env with an inline fallback.
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error(
    "JWT_SECRET is not set. Add it to .env (dev) or the service environment (production).",
  );
}

export const JWT_SECRET: string = secret;

export const APP_URL = process.env.APP_URL || "http://localhost:8080";
