import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

function getProviderConfig(provider: string): OAuthConfig {
  if (provider === "google") {
    return {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3001/api/calendar/callback/google",
    };
  }

  if (provider === "outlook") {
    return {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2/token",
      scopes: ["Calendars.Read", "User.Read", "offline_access"],
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      redirectUri:
        process.env.MICROSOFT_REDIRECT_URI ||
        "http://localhost:3001/api/calendar/callback/outlook",
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function createOAuthState(data: {
  userId: string;
  memberId: string;
  familyId: string;
  provider: string;
}): string {
  return jwt.sign(data, JWT_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): {
  userId: string;
  memberId: string;
  familyId: string;
  provider: string;
} {
  return jwt.verify(state, JWT_SECRET) as any;
}

export function getAuthUrl(provider: string, state: string): string {
  const config = getProviderConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline", // Google: get refresh token
    prompt: "consent", // Google: always show consent to get refresh token
  });

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCode(
  provider: string,
  code: string,
): Promise<TokenResponse> {
  const config = getProviderConfig(provider);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  provider: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const config = getProviderConfig(provider);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function getUserEmail(
  provider: string,
  accessToken: string,
): Promise<string> {
  if (provider === "google") {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as { email: string };
    return data.email;
  }

  if (provider === "outlook") {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as {
      mail?: string;
      userPrincipalName: string;
    };
    return data.mail || data.userPrincipalName;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
