import { test, expect } from "@playwright/test";
import { uniqueEmail, TEST_PASSWORD, signUp, clearAuth } from "./helpers";

test.describe("Forgot Password (QA: specs/qa/qa-forgot-password.md)", () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    email = await signUp(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await clearAuth(page);
    await page.reload();
  });

  test("TC-FP-01: Navigate to forgot password form", async ({ page }) => {
    await page.getByText("Forgot password?").click();

    await expect(page.getByText("Reset Password")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send Reset Link" }),
    ).toBeVisible();
    await expect(page.getByText("Back to sign in")).toBeVisible();
  });

  test("TC-FP-02: Request password reset with registered email", async ({
    page,
  }) => {
    await page.getByText("Forgot password?").click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    // Don't assert the transient "Sending..." state — a fast local API can
    // resolve before the assertion runs, making the test flaky.
    await expect(
      page.getByText(/if that email is registered/i).first(),
    ).toBeVisible();
  });

  test("TC-FP-03: Request password reset with unregistered email", async ({
    page,
  }) => {
    await page.getByText("Forgot password?").click();
    await page.getByLabel("Email").fill("nobody-ever@example.com");
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    // Same response as registered email — no enumeration
    await expect(
      page.getByText(/if that email is registered/i).first(),
    ).toBeVisible();
  });

  test("TC-FP-04: Request password reset with empty email", async ({
    page,
  }) => {
    await page.getByText("Forgot password?").click();
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    // Browser validation blocks — stays on page
    await expect(page).toHaveURL("/auth");
  });

  test("TC-FP-05: Back to sign in from forgot password", async ({ page }) => {
    await page.getByText("Forgot password?").click();
    await expect(page.getByText("Reset Password")).toBeVisible();

    await page.getByText("Back to sign in").click();

    // Should show sign in form again with tabs
    await expect(page.getByRole("tab", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sign Up" })).toBeVisible();
  });

  test("TC-FP-06: Reset password with valid token (API test)", async ({
    request,
  }) => {
    // Request a reset token via the API
    const resetResponse = await request.post("/api/auth/request-reset", {
      data: { email },
    });
    expect(resetResponse.ok()).toBeTruthy();
    const resetData = await resetResponse.json();

    // In non-production, the reset token is returned in the response
    if (!resetData.resetToken) {
      test.skip(true, "Reset token not available — running in production mode");
      return;
    }

    // Use the token to reset the password
    const newPassword = "newpassword456";
    const resetPasswordResponse = await request.post(
      "/api/auth/reset-password",
      {
        data: { token: resetData.resetToken, password: newPassword },
      },
    );
    expect(resetPasswordResponse.ok()).toBeTruthy();

    // Verify new password works
    const signInResponse = await request.post("/api/auth/signin", {
      data: { email, password: newPassword },
    });
    expect(signInResponse.ok()).toBeTruthy();

    // Verify old password no longer works
    const oldSignInResponse = await request.post("/api/auth/signin", {
      data: { email, password: TEST_PASSWORD },
    });
    expect(oldSignInResponse.status()).toBe(401);
  });

  test("TC-FP-08: Reset password with short password", async ({ request }) => {
    const resetResponse = await request.post("/api/auth/request-reset", {
      data: { email },
    });
    const resetData = await resetResponse.json();

    if (!resetData.resetToken) {
      test.skip(true, "Reset token not available");
      return;
    }

    const response = await request.post("/api/auth/reset-password", {
      data: { token: resetData.resetToken, password: "short" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("at least 8 characters");
  });

  test("TC-FP-09: Reset password with tampered token", async ({ request }) => {
    const response = await request.post("/api/auth/reset-password", {
      data: { token: "tampered.invalid.token", password: "newpassword456" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid or expired/i);
  });

  test("TC-FP-10: Use a regular auth token as a reset token", async ({
    request,
  }) => {
    // Create a fresh user so we don't depend on other tests' state
    const freshEmail = uniqueEmail();
    await request.post("/api/auth/signup", {
      data: {
        email: freshEmail,
        password: TEST_PASSWORD,
        full_name: "Reset Test",
      },
    });

    const signInResponse = await request.post("/api/auth/signin", {
      data: { email: freshEmail, password: TEST_PASSWORD },
    });
    expect(signInResponse.ok()).toBeTruthy();
    const { token } = await signInResponse.json();

    // Try to use an auth token as a reset token
    const response = await request.post("/api/auth/reset-password", {
      data: { token, password: "hackedpassword1" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid reset token/i);
  });

  test("TC-FP-11: A reset token is single-use", async ({ request }) => {
    // Fresh user so this test owns its password state.
    const freshEmail = uniqueEmail();
    await request.post("/api/auth/signup", {
      data: {
        email: freshEmail,
        password: TEST_PASSWORD,
        full_name: "Single Use",
      },
    });

    const resetResponse = await request.post("/api/auth/request-reset", {
      data: { email: freshEmail },
    });
    const resetData = await resetResponse.json();
    if (!resetData.resetToken) {
      test.skip(true, "Reset token not available — running in production mode");
      return;
    }

    // First use succeeds.
    const first = await request.post("/api/auth/reset-password", {
      data: { token: resetData.resetToken, password: "first-new-pass-1" },
    });
    expect(first.ok()).toBeTruthy();

    // Second use of the same token is rejected — the token is fingerprinted
    // to the password it was issued against, which has now changed.
    const second = await request.post("/api/auth/reset-password", {
      data: { token: resetData.resetToken, password: "second-new-pass-2" },
    });
    expect(second.status()).toBe(400);
    const body = await second.json();
    expect(body.error).toMatch(/invalid or expired/i);
  });
});
