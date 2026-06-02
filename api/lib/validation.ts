// Shared input-normalization / validation helpers for the API.

// Normalize an email for storage and lookup: trim surrounding whitespace and
// lowercase. Prevents "Gian@x.com" and "gian@x.com" from becoming distinct
// accounts and makes sign-in case-insensitive. Lookups should compare against
// lower(email) so pre-existing mixed-case rows still match.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Minimum password policy shared by signup / reset / change.
export const MIN_PASSWORD_LENGTH = 8;

export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  // Light complexity floor: at least one letter and one number. Avoids the
  // weakest passwords without forcing symbol/case rules that frustrate users.
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number";
  }
  return null;
}
