import { test, expect } from "@playwright/test";
import { uniqueEmail, TEST_PASSWORD, TEST_NAME, clearAuth } from "./helpers";

test.describe("Sign Up (QA: specs/qa/qa-sign-up.md)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearAuth(page);
    await page.reload();
  });

  test("TC-SU-01: Successful sign up", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show loading state
    await expect(
      page.getByRole("button", { name: "Creating account..." }),
    ).toBeVisible();

    // Wait for onboarding page to appear (signup leads to onboarding)
    await expect(
      page.getByRole("heading", { name: "Welcome to Homebase" }),
    ).toBeVisible({ timeout: 10000 });

    // Token should be stored
    const token = await page.evaluate(() =>
      localStorage.getItem("homebase-auth-token"),
    );
    expect(token).toBeTruthy();
  });

  test("TC-SU-02: Sign up with duplicate email", async ({ page }) => {
    const email = uniqueEmail();

    // First signup
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome to Homebase" }),
    ).toBeVisible({ timeout: 10000 });

    // Clear auth and go back
    await clearAuth(page);
    await page.goto("/");

    // Second signup with same email
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill("Another User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show error
    await expect(
      page.getByText("An account with this email already exists").first(),
    ).toBeVisible();
  });

  test("TC-SU-03: Sign up with short password", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Create Account" }).click();

    // Client-side validation — no network request
    await expect(
      page.getByText("Password must be at least 8 characters").first(),
    ).toBeVisible();
  });

  test("TC-SU-04: Sign up with missing email", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Password").fill(TEST_PASSWORD);

    // Leave email empty and click submit
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should not navigate — browser validation blocks submission
    await expect(page).toHaveURL("/");
  });

  test("TC-SU-05: Sign up with missing password", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(uniqueEmail());

    // Leave password empty
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL("/");
  });

  test("TC-SU-06: Sign up with missing full name", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill(TEST_PASSWORD);

    // Leave name empty
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL("/");
  });

  test("TC-SU-07: Sign up with invalid email format", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill("notanemail");
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Browser validation blocks — stays on page
    await expect(page).toHaveURL("/");
  });

  test("TC-SU-08: Network error during sign up", async ({ page }) => {
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill(TEST_PASSWORD);

    // Go offline
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show error toast
    await expect(page.getByText("Sign up failed").first()).toBeVisible();

    // Button should recover
    await page.context().setOffline(false);
    await expect(
      page.getByRole("button", { name: "Create Account" }),
    ).toBeEnabled();
  });
});
