// Centralized environment / secret access for the API.
//
// Importing this module asserts that required secrets are present in
// production, so the server fails fast at boot rather than silently signing
// tokens with a publicly-known fallback value. In development a clearly
// labelled insecure fallback is used so local/E2E flows keep working.

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Refusing to start: ${name} must be set in production.`);
  }
  console.warn(
    `[env] ${name} is not set — using an INSECURE development fallback. ` +
      `Set ${name} before deploying.`,
  );
  return devFallback;
}

export const JWT_SECRET = requireSecret(
  "JWT_SECRET",
  "dev-only-insecure-jwt-secret",
);

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";

// Comma-separated allowlist of browser origins permitted by CORS. Falls back
// to the production domain plus local dev / Capacitor origins.
export const corsOrigins = (
  process.env.CORS_ORIGINS ||
  "https://gethomebase.dev,http://localhost:8080,capacitor://localhost"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
