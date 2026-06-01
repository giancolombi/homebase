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

  test("edit a task's title", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/tasks");

    await page.getByRole("button", { name: "Task", exact: true }).click();
    await page.getByPlaceholder("Task title").fill("Walk dog");
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText("Walk dog")).toBeVisible();

    await page.getByRole("button", { name: "Edit task" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Edit Task" }),
    ).toBeVisible();
    await page.getByPlaceholder("Task title").fill("Walk the dog twice");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Walk the dog twice")).toBeVisible();
    await expect(page.getByText("Walk dog", { exact: true })).toHaveCount(0);
  });

  test("delete a task removes it from the list", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/tasks");

    await page.getByRole("button", { name: "Task", exact: true }).click();
    await page.getByPlaceholder("Task title").fill("Temporary task");
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText("Temporary task")).toBeVisible();

    await page.getByRole("button", { name: "Delete task" }).first().click();
    await expect(page.getByText("Temporary task")).toHaveCount(0);
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
