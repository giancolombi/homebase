import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const API_URL = process.env.API_URL || "http://api:3001";

// Proxy /api requests to the backend service
app.use(
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathFilter: "/api",
  })
);

// Serve static frontend files
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback -- serve index.html for all non-file routes
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});
