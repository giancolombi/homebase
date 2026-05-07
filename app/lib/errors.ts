// Mirror of api/lib/errors.ts for the frontend bundle.
export function errorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}
