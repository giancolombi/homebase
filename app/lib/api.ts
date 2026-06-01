// API client — replaces Supabase client
// All requests go to /api/* which Vite proxies to the Express server in dev

const TOKEN_KEY = "homebase-auth-token";

// Base URL for /api/* requests.
//
// Web (production + dev): relative paths resolve against the current origin
// (gethomebase.dev in prod, localhost:8080 in dev with the Vite proxy).
//
// iOS Capacitor: the WebView origin is `capacitor://localhost`, so relative
// `/api/...` URLs would 404. setApiBaseUrl() is called from capacitorBoot
// at app start to point fetch() at https://gethomebase.dev. Pulled out into
// a setter rather than a build-time env var so the same dist/ bundle works
// both as the live web app and as the iOS WebView payload.
let apiBaseUrl = "";

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  familyId?: string | null;
  onboardingComplete?: boolean;
}

// Pluggable token storage. The web build reads/writes localStorage; the iOS
// (Capacitor) build can swap in a Keychain-backed adapter at boot time so
// the JWT lands in Secure Enclave-backed storage instead of the WebView.
export interface TokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

const localStorageTokenStorage: TokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let tokenStorage: TokenStorage = localStorageTokenStorage;

export function setTokenStorage(impl: TokenStorage) {
  tokenStorage = impl;
}

function getToken(): string | null {
  return tokenStorage.get();
}

function setToken(token: string) {
  tokenStorage.set(token);
}

function clearToken() {
  tokenStorage.clear();
}

async function request<T = unknown>(
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

  // Prefix the absolute base URL when one is configured (Capacitor iOS).
  // On web, apiBaseUrl is "" so the path stays relative.
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  const res = await fetch(url, {
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

  async updatePassword(currentPassword: string, password: string) {
    const data = await request<{ message: string; token?: string }>(
      "/api/auth/update-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, password }),
      },
    );
    // The server reissues a token (old sessions are invalidated); keep this
    // session signed in by swapping to the fresh token.
    if (data.token) setToken(data.token);
    return data;
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

  async finish() {
    return request<{ ok: true }>("/api/onboarding/finish", {
      method: "POST",
    });
  },
};

// ---- Calendar API ----

export interface CalendarConnectionResponse {
  id: string;
  memberId: string;
  provider: string;
  email: string;
  externalEmail: string | null;
  connected: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  // Set when the iOS EventKit sync has auto-paused this connection because
  // its calendar is already covered by the device-wide EventKit feed.
  // null = not paused. Distinguishes "auto-paused by EventKit" from
  // "user explicitly disconnected" so the API can restore on EventKit
  // disconnect.
  pausedAt: string | null;
}

export interface CalendarEventResponse {
  id: string;
  memberId: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: string;
  source: "homebase" | "google" | "outlook";
  allDay?: boolean;
  location?: string;
}

export const calendar = {
  getAuthUrl(provider: string, familyId: string, returnTo?: string): string {
    const token = getToken();
    const params = new URLSearchParams({
      familyId,
      token: token || "",
    });
    if (returnTo) params.set("returnTo", returnTo);
    // Same base-URL logic as request() — Capacitor needs an absolute URL
    // so SafariViewController can navigate to the OAuth provider.
    return `${apiBaseUrl}/api/calendar/auth/${provider}?${params.toString()}`;
  },

  async getConnections(
    familyId: string,
  ): Promise<CalendarConnectionResponse[]> {
    return request<CalendarConnectionResponse[]>(
      `/api/calendar/connections?familyId=${familyId}`,
    );
  },

  async syncConnection(connectionId: string): Promise<{ syncedCount: number }> {
    return request<{ syncedCount: number }>(
      `/api/calendar/sync/${connectionId}`,
      { method: "POST" },
    );
  },

  async getEvents(
    familyId: string,
    startDate: string,
    endDate: string,
  ): Promise<CalendarEventResponse[]> {
    return request<CalendarEventResponse[]>(
      `/api/calendar/events?familyId=${familyId}&startDate=${startDate}&endDate=${endDate}`,
    );
  },

  async deleteConnection(connectionId: string): Promise<void> {
    await request(`/api/calendar/connections/${connectionId}`, {
      method: "DELETE",
    });
  },

  async connectApple(
    familyId: string,
    appleId: string,
    appPassword: string,
  ): Promise<{ ok: true; externalEmail: string }> {
    return request<{ ok: true; externalEmail: string }>(
      "/api/calendar/apple/connect",
      {
        method: "POST",
        body: JSON.stringify({ familyId, appleId, appPassword }),
      },
    );
  },
  async syncEventKit(
    familyId: string,
    events: Array<{
      externalId: string;
      title: string;
      description?: string | null;
      date: string;
      startTime?: string | null;
      endTime?: string | null;
      allDay?: boolean;
      location?: string | null;
      sourceTitle?: string | null;
    }>,
  ): Promise<{ ok: true; count: number; connectionId: string }> {
    return request<{ ok: true; count: number; connectionId: string }>(
      "/api/calendar/eventkit/sync",
      {
        method: "POST",
        body: JSON.stringify({ familyId, events }),
      },
    );
  },
};

// ---- Devices API (push tokens) ----

export const devices = {
  async register(
    token: string,
    platform: "ios" | "android",
    appVersion?: string,
  ): Promise<{ ok: true }> {
    return request<{ ok: true }>("/api/devices/register", {
      method: "POST",
      body: JSON.stringify({ token, platform, appVersion }),
    });
  },
  async unregister(token: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/devices/${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  },
};

// ---- Invite API ----

export const invite = {
  async send(
    email: string,
    familyId: string,
  ): Promise<{ message: string; email?: string }> {
    return request<{ message: string; email?: string }>("/api/invite/send", {
      method: "POST",
      body: JSON.stringify({ email, familyId }),
    });
  },

  async verify(token: string): Promise<{
    email: string;
    familyName: string;
    memberName: string;
    hasExistingAccount?: boolean;
    currentFamily?: string | null;
    isOwnerOfCurrentFamily?: boolean;
  }> {
    return request(`/api/invite/verify?token=${token}`);
  },

  async accept(
    token: string,
    userId: string,
  ): Promise<{ familyId: string; memberId: string }> {
    return request<{ familyId: string; memberId: string }>(
      "/api/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token, userId }),
      },
    );
  },
};

// ---- Family API ----

export interface FamilyMemberResponse {
  id: string;
  name: string;
  role: string;
  email: string | null;
  colorIndex: number;
  isOwner: boolean;
  isAdmin: boolean;
  inviteStatus: string | null;
  inviteSentAt: string | null;
  hasAccount: boolean;
}

export const family = {
  async addMember(data: {
    familyId: string;
    name: string;
    role: string;
    email?: string;
    colorIndex: number;
  }): Promise<{ id: string }> {
    return request<{ id: string }>("/api/family/members", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMembers(familyId: string): Promise<FamilyMemberResponse[]> {
    return request<FamilyMemberResponse[]>(
      `/api/family/members?familyId=${familyId}`,
    );
  },

  async updateMember(
    familyId: string,
    memberId: string,
    updates: {
      name?: string;
      email?: string | null;
      colorIndex?: number;
      role?: string;
    },
  ): Promise<FamilyMemberResponse> {
    return request<FamilyMemberResponse>(`/api/family/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, familyId }),
    });
  },

  async removeMember(memberId: string): Promise<void> {
    await request(`/api/family/members/${memberId}`, { method: "DELETE" });
  },

  async toggleAdmin(memberId: string): Promise<{ isAdmin: boolean }> {
    return request<{ isAdmin: boolean }>(
      `/api/family/members/${memberId}/toggle-admin`,
      { method: "POST" },
    );
  },
};

// ---- Tasks API ----

export interface TaskCategoryResponse {
  id: string;
  name: string;
  icon: string | null;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  deadline: string | null;
  deadlineTime: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  status: "todo" | "in-progress" | "done";
  assignedTo: string[];
  createdAt: string;
}

export const tasks = {
  list(familyId: string): Promise<TaskResponse[]> {
    return request<TaskResponse[]>(`/api/tasks?familyId=${familyId}`);
  },
  create(
    familyId: string,
    task: Omit<TaskResponse, "id" | "createdAt">,
  ): Promise<TaskResponse> {
    return request<TaskResponse>(`/api/tasks`, {
      method: "POST",
      body: JSON.stringify({ ...task, familyId }),
    });
  },
  update(
    familyId: string,
    id: string,
    updates: Partial<TaskResponse>,
  ): Promise<TaskResponse> {
    return request<TaskResponse>(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, familyId }),
    });
  },
  remove(familyId: string, id: string): Promise<void> {
    return request(`/api/tasks/${id}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },

  listCategories(familyId: string): Promise<TaskCategoryResponse[]> {
    return request<TaskCategoryResponse[]>(
      `/api/tasks/categories?familyId=${familyId}`,
    );
  },
  createCategory(
    familyId: string,
    name: string,
    icon?: string,
  ): Promise<TaskCategoryResponse> {
    return request<TaskCategoryResponse>(`/api/tasks/categories`, {
      method: "POST",
      body: JSON.stringify({ familyId, name, icon }),
    });
  },
};

// ---- Meals API ----

export interface RecipeResponse {
  id: string;
  title: string;
  description: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  tags: string[];
  ingredients: unknown[];
  steps: string[];
}

export interface MealPlanResponse {
  id: string;
  recipeId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
}

export interface ShoppingItemResponse {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
  checked: boolean;
}

export const meals = {
  listRecipes(familyId: string): Promise<RecipeResponse[]> {
    return request<RecipeResponse[]>(`/api/meals/recipes?familyId=${familyId}`);
  },
  createRecipe(
    familyId: string,
    r: Omit<RecipeResponse, "id">,
  ): Promise<RecipeResponse> {
    return request<RecipeResponse>(`/api/meals/recipes`, {
      method: "POST",
      body: JSON.stringify({ ...r, familyId }),
    });
  },
  updateRecipe(
    familyId: string,
    id: string,
    updates: Partial<RecipeResponse>,
  ): Promise<RecipeResponse> {
    return request<RecipeResponse>(`/api/meals/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, familyId }),
    });
  },
  removeRecipe(familyId: string, id: string): Promise<void> {
    return request(`/api/meals/recipes/${id}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },

  listPlan(familyId: string): Promise<MealPlanResponse[]> {
    return request<MealPlanResponse[]>(`/api/meals/plan?familyId=${familyId}`);
  },
  addPlanEntry(
    familyId: string,
    entry: Omit<MealPlanResponse, "id">,
  ): Promise<MealPlanResponse> {
    return request<MealPlanResponse>(`/api/meals/plan`, {
      method: "POST",
      body: JSON.stringify({ ...entry, familyId }),
    });
  },
  removePlanEntry(familyId: string, id: string): Promise<void> {
    return request(`/api/meals/plan/${id}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },

  listShopping(familyId: string): Promise<ShoppingItemResponse[]> {
    return request<ShoppingItemResponse[]>(
      `/api/meals/shopping?familyId=${familyId}`,
    );
  },
  replaceShopping(
    familyId: string,
    items: Array<Omit<ShoppingItemResponse, "id">>,
  ): Promise<void> {
    return request(`/api/meals/shopping`, {
      method: "PUT",
      body: JSON.stringify({ familyId, items }),
    });
  },
  toggleShopping(
    familyId: string,
    id: string,
    checked: boolean,
  ): Promise<void> {
    return request(`/api/meals/shopping/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ familyId, checked }),
    });
  },
};

// ---- Finance API ----

export interface BankAccountResponse {
  id: string;
  name: string;
  institution: string;
  balance: number;
  isFeatured: boolean;
  savingsGoal?: number;
  monthlyBalances: { month: string; balance: number }[];
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export const finance = {
  listAccounts(familyId: string): Promise<BankAccountResponse[]> {
    return request<BankAccountResponse[]>(
      `/api/finance/accounts?familyId=${familyId}`,
    );
  },
  createAccount(
    familyId: string,
    a: Omit<BankAccountResponse, "id">,
  ): Promise<BankAccountResponse> {
    return request<BankAccountResponse>(`/api/finance/accounts`, {
      method: "POST",
      body: JSON.stringify({ ...a, familyId }),
    });
  },
  updateAccount(
    familyId: string,
    id: string,
    updates: Partial<BankAccountResponse>,
  ): Promise<BankAccountResponse> {
    return request<BankAccountResponse>(`/api/finance/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, familyId }),
    });
  },
  removeAccount(familyId: string, id: string): Promise<void> {
    return request(`/api/finance/accounts/${id}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },

  listTransactions(familyId: string): Promise<TransactionResponse[]> {
    return request<TransactionResponse[]>(
      `/api/finance/transactions?familyId=${familyId}`,
    );
  },
  createTransaction(
    familyId: string,
    t: Omit<TransactionResponse, "id">,
  ): Promise<TransactionResponse> {
    return request<TransactionResponse>(`/api/finance/transactions`, {
      method: "POST",
      body: JSON.stringify({ ...t, familyId }),
    });
  },
  updateTransaction(
    familyId: string,
    id: string,
    updates: Partial<TransactionResponse>,
  ): Promise<TransactionResponse> {
    return request<TransactionResponse>(`/api/finance/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, familyId }),
    });
  },
  removeTransaction(familyId: string, id: string): Promise<void> {
    return request(`/api/finance/transactions/${id}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },
};

// ---- Plaid (bank linking) API ----

export interface PlaidItemResponse {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  lastSyncedAt: string | null;
  syncError: string | null;
  createdAt: string;
}

export const plaid = {
  async createLinkToken(familyId: string): Promise<{ linkToken: string }> {
    return request<{ linkToken: string }>(`/api/plaid/link-token`, {
      method: "POST",
      body: JSON.stringify({ familyId }),
    });
  },
  async exchange(
    familyId: string,
    publicToken: string,
    institution?: { institution_id?: string; name?: string },
  ): Promise<{ itemId: string }> {
    return request<{ itemId: string }>(`/api/plaid/exchange`, {
      method: "POST",
      body: JSON.stringify({ familyId, publicToken, institution }),
    });
  },
  async sync(
    familyId: string,
    itemId: string,
  ): Promise<{ added: number; modified: number; removed: number }> {
    return request<{ added: number; modified: number; removed: number }>(
      `/api/plaid/sync/${itemId}`,
      {
        method: "POST",
        body: JSON.stringify({ familyId }),
      },
    );
  },
  async listItems(familyId: string): Promise<PlaidItemResponse[]> {
    return request<PlaidItemResponse[]>(
      `/api/plaid/items?familyId=${familyId}`,
    );
  },
  async removeItem(familyId: string, itemId: string): Promise<void> {
    return request(`/api/plaid/items/${itemId}?familyId=${familyId}`, {
      method: "DELETE",
    });
  },
};
