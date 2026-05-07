import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

// Maps to scenarios in specs/features/tasks.feature.

test.describe("Tasks", () => {
  test("create a task and see it in the list", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/tasks");

    // The "Task" button (with Plus icon) opens AddTaskDialog. Use exact match
    // so we don't also match the "Add Task" submit button inside the dialog.
    await page.getByRole("button", { name: "Task", exact: true }).click();

    await page.getByPlaceholder("Task title").fill("Pay rent");
    await page.getByRole("button", { name: "Add Task" }).click();

    await expect(page.getByText("Pay rent")).toBeVisible();
  });

  test("default categories are seeded after onboarding", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/tasks");

    // Default categories live inside the "Add Category" Popover. Open it.
    await page.getByRole("button", { name: /Add Category/ }).click();

    for (const cat of ["Home", "School", "Work", "Health", "Errands"]) {
      await expect(page.getByText(cat, { exact: true })).toBeVisible();
    }
  });

  test("empty tasks list shows the empty state", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/tasks");
    await expect(
      page.getByText("No tasks yet. Add your first task!"),
    ).toBeVisible();
  });
});
