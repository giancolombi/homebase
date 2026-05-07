// Lightweight migration runner. Executes every api/migrations/*.sql file
// in lexicographic order against $DATABASE_URL using the existing pg driver,
// so we don't need psql in the production image. Each migration in this repo
// is written to be idempotent (IF NOT EXISTS, COALESCE on backfill, etc.),
// so re-running them every deploy is safe and fast.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "api", "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Both Railway services (api + frontend) share the repo-root railway.json
    // and both run this command during pre-deploy. Only the api service has
    // DATABASE_URL — silently skip on the frontend so its deploy doesn't fail.
    console.log("DATABASE_URL not set; skipping migrations.");
    return;
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations to run.");
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Running ${file}`);
      await client.query(sql);
    }
    console.log(`Applied ${files.length} migration file(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
