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

  test("add a budget and see it tracked", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/finance");

    await page.getByPlaceholder("Category").fill("Groceries");
    await page.getByPlaceholder("Monthly $").fill("400");
    await page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .last()
      .click();

    await expect(page.getByText("Groceries")).toBeVisible();
    await expect(page.getByText("$0 / $400")).toBeVisible();
  });

  test("manually add a transaction after creating an account", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/finance");

    await page.getByRole("button", { name: /Manage Accounts/ }).click();
    await page.getByRole("button", { name: /Add Bank Account/ }).click();
    await page.getByLabel("Account Name").fill("Checking");
    await page.getByLabel("Institution").fill("Chase");
    await page.getByLabel("Current Balance").fill("1000");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: /Transaction/ }).click();
    await page.getByPlaceholder("e.g. Groceries at Whole Foods").fill("Coffee");
    await page.getByPlaceholder("0.00").fill("4.50");
    await page.getByPlaceholder("e.g. Groceries").last().fill("Dining");
    await page.getByRole("button", { name: "Add Transaction" }).click();

    await expect(page.getByText("Dining")).toBeVisible();
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
