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

    await page.getByRole("button", { name: "Next day" }).click();

    // "Today" tag goes away when not viewing today.
    await expect(page.getByText("Today", { exact: true })).toHaveCount(0);
  });

  // Regression: events used to live only in this browser's localStorage —
  // invisible to other family members and lost on storage clear.
  test("created events sync to the server and survive local storage loss", async ({
    page,
  }) => {
    await signUpAndOnboard(page);

    await page.getByRole("button", { name: /Event/ }).click();
    await page.getByPlaceholder("Event title").fill("Synced Dinner");
    const createRequest = page.waitForResponse(
      (r) =>
        r.url().includes("/api/calendar/events") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Add Event" }).click();
    await expect(page.getByText("Synced Dinner")).toBeVisible();
    expect((await createRequest).ok()).toBeTruthy();

    // Simulate a fresh device: wipe the persisted store (keep the auth
    // token) and reload — the event must come back from the server.
    await page.evaluate(() => localStorage.removeItem("homebase-family-data"));
    await page.reload();
    await expect(page.getByText("Synced Dinner")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("clicking a time slot preselects that time in Add Event", async ({
    page,
  }) => {
    await signUpAndOnboard(page);

    // Click the 3 PM slot in the first member column.
    await page.getByTestId("day-slot-15").first().click();

    // Dialog opens with start/end preset to the clicked slot.
    await expect(
      page.getByRole("heading", { name: "Add Event" }),
    ).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toHaveValue(
      "15:00",
    );
    await expect(page.locator('input[type="time"]').nth(1)).toHaveValue(
      "16:00",
    );
  });
});
