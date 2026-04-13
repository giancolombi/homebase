import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const API_URL = new URL(process.env.API_URL || "http://api:3001");

// Proxy /api requests to the backend service using Node's built-in http
app.use("/api", (req, res) => {
  const proxyReq = http.request(
    {
      hostname: API_URL.hostname,
      port: API_URL.port,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: API_URL.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Backend unavailable" });
    }
  });

  req.pipe(proxyReq, { end: true });
});

// Serve static frontend files
const distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback -- serve index.html for all non-file routes
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});
