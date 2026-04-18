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

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001", 10);

app.use(cors({ origin: true, credentials: true }));
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
