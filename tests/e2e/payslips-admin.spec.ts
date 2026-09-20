import { readFile } from "node:fs/promises";
import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

test.describe("Admin payslip generator", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.getByRole("link", { name: "Payslips" }).click();
    await expect(page).toHaveURL("/admin/payslips");
    await page.getByRole("link", { name: TEST_USERS.driver1.fullName }).click();
  });

  test("logs a standard day and a training day, and computes each day's pay", async ({ page }) => {
    await page.getByLabel("Date").fill("2026-09-01");
    await page.getByLabel("Route number").fill("12");
    await page.getByLabel("Drops", { exact: true }).fill("125");
    await page.getByRole("button", { name: "Save day" }).click();

    // 125 drops: £120 base + 5 stops at £1.00 = £125.00
    await expect(page.getByText("Route 12 · 125 drops")).toBeVisible();
    const standardRow = page.locator("li", { hasText: "Route 12" });
    await expect(standardRow.getByText("£125.00")).toBeVisible();

    await page.getByLabel("Date").fill("2026-09-02");
    await page.getByLabel("Route number").fill("7");
    await page.getByLabel("Training day (flat £50, drops are ignored)").check();
    await page.getByRole("button", { name: "Save day" }).click();

    await expect(page.getByText("Route 7 · Training day")).toBeVisible();
    const trainingRow = page.locator("li", { hasText: "Route 7" });
    await expect(trainingRow.getByText("£50.00")).toBeVisible();
  });

  test("re-saving the same date updates it instead of duplicating", async ({ page }) => {
    await page.getByLabel("Date").fill("2026-09-03");
    await page.getByLabel("Route number").fill("3");
    await page.getByLabel("Drops", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Save day" }).click();
    await expect(page.getByText("Route 3 · 100 drops")).toBeVisible();

    await page.getByLabel("Date").fill("2026-09-03");
    await page.getByLabel("Route number").fill("3");
    await page.getByLabel("Drops", { exact: true }).fill("140");
    await page.getByRole("button", { name: "Save day" }).click();

    // 140 drops: £120 + 10*£1.00 + 10*£1.25 = £142.50 — and only one entry
    // for 3 September, not two.
    await expect(page.getByText("Route 3 · 140 drops")).toBeVisible();
    await expect(page.getByText("Route 3 · 100 drops")).toHaveCount(0);
    await expect(page.locator("li", { hasText: "Route 3" })).toHaveCount(1);
  });

  test("downloads a PDF payslip covering the logged days", async ({ page }) => {
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Route number").fill("9");
    await page.getByLabel("Drops", { exact: true }).fill("110");
    await page.getByRole("button", { name: "Save day" }).click();
    await expect(page.getByText("Route 9 · 110 drops")).toBeVisible();

    await page.getByLabel("From").fill("2026-09-01");
    await page.getByLabel("To", { exact: true }).fill("2026-09-30");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF payslip" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^payslip-.*\.pdf$/);
    const streamPath = await download.path();
    expect(streamPath).toBeTruthy();

    // Confirm it's a genuine PDF, not just a response that happened to
    // trigger a download.
    const bytes = await readFile(streamPath as string);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
