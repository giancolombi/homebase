import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

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
});
