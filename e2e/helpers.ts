import { type Page } from "@playwright/test";

/** Generate a unique email for test isolation */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export const TEST_PASSWORD = "testpass123";
export const TEST_NAME = "Test User";

/** Sign up a new user and return their email */
export async function signUp(
  page: Page,
  options?: { email?: string; password?: string; name?: string },
): Promise<string> {
  const email = options?.email ?? uniqueEmail();
  const password = options?.password ?? TEST_PASSWORD;
  const name = options?.name ?? TEST_NAME;

  await page.goto("/");
  await page.getByRole("tab", { name: "Sign Up" }).click();
  await page.getByLabel("Full Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  // Wait for navigation away from auth page
  await page.waitForURL((url) => url.pathname !== "/");

  return email;
}

/** Sign in with existing credentials */
export async function signIn(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => url.pathname !== "/");
}

/** Sign out the current user */
export async function signOut(page: Page): Promise<void> {
  // Look for sign out button — may be in a dropdown or sidebar
  const signOutButton = page.getByRole("button", { name: /sign out|log out/i });
  if (await signOutButton.isVisible()) {
    await signOutButton.click();
  } else {
    // Try clicking a user menu or settings area first
    const menuButton = page.getByRole("button", {
      name: /menu|settings|profile/i,
    });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
    }
  }
}

/** Clear auth state from localStorage */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("homebase-auth-token");
    localStorage.removeItem("homebase-family-data");
  });
}
