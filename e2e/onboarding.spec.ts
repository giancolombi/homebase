import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

// Walks the full 4-step onboarding wizard end-to-end. Maps to scenarios in
// specs/features/onboarding.feature.

test.describe("Onboarding wizard", () => {
  test("Step 0 → Step 3 → /calendar (full happy path, no calendar connections)", async ({
    page,
  }) => {
    // signUp leaves us on Step 0 with the "Welcome to Homebase" heading.
    await signUp(page);

    // Step 0: Family Name
    await expect(page.getByText("Family name", { exact: true })).toBeVisible();
    await page.getByPlaceholder("e.g. The Johnsons").fill("Test Family");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 1: Your Profile (pre-filled from signup)
    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Family Members. Skip adding additional members; just continue.
    // The button text changes to "Setting up family..." while the family is
    // being created server-side.
    await expect(
      page.getByRole("heading", { name: "Family Members" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Calendar Connect — wait for it to render.
    await expect(
      page.getByRole("heading", { name: "Connect Your Calendars" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Get Started" }).click();

    // Lands on /calendar with the day-view UI.
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole("button", { name: "Day" })).toBeVisible();
  });

  test("mid-flow reload preserves the current step", async ({ page }) => {
    await signUp(page);

    // Advance to Step 1
    await page.getByPlaceholder("e.g. The Johnsons").fill("Reload Family");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible();

    // Hard reload — onboardingStep is persisted in localStorage so we should
    // still be on Step 1, not bumped back to Step 0.
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible();
  });

  test("adding an adult member with email shows Pending invite badge", async ({
    page,
  }) => {
    await signUp(page);
    await page.getByPlaceholder("e.g. The Johnsons").fill("Invite Family");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // Step 1 → 2

    // Step 2: add an adult
    await expect(
      page.getByRole("heading", { name: "Family Members" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Adult" }).click();
    await page.getByPlaceholder("Name").fill("Alex");
    await page.getByPlaceholder("partner@example.com").fill("alex@example.com");
    await page.getByRole("button", { name: /Add Member/ }).click();

    // Member appears in the list. The name shows up as the row title and
    // also inside the role/email sub-line ("adult · alex@example.com"), so
    // match the row title with exact: true.
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Invite pending")).toBeVisible();
  });
});
