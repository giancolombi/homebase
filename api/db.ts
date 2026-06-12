import "./lib/env.js";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/homebase";

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new pg.Pool({
  connectionString,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export default pool;
