import "./lib/env.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
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

const app = express();
// The frontend's proxy (serve.ts API_URL) targets this fixed port over
// Railway private networking — it must always be bound.
const PRIVATE_PORT = parseInt(process.env.API_PORT || "3001", 10);
// Railway injects PORT and probes it for deploy healthchecks. When it
// differs from the private port, we listen on both: binding only PORT
// breaks the proxy (502s), binding only 3001 fails the healthcheck and
// rolls the deploy back.
const HEALTHCHECK_PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : PRIVATE_PORT;

// Railway terminates TLS at its proxy; trust one hop so req.ip (used by the
// auth rate limiter) is the client address, not the proxy's.
app.set("trust proxy", 1);

// Only browser origins we actually serve. Requests without an Origin header
// (the iOS app's native fetch, curl, server-to-server) are not subject to
// CORS and pass through. Extra origins can be added via CORS_ORIGINS
// (comma-separated) without a code change.
const allowedOrigins = new Set(
  [
    process.env.APP_URL,
    "http://localhost:8080",
    "capacitor://localhost", // Capacitor iOS WebView
    "http://localhost", // Capacitor Android WebView
    ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  ]
    .filter((origin): origin is string => !!origin)
    .map((origin) => origin.trim().replace(/\/$/, "")),
);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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

// Unknown API routes get a JSON 404 instead of Express's HTML default.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler. Express 5 forwards rejected promises from async
// handlers here; log the real error server-side, return a generic 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PRIVATE_PORT, () => {
  console.log(`API server running on http://localhost:${PRIVATE_PORT}`);
});

if (HEALTHCHECK_PORT !== PRIVATE_PORT) {
  app.listen(HEALTHCHECK_PORT, () => {
    console.log(`Healthcheck listener on http://localhost:${HEALTHCHECK_PORT}`);
  });
}

export default app;
