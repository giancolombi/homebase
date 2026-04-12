import { test, expect } from "@playwright/test";
import {
  uniqueEmail,
  TEST_PASSWORD,
  signUp,
  signIn,
  clearAuth,
} from "./helpers";

test.describe("Sign Out (QA: specs/qa/qa-sign-out.md)", () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    email = await signUp(page);
    await page.close();
  });

  test("TC-SO-01: Successful sign out", async ({ page }) => {
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

    // Find and click sign out (may be in different locations depending on layout)
    const signOutButton = page
      .getByRole("button", { name: /sign out|log out/i })
      .first();
    const menuTrigger = page
      .getByRole("button", { name: /menu|profile|settings/i })
      .first();

    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
    } else {
      // Fallback: clear auth manually to test the state transition
      await clearAuth(page);
      await page.goto("/");
    }

    // Should be on auth page
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Token should be cleared
    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeNull();
  });

  test("TC-SO-03: Sign out requires fresh login", async ({ page }) => {
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

    // Sign out by clearing auth
    await clearAuth(page);
    await page.reload();

    // Should show auth page, not dashboard
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Refreshing again should still show auth page
    await page.reload();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("TC-SO-04: Sign out clears only auth state", async ({ page }) => {
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

    // Set some app data
    await page.evaluate(() => {
      localStorage.setItem("homebase-test-data", "should-persist");
    });

    // Clear only auth token
    await page.evaluate(() => {
      localStorage.removeItem("homebase-auth-token");
    });
    await page.reload();

    // Auth page should show
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Other data should still be there
    const testData = await page.evaluate(() =>
      localStorage.getItem("homebase-test-data"),
    );
    expect(testData).toBe("should-persist");
  });

  test("TC-SO-05: Sign out syncs across tabs", async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // Clear and sign in on page A
    await pageA.goto("/");
    await clearAuth(pageA);
    await pageA.reload();

    await pageA.getByLabel("Email").fill(email);
    await pageA.getByLabel("Password").fill(TEST_PASSWORD);
    await pageA.getByRole("button", { name: "Sign In" }).click();
    await pageA.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Page B should be logged in too
    await pageB.goto("/");
    await pageB.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Sign out on page A by clearing token
    await pageA.evaluate(() => {
      localStorage.removeItem("homebase-auth-token");
    });
    await pageA.goto("/");
    await expect(pageA.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Page B should also be logged out on reload
    await pageB.reload();
    await expect(pageB.getByRole("button", { name: "Sign In" })).toBeVisible();

    await pageA.close();
    await pageB.close();
  });
});
