import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

test.describe("Announcements", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test("admin publishes an important announcement", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/announcements");

    await page.getByRole("button", { name: "New announcement" }).click();
    await page.getByLabel("Title").fill("Playwright: new safety procedure");
    await page.getByLabel("Message").fill("Please read the updated handover checklist before your next shift.");
    await page.getByLabel("Mark as important").check();
    await page.getByRole("button", { name: "Publish announcement" }).click();

    await expect(page.getByText("Playwright: new safety procedure")).toBeVisible();
  });

  test("driver sees and must acknowledge the important announcement", async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);

    // An unacknowledged important announcement surfaces as a banner on the
    // dashboard before the driver even opens Announcements.
    await expect(page.getByText(/important announcement.*needs? your acknowledgement/)).toBeVisible();

    await page.getByRole("link", { name: "News" }).click();
    await expect(page).toHaveURL("/announcements");
    await expect(page.getByText("Playwright: new safety procedure")).toBeVisible();
    await expect(page.getByText("Important")).toBeVisible();

    await page.getByRole("button", { name: "I acknowledge" }).click();
    await expect(page.getByText("Acknowledged")).toBeVisible();

    // The dashboard banner must clear once acknowledged.
    await page.goto("/");
    await expect(page.getByText(/needs? your acknowledgement/)).toHaveCount(0);
  });
});
