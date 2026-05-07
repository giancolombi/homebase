import { test, expect } from "@playwright/test";

// Maps to scenarios in specs/features/invites.feature.
//
// The happy-path "click invite link → accept" flow requires a server-issued
// JWT (which only ships via the email transport in production). These specs
// cover the user-facing surfaces of /accept-invite that don't need a real
// token: missing token, invalid token, and the "Go to Homebase" recovery.

test.describe("Accept Invite page", () => {
  test("missing token shows the Invite Not Valid state", async ({ page }) => {
    await page.goto("/accept-invite");
    await expect(
      page.getByRole("heading", { name: "Invite Not Valid" }),
    ).toBeVisible();
    await expect(page.getByText("No invite token provided")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Go to Homebase" }),
    ).toBeVisible();
  });

  test("invalid token surfaces the API error", async ({ page }) => {
    await page.goto("/accept-invite?token=not-a-real-jwt");
    // Loader shows briefly, then the error card.
    await expect(
      page.getByRole("heading", { name: "Invite Not Valid" }),
    ).toBeVisible({ timeout: 10_000 });
    // The exact error text comes from the API ("Invalid invite token" or
    // similar) — we just assert it's not the success card.
    await expect(page.getByText("You're Invited!")).toHaveCount(0);
  });

  test('"Go to Homebase" navigates back to the landing page', async ({
    page,
  }) => {
    await page.goto("/accept-invite");
    await page.getByRole("button", { name: "Go to Homebase" }).click();
    // Landing page lives at /, the AcceptInvitePage is gone.
    await expect(page).toHaveURL(/\/$|\/auth/);
    await expect(
      page.getByRole("heading", { name: "Invite Not Valid" }),
    ).toHaveCount(0);
  });
});
