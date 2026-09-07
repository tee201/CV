import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

function futureDateInput(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

test.describe("Holiday requests", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test("driver submits a holiday request", async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);
    await page.getByRole("link", { name: "Requests" }).click();
    await expect(page).toHaveURL("/requests");

    await page.getByRole("button", { name: "Request holiday" }).click();
    await page.getByLabel("Date 1").fill(futureDateInput(14));
    await page.getByLabel("Note (optional)").fill("Playwright critical-path test");
    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(page.getByText("Playwright critical-path test")).toBeVisible();
    await expect(page.getByText("pending")).toBeVisible();
  });

  test("admin approves a pending holiday request", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/holidays");

    const pendingSection = page.locator("section", { hasText: "Pending" }).first();
    await expect(pendingSection.getByText(TEST_USERS.driver1.fullName)).toBeVisible();

    const row = pendingSection.locator("li", { hasText: TEST_USERS.driver1.fullName });
    await row.getByRole("textbox").fill("Approved — enjoy!");
    await row.getByRole("button", { name: "Approve" }).click();

    // Only Jamie's request should have moved out of Pending — the other
    // fixture request (Alex Chen's, used by the admin-reject test) stays.
    await expect(pendingSection.getByText(TEST_USERS.driver1.fullName)).toHaveCount(0);
    const decisionsSection = page.locator("section", { hasText: "Recent decisions" });
    await expect(decisionsSection.getByText(TEST_USERS.driver1.fullName)).toBeVisible();
    await expect(decisionsSection.getByText("approved")).toBeVisible();
  });

  test("admin rejects a pending holiday request", async ({ page }) => {
    // Seeded by the mock server's fixture data specifically for this test —
    // see tests/support/mock-supabase-server.mjs.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/holidays");

    const pendingSection = page.locator("section", { hasText: "Pending" }).first();
    const row = pendingSection.locator("li", { hasText: TEST_USERS.driver2.fullName });
    await row.getByRole("button", { name: "Reject" }).click();

    const decisionsSection = page.locator("section", { hasText: "Recent decisions" });
    await expect(decisionsSection.getByText(TEST_USERS.driver2.fullName)).toBeVisible();
    await expect(decisionsSection.getByText("rejected")).toBeVisible();
  });
});
