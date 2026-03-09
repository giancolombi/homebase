// API client — replaces Supabase client
// All requests go to /api/* which Vite proxies to the Express server in dev

const TOKEN_KEY = "homebase-auth-token";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || res.statusText || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

// ---- Auth API ----

export const auth = {
  async signUp(email: string, password: string, fullName?: string) {
    const data = await request<{ user: AuthUser; token: string }>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      },
    );
    setToken(data.token);
    return data;
  },

  async signIn(email: string, password: string) {
    const data = await request<{ user: AuthUser; token: string }>(
      "/api/auth/signin",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    setToken(data.token);
    return data;
  },

  async getSession(): Promise<{ user: AuthUser } | null> {
    const token = getToken();
    if (!token) return null;
    // Demo mode — skip the API call and return a fake user
    if (token === "demo-token") {
      return {
        user: {
          id: "demo-user",
          email: "alex@example.com",
          full_name: "Alex Johnson",
        },
      };
    }
    try {
      return await request<{ user: AuthUser }>("/api/auth/me");
    } catch {
      clearToken();
      return null;
    }
  },

  async signOut() {
    clearToken();
  },

  async requestPasswordReset(email: string) {
    return request<{ message: string; resetToken?: string }>(
      "/api/auth/request-reset",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },

  async resetPassword(token: string, password: string) {
    return request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  async updatePassword(password: string) {
    return request<{ message: string }>("/api/auth/update-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  /** Check if a token is stored */
  hasToken(): boolean {
    return !!getToken();
  },
};

// ---- Onboarding API ----

export interface OnboardingPayload {
  profile: {
    display_name: string;
    color_index: number;
  };
  familyName: string;
  members: Array<{
    local_id: string;
    name: string;
    role: string;
    email?: string;
    color_index: number;
    is_owner: boolean;
  }>;
  calendarConnections: Array<{
    member_id: string;
    provider: string;
    email?: string;
    connected: boolean;
  }>;
}

export const onboarding = {
  async complete(payload: OnboardingPayload) {
    return request<{
      familyId: string;
      ownerMemberId: string;
      memberIdMap: Record<string, string>;
    }>("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
