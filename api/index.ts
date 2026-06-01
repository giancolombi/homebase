import express from "express";
import cors from "cors";
import authRouter from "./auth.js";
import onboardingRouter from "./onboarding.js";
import calendarRouter from "./calendar.js";
import inviteRouter from "./invite.js";
import familyRouter from "./family.js";
import tasksRouter from "./tasks.js";
import mealsRouter from "./meals.js";
import financeRouter from "./finance.js";
import plaidRouter from "./plaid.js";
import devicesRouter from "./devices.js";
import { aasaHandler } from "./lib/aasa.js";
import { corsOrigins } from "./lib/env.js";
import pool from "./db.js";

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001", 10);

// Restrict CORS to an allowlist (production domain + local dev + Capacitor).
// Requests with no Origin header (native apps, curl, server-to-server) are
// allowed through; disallowed browser origins are rejected.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Capture the raw request body so signature-verified webhooks (Plaid) can hash
// the exact bytes Plaid signed, while still parsing JSON for every route.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  }),
);

// Health check — pings the database so a healthy process with a dead DB
// reports unhealthy.
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/invite", inviteRouter);
app.use("/api/family", familyRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/finance", financeRouter);
app.use("/api/plaid", plaidRouter);
app.use("/api/devices", devicesRouter);

// Apple App Site Association — enables iOS Universal Links to open the
// native Homebase app instead of Safari for /accept-invite, /reset-password,
// etc. Served from the API root, NOT under /api/ (Apple requires .well-known
// at the domain root).
app.get("/.well-known/apple-app-site-association", aasaHandler);
app.get("/apple-app-site-association", aasaHandler);

// Catch-all error handler so an async throw or body-parse failure returns a
// clean JSON 500 instead of crashing the process / leaking a stack trace.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err?.message === "Not allowed by CORS") {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
