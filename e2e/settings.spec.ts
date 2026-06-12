import { test, expect } from "@playwright/test";
import { signUpAndOnboard, signIn, TEST_PASSWORD } from "./helpers";

// Maps to scenarios in specs/features/settings.feature.

test.describe("Settings", () => {
  test("the current user appears at the top with the You badge", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("You", { exact: true })).toBeVisible();
  });

  test("add an adult member with email", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");

    // Open the AddMemberDialog (DialogTrigger button labeled "Add Member").
    await page.getByRole("button", { name: "Add Member" }).first().click();

    // Dialog uses placeholder "Enter name" + "email@example.com" and a
    // RadioGroup labeled "Adult (will receive invite)" / "Child (managed account)".
    await page.getByPlaceholder("Enter name").fill("Alex");
    await page.getByLabel(/Adult \(will receive invite\)/).check();
    await page.getByPlaceholder("email@example.com").fill("alex@example.com");

    // Submit — second "Add Member" button is the dialog footer button.
    await page.getByRole("button", { name: "Add Member" }).last().click();

    // The new member's name renders both as the row title and inside the
    // sub-line ("Adult · alex@example.com"). Match the row title only.
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
  });

  test("Your Calendars card surfaces all three providers", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /Your.*Calendars/i }),
    ).toBeVisible();
    await expect(page.getByText("Google", { exact: true })).toBeVisible();
    await expect(page.getByText("Outlook", { exact: true })).toBeVisible();
    await expect(page.getByText("Apple", { exact: true })).toBeVisible();
  });

  test("clicking Apple opens the AppleConnectDialog (no popup)", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");

    await page.getByText("Apple", { exact: true }).click();

    // Dialog title
    await expect(page.getByText("Connect iCloud Calendar")).toBeVisible();
    // The "App-specific password" field label is unique inside the dialog.
    await expect(page.getByLabel("App-specific password")).toBeVisible();
    // No popup or external nav
    await expect(page).toHaveURL(/\/settings/);
  });

  test("sign out from settings drops the user back to /", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/$|\/auth/);
  });

  // Regression: the password section used to validate locally, call nothing,
  // and toast success without changing anything server-side.
  test("change password via Edit Profile actually changes it", async ({
    page,
  }) => {
    const newPassword = "brand-new-pass-456";
    const email = await signUpAndOnboard(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Edit profile" }).click();

    // Wrong current password is rejected by the server.
    await page.getByLabel("Current Password").fill("definitely-wrong");
    await page.getByLabel("New Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm New Password").fill(newPassword);
    await page.getByRole("button", { name: "Save Changes" }).click();
    // .first(): the toast also mirrors its text into an aria-live region.
    await expect(
      page.getByText("Current password is incorrect").first(),
    ).toBeVisible();

    // Correct current password succeeds.
    await page.getByLabel("Current Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText(/profile and password have been updated/i).first(),
    ).toBeVisible();

    // The new password signs in; the change really happened server-side.
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/$|\/auth/);
    await signIn(page, email, newPassword);
    await expect(page).toHaveURL(/\/calendar/, { timeout: 10_000 });
  });

  // Regression: member removal used to be local-only — the next server pull
  // resurrected the deleted member.
  test("removed member stays removed after reload", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Add Member" }).first().click();
    await page.getByPlaceholder("Enter name").fill("Kiddo");
    await page.getByLabel(/Child \(managed account\)/).check();
    await page.getByRole("button", { name: "Add Member" }).last().click();
    await expect(
      page.getByText("Kiddo", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove Kiddo" }).click();
    await expect(page.getByText("Kiddo", { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Kiddo", { exact: true })).toHaveCount(0);
  });
});
