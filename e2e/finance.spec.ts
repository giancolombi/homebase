import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

// Maps to scenarios in specs/features/finance.feature.
//
// Plaid Link itself is third-party and out of scope for headless E2E. These
// tests cover what we own: the Finance page header renders, the Manage Bank
// Accounts dialog opens, the Plaid CTA is present, and the manual "Add Bank
// Account" path works without any external service.

test.describe("Finance", () => {
  test("Finance header + Manage Accounts trigger render", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/finance");

    await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Manage Accounts/ }),
    ).toBeVisible();
  });

  test("Manage Accounts dialog exposes the Plaid CTA", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/finance");

    await page.getByRole("button", { name: /Manage Accounts/ }).click();
    await expect(
      page.getByRole("heading", { name: "Bank Account Connections" }),
    ).toBeVisible();
    // First-time copy when there are no Plaid items yet.
    await expect(
      page.getByRole("button", { name: /Connect a bank/ }),
    ).toBeVisible();
  });

  test("manual bank account add appears on the Finance page", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/finance");

    await page.getByRole("button", { name: /Manage Accounts/ }).click();
    await page.getByRole("button", { name: /Add Bank Account/ }).click();

    await page.getByLabel("Account Name").fill("Joint Checking");
    await page.getByLabel("Institution").fill("Chase");
    await page.getByLabel("Current Balance").fill("1234");

    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Close the dialog so we assert against the underlying page only.
    // Esc didn't close it deterministically in CI — click the X button.
    await page.getByRole("button", { name: "Close" }).click();

    // The new account renders on the page (in the "Other Accounts" section
    // since it's not featured by default).
    const main = page.getByRole("main");
    await expect(main.getByText("Joint Checking")).toBeVisible();
    await expect(main.getByText("$1,234")).toBeVisible();
  });
});
