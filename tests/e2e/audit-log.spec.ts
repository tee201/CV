import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

test.describe("Audit log", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test("admin sees a driver deactivation recorded, and the entity filter narrows to it", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/drivers");

    const driverRow = page.locator("li", { hasText: TEST_USERS.driver2.fullName });
    await driverRow.getByRole("button", { name: "Deactivate" }).click();

    await page.goto("/admin/audit-log");
    await expect(page.getByText("Driver deactivated")).toBeVisible();
    await expect(page.getByText(/Driver profile.*by Sam Okafor/)).toBeVisible();

    // Expanding shows the actual before/after values, not just that
    // something changed.
    await page.getByText(/field.*changed/).first().click();
    await expect(page.getByText("employment_status:")).toBeVisible();
    await expect(page.getByText("active → inactive")).toBeVisible();

    // The entity_type filter should hide unrelated entries — there are none
    // yet in this fresh-reset file, so filtering to "Holiday request" must
    // leave the list empty rather than still showing the deactivation.
    await page.getByRole("link", { name: "Holiday request", exact: true }).click();
    await expect(page).toHaveURL(/entity_type=holiday_request/);
    await expect(page.getByText("Driver deactivated")).toHaveCount(0);
    await expect(page.getByText(/No audit entries/)).toBeVisible();

    await page.getByRole("link", { name: "Driver profile" }).click();
    await expect(page.getByText("Driver deactivated")).toBeVisible();
  });
});
