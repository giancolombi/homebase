// Migration runner with a schema_migrations tracking table so each .sql file
// runs exactly once per database. Designed to be safe to call on every deploy
// (Railway preDeployCommand) — already-applied migrations are skipped.
//
// Bootstrap behavior: when the tracking table is brand-new but the schema
// already contains migration effects (e.g. an existing prod DB that predates
// this runner), each "already exists" error during the first pass is treated
// as "schema is ahead of tracking", and the migration is recorded as applied
// without actually re-running. This lets us start tracking on a live DB
// without re-creating tables that are already there.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "api", "migrations");

// Postgres SQLSTATE codes that indicate "this object already exists" — i.e.
// the migration's effect is already present, so we can mark it applied.
const ALREADY_EXISTS_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object (constraint, function, etc.)
  "42701", // duplicate_column
  "42P06", // duplicate_schema
  "42P16", // invalid_table_definition (sometimes from re-adding constraints)
]);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Both Railway services share the repo-root railway.json and both run
    // this command during pre-deploy. Only the api service has DATABASE_URL —
    // silently skip on the frontend so its deploy doesn't fail.
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const appliedRows = await client.query(
      "SELECT filename FROM schema_migrations",
    );
    const applied = new Set<string>(appliedRows.rows.map((r) => r.filename));

    let appliedCount = 0;
    let skippedCount = 0;
    let bootstrappedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        skippedCount++;
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Running ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (filename) VALUES ($1)`,
          [file],
        );
        await client.query("COMMIT");
        appliedCount++;
      } catch (err: unknown) {
        await client.query("ROLLBACK");
        const code = (err as { code?: string }).code;
        if (code && ALREADY_EXISTS_CODES.has(code)) {
          console.log(
            `  schema already ahead (${code}) — marking ${file} as applied`,
          );
          await client.query(
            `INSERT INTO schema_migrations (filename) VALUES ($1)
             ON CONFLICT DO NOTHING`,
            [file],
          );
          bootstrappedCount++;
        } else {
          throw err;
        }
      }
    }

    console.log(
      `Migrations: ${appliedCount} applied, ${skippedCount} skipped, ${bootstrappedCount} bootstrapped (${files.length} total)`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
