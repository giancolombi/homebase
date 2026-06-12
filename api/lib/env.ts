// Load .env into process.env for local development. Node's loadEnvFile never
// overrides variables that are already set, so Docker/Railway environment
// variables always win, and production (where no .env file exists) is a
// no-op. Import this before any module that reads process.env at import time
// (db.ts, config.ts).
import fs from "node:fs";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}
