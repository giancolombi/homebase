// Husky's documented prod/CI-safe install shim: `pnpm install --prod`
// (Docker images) and CI have no husky binary, and git hooks are useless
// there anyway — skip instead of failing the install.
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  process.exit(0);
}

const husky = (await import("husky")).default;
console.log(husky());
