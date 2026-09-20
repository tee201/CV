import { test, expect } from "../support/fixtures";
import { loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

// Purely client-side — no mock-server state to reset between tests.
test.describe("Payslip calculator", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);
    await expect(page).toHaveURL("/");
    await page.getByRole("link", { name: "Payslip Calculator" }).click();
    await expect(page).toHaveURL("/payslip");
  });

  // The per-day card and the period-total summary can show the same amount
  // when there's only one day entered, so assertions scope to the summary
  // section (identified by its "N days · N drops" line) to avoid matching
  // both and tripping Playwright's strict mode.
  function summaryOf(page: import("@playwright/test").Page) {
    return page.locator("section", { hasText: "drop" });
  }

  test("pays a flat £120 for 120 drops or fewer", async ({ page }) => {
    await page.getByLabel("Drops").fill("95");
    await expect(summaryOf(page).getByText("£120.00")).toBeVisible();
  });

  test("adds a per-stop rate above 120 drops", async ({ page }) => {
    // 125 drops: £120 base + 5 stops at £1.00 = £125.00
    await page.getByLabel("Drops").fill("125");
    await expect(summaryOf(page).getByText("£125.00")).toBeVisible();
  });

  test("steps the rate up again past 130 drops", async ({ page }) => {
    // 135 drops: £120 + 10*£1.00 + 5*£1.25 = £136.25
    await page.getByLabel("Drops").fill("135");
    await expect(summaryOf(page).getByText("£136.25")).toBeVisible();
  });

  test("pays a flat £50 for a training day regardless of drops", async ({ page }) => {
    await page.getByLabel("Drops").fill("150");
    await page.getByLabel("Training day (flat £50)").check();
    await expect(summaryOf(page).getByText("£50.00")).toBeVisible();
  });

  test("totals pay across multiple days", async ({ page }) => {
    await page.getByLabel("Drops").fill("120");
    await page.getByRole("button", { name: "+ Add another day" }).click();
    const dropsInputs = page.getByLabel("Drops");
    await dropsInputs.nth(1).fill("125");

    // £120.00 + £125.00 = £245.00
    await expect(page.getByText("2 days · 245 drops")).toBeVisible();
    await expect(summaryOf(page).getByText("£245.00")).toBeVisible();
  });
});
