import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// 96-bit IV, the recommended length for GCM. Decrypt reads the IV from the
// stored message, so payloads written with the previous 16-byte IV still
// decrypt fine.
const IV_LENGTH = 12;
const KEY_LENGTH = 32; // aes-256 = 32-byte key

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required");
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${buf.length} bytes`,
    );
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Store as iv:authTag:ciphertext (all base64)
  return [iv.toString("base64"), authTag.toString("base64"), encrypted].join(
    ":",
  );
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext: expected iv:authTag:data");
  }
  const [ivB64, authTagB64, encrypted] = parts;

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
