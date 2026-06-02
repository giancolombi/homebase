import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

// Maps to scenarios in specs/features/meals.feature.

test.describe("Meals", () => {
  test("add a recipe and see it in the Recipes tab", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");

    await page.getByRole("tab", { name: "Recipes" }).click();
    await page.getByRole("button", { name: "Add Recipe" }).click();

    await page.getByPlaceholder("Recipe name").fill("Pasta Bolognese");
    // Add an ingredient — the dialog auto-renders one empty row.
    await page.getByPlaceholder("Amt").first().fill("200");
    await page.getByPlaceholder("Unit").first().fill("g");
    await page.getByPlaceholder("Ingredient").first().fill("spaghetti");

    await page.getByRole("button", { name: "Save Recipe" }).click();

    await expect(page.getByText("Pasta Bolognese")).toBeVisible();
  });

  test("place a recipe on the weekly plan and generate the shopping list", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");

    // Add a recipe first.
    await page.getByRole("tab", { name: "Recipes" }).click();
    await page.getByRole("button", { name: "Add Recipe" }).click();
    await page.getByPlaceholder("Recipe name").fill("Tacos");
    await page.getByPlaceholder("Amt").first().fill("500");
    await page.getByPlaceholder("Unit").first().fill("g");
    await page.getByPlaceholder("Ingredient").first().fill("ground beef");
    await page.getByRole("button", { name: "Save Recipe" }).click();

    // Back to weekly plan; assign the recipe to the first available slot.
    await page.getByRole("tab", { name: "Weekly Plan" }).click();

    // The first "+ Add recipe" <select> in the day grid.
    const firstSlot = page.locator("select").first();
    await firstSlot.selectOption({ label: "Tacos" });

    // The selected recipe title now renders in that slot. The same string
    // also appears as an <option> in every other meal slot's <select>, so
    // anchor on the <span> that displays the assigned recipe.
    await expect(page.locator("span", { hasText: "Tacos" })).toBeVisible();

    // Generate shopping list — "List" button on the Weekly Plan toolbar.
    await page.getByRole("button", { name: /List/ }).first().click();

    await page.getByRole("tab", { name: "Shopping" }).click();
    await expect(page.getByText("ground beef")).toBeVisible();
  });

  test("navigating weeks shows a date range beyond next week", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");

    await expect(page.getByText("This Week")).toBeVisible();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.getByText("Next Week")).toBeVisible();
    // A third week forward should show a date range label, not a named week.
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.getByText("–")).toBeVisible();
  });

  test("shopping list sums quantities for repeated ingredients", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");

    // Recipe with 2 eggs.
    await page.getByRole("tab", { name: "Recipes" }).click();
    await page.getByRole("button", { name: "Add Recipe" }).click();
    await page.getByPlaceholder("Recipe name").fill("Omelette");
    await page.getByPlaceholder("Amt").first().fill("2");
    await page.getByPlaceholder("Ingredient").first().fill("eggs");
    await page.getByRole("button", { name: "Save Recipe" }).click();

    // Assign it to two different meal slots.
    await page.getByRole("tab", { name: "Weekly Plan" }).click();
    await page.locator("select").nth(0).selectOption({ label: "Omelette" });
    await page.locator("select").nth(0).selectOption({ label: "Omelette" });

    await page.getByRole("button", { name: /List/ }).first().click();
    await page.getByRole("tab", { name: "Shopping" }).click();

    // The consolidated "eggs" row should read 4, not "2, 2".
    const row = page.locator("div").filter({ hasText: /eggs/ }).last();
    await expect(row).toContainText("4");
    await expect(row).not.toContainText("2, 2");
  });

  test("empty Recipes tab shows the empty state", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");
    await page.getByRole("tab", { name: "Recipes" }).click();
    await expect(
      page.getByText("No recipes yet. Add your first recipe!"),
    ).toBeVisible();
  });
});
