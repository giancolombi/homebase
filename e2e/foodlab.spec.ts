import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

// Maps to scenarios in specs/features/foodlab.feature.
//
// FoodLab pulls recipes from a public GitHub repo at runtime. Driving the
// happy path in CI would couple our suite to GitHub uptime + content drift,
// so these specs stay on the offline-safe surfaces: the empty state, the
// link to the upstream repo, and the sync trigger button.

test.describe("FoodLab panel", () => {
  test("empty state renders when no recipes have been synced", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");

    await page.getByRole("tab", { name: /FoodLab/ }).click();

    await expect(page.getByText("No FoodLab recipes loaded yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sync from GitHub/ }),
    ).toBeVisible();
  });

  test("links to the upstream FoodLab repo", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/meals");
    await page.getByRole("tab", { name: /FoodLab/ }).click();

    const repoLink = page.getByRole("link", { name: /FoodLab repo/ });
    await expect(repoLink).toHaveAttribute(
      "href",
      "https://github.com/giancolombi/foodlab",
    );
    await expect(repoLink).toHaveAttribute("target", "_blank");
  });
});
