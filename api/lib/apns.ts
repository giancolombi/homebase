import http2 from "node:http2";
import jwt from "jsonwebtoken";

// Minimal APNs (Apple Push Notification service) HTTP/2 provider client using a
// token-based (.p8) connection. Configured entirely from env; if the key isn't
// present every send is a logged no-op so the rest of the app is unaffected.
//
// Required env to actually deliver:
//   APNS_KEY         the .p8 private key contents (PEM; \n-escaped is fine)
//   APNS_KEY_ID      the key's 10-char Key ID
//   APNS_TEAM_ID     your Apple Developer Team ID
//   APNS_BUNDLE_ID   the app bundle id (apns-topic)
//   APNS_PRODUCTION  "true" for the production gateway, else sandbox

interface ApnsConfig {
  key: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  host: string;
}

function getConfig(): ApnsConfig | null {
  const key = process.env.APNS_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!key || !keyId || !teamId || !bundleId) return null;
  return {
    key: key.replace(/\\n/g, "\n"),
    keyId,
    teamId,
    bundleId,
    host:
      process.env.APNS_PRODUCTION === "true"
        ? "https://api.push.apple.com"
        : "https://api.sandbox.push.apple.com",
  };
}

export function isApnsConfigured(): boolean {
  return getConfig() !== null;
}

// Provider auth tokens are valid up to 60 min; cache and reuse for ~50.
let cached: { token: string; iatSec: number } | null = null;
function providerToken(cfg: ApnsConfig, nowMs: number): string {
  const nowSec = Math.floor(nowMs / 1000);
  if (cached && nowSec - cached.iatSec < 3000) return cached.token;
  const token = jwt.sign({ iss: cfg.teamId, iat: nowSec }, cfg.key, {
    algorithm: "ES256",
    header: { alg: "ES256", kid: cfg.keyId },
  });
  cached = { token, iatSec: nowSec };
  return token;
}

export interface ApnsResult {
  ok: boolean;
  status: number;
  reason?: string;
}

export interface ApnsPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function sendApns(
  deviceToken: string,
  payload: ApnsPayload,
  nowMs: number,
): Promise<ApnsResult> {
  const cfg = getConfig();
  if (!cfg)
    return Promise.resolve({ ok: false, status: 0, reason: "not_configured" });

  return new Promise((resolve) => {
    const client = http2.connect(cfg.host);
    let settled = false;
    const done = (r: ApnsResult) => {
      if (settled) return;
      settled = true;
      client.close();
      resolve(r);
    };
    client.on("error", () =>
      done({ ok: false, status: 0, reason: "connection_error" }),
    );

    const body = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
      },
      ...(payload.data ?? {}),
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken(cfg, nowMs)}`,
      "apns-topic": cfg.bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });

    let status = 0;
    let data = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]) || 0;
    });
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      let reason: string | undefined;
      try {
        if (data) reason = JSON.parse(data).reason;
      } catch {
        /* ignore non-JSON body */
      }
      done({ ok: status === 200, status, reason });
    });
    req.on("error", () =>
      done({ ok: false, status: 0, reason: "request_error" }),
    );
    req.end(body);
  });
}
