import { test, expect } from "@playwright/test";
import {
  uniqueEmail,
  TEST_PASSWORD,
  TEST_NAME,
  signUp,
  clearAuth,
} from "./helpers";

test.describe("Sign In (QA: specs/qa/qa-sign-in.md)", () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test account to sign in with
    const page = await browser.newPage();
    email = await signUp(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await clearAuth(page);
    await page.reload();
  });

  test("TC-SI-01: Successful sign in", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByRole("button", { name: "Signing in..." }),
    ).toBeVisible();

    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeTruthy();
  });

  test("TC-SI-02: Sign in with wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrongpassword123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Invalid email or password").first(),
    ).toBeVisible();
    await expect(page).toHaveURL("/auth");
  });

  test("TC-SI-03: Sign in with non-existent email", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Same error message as wrong password — no email enumeration
    await expect(
      page.getByText("Invalid email or password").first(),
    ).toBeVisible();
  });

  test("TC-SI-04: Sign in with missing email", async ({ page }) => {
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL("/auth");
  });

  test("TC-SI-05: Sign in with missing password", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL("/auth");
  });

  test("TC-SI-06: Sign in button disabled during loading", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Button should be disabled while loading
    await expect(
      page.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
  });

  test("TC-SI-07: Network error during sign in", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);

    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Sign in failed").first()).toBeVisible();

    await page.context().setOffline(false);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  test("TC-SI-08: Sign in preserves correct tab state", async ({ page }) => {
    // Default tab is Sign In
    await expect(page.getByLabel("Email")).toBeVisible();

    // Switch to Sign Up
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await expect(page.getByLabel("Full Name")).toBeVisible();

    // Switch back to Sign In
    await page.getByRole("tab", { name: "Sign In" }).click();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("TC-SI-09: Sign in after sign out", async ({ page }) => {
    // Sign in
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    // Clear auth (simulates sign out)
    await clearAuth(page);
    await page.goto("/auth");

    // Sign in again
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForSelector('button:has-text("Sign In")', {
      state: "hidden",
    });

    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeTruthy();
  });
});
