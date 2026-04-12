import { test, expect } from "@playwright/test";
import { uniqueEmail, TEST_PASSWORD, signUp, clearAuth } from "./helpers";

test.describe("Session Persistence (QA: specs/qa/qa-session-persistence.md)", () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    email = await signUp(page);
    await page.close();
  });

  test("TC-SP-01: Session survives page refresh", async ({ page }) => {
    await page.goto("/");
    await clearAuth(page);
    await page.reload();

    // Sign in
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Refresh
    await page.reload();

    // Should still be logged in — not on auth page
    await expect(
      page.getByRole("button", { name: "Sign In" }),
    ).not.toBeVisible();
    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeTruthy();
  });

  test("TC-SP-04: Session loads user data from the server", async ({
    page,
  }) => {
    await page.goto("/");
    await clearAuth(page);
    await page.reload();

    // Sign in
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Watch for /api/auth/me request on reload
    const meRequestPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/me") && response.status() === 200,
    );

    await page.reload();
    const meResponse = await meRequestPromise;
    const meData = await meResponse.json();

    expect(meData.user.email).toBe(email);
  });

  test("TC-SP-05: Expired token redirects to login", async ({ page }) => {
    await page.goto("/");
    await clearAuth(page);
    await page.reload();

    // Sign in
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Replace token with invalid value
    await page.evaluate(() => {
      localStorage.setItem("homebase-auth-token", "expired-invalid-token");
    });

    await page.reload();

    // Should be back on auth page
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Invalid token should be cleared
    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeNull();
  });

  test("TC-SP-07: Multi-tab session sync", async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // Clear auth on both
    await pageA.goto("/");
    await clearAuth(pageA);
    await pageA.reload();

    // Sign in on page A
    await pageA.getByLabel("Email").fill(email);
    await pageA.getByLabel("Password").fill(TEST_PASSWORD);
    await pageA.getByRole("button", { name: "Sign In" }).click();
    await pageA.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Page B should share the same localStorage (same context)
    await pageB.goto("/");
    await pageB.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Clear token from page A (simulates sign out)
    await pageA.evaluate(() => {
      localStorage.removeItem("homebase-auth-token");
      // Dispatch storage event for other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "homebase-auth-token",
          newValue: null,
        }),
      );
    });

    // Page B should detect the change when it checks
    await pageB.reload();
    await expect(pageB.getByRole("button", { name: "Sign In" })).toBeVisible();

    await pageA.close();
    await pageB.close();
  });
});
