// Tiny helpers for working with caught errors. With strict TypeScript and
// useUnknownInCatchVariables, `catch (err)` types err as `unknown`, so
// accessing .message directly errors. These narrow safely.

export function errorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
