import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

// Maps to scenarios in specs/features/calendar.feature.

test.describe("Calendar", () => {
  test("create a timed event and see it on the day view", async ({ page }) => {
    await signUpAndOnboard(page);

    // Open the AddEventDialog from the header.
    await page.getByRole("button", { name: /Event/ }).click();

    // Fill the dialog. Use the placeholder selector to avoid the
    // "Add Event" button (same text). Title field has placeholder "Event title".
    await page.getByPlaceholder("Event title").fill("Coffee with Alex");
    // Default date = today (preselected). Times default to 09:00 / 10:00 in
    // the dialog. Just save.
    await page.getByRole("button", { name: "Add Event" }).click();

    // Event chip renders on the day view.
    await expect(page.getByText("Coffee with Alex")).toBeVisible();
  });

  test("a created event persists to the backend across a reload", async ({
    page,
  }) => {
    await signUpAndOnboard(page);

    await page.getByRole("button", { name: /Event/ }).click();
    await page.getByPlaceholder("Event title").fill("Dentist appointment");
    await page.getByRole("button", { name: "Add Event" }).click();
    await expect(page.getByText("Dentist appointment")).toBeVisible();

    // Clear the locally-persisted store so the only way the event can reappear
    // is by being re-hydrated from the backend (pullAllData).
    await page.evaluate(() => localStorage.removeItem("homebase-family-data"));
    await page.reload();

    await expect(page.getByText("Dentist appointment")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a daily recurring event appears on multiple days in week view", async ({
    page,
  }) => {
    await signUpAndOnboard(page);

    await page.getByRole("button", { name: /Event/ }).click();
    await page.getByPlaceholder("Event title").fill("Morning workout");

    // Set recurrence to Daily via the Recurrence select.
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Daily" }).click();
    await page.getByRole("button", { name: "Add Event" }).click();

    // In week view the daily event should render on more than one day.
    await page.getByRole("button", { name: "Week" }).click();
    await expect
      .poll(async () => page.getByText("Morning workout").count(), {
        timeout: 10_000,
      })
      .toBeGreaterThan(1);
  });

  test("search filters events by title", async ({ page }) => {
    await signUpAndOnboard(page);

    await page.getByRole("button", { name: /Event/ }).click();
    await page.getByPlaceholder("Event title").fill("Piano lesson");
    await page.getByRole("button", { name: "Add Event" }).click();
    await expect(page.getByText("Piano lesson")).toBeVisible();

    await page.getByLabel("Search events").fill("dentist");
    await expect(page.getByText("Piano lesson")).toHaveCount(0);

    await page.getByLabel("Search events").fill("piano");
    await expect(page.getByText("Piano lesson")).toBeVisible();
  });

  test("week view toggles 7 days", async ({ page }) => {
    await signUpAndOnboard(page);

    await page.getByRole("button", { name: "Week" }).click();

    // Week view shows date range like "Mon X – Sun Y"
    await expect(page.locator("text=/–/")).toBeVisible();
  });

  test("navigate forward by day", async ({ page }) => {
    await signUpAndOnboard(page);

    // Initial label: "Today"
    await expect(page.getByText("Today")).toBeVisible();

    // Click forward chevron — find the second nav button (right chevron).
    await page.locator("button:has(svg.lucide-chevron-right)").first().click();

    // "Today" tag goes away when not viewing today.
    await expect(page.getByText("Today", { exact: true })).toHaveCount(0);
  });
});
