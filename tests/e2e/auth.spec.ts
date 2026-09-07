import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

test.describe("Authentication", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test("driver can log in and reach the dashboard", async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Jamie" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });

  test("wrong password is rejected with a generic error", async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, "not-the-password");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });

  test("a deactivated driver is signed back out and told their account is inactive", async ({ page }) => {
    await loginAs(page, TEST_USERS.deactivatedDriver.email, TEST_USERS.deactivatedDriver.password);

    await expect(page).toHaveURL(/\/login\?deactivated=1/);
    await expect(page.getByText(/no longer active/)).toBeVisible();

    // The session was actually signed out (not just redirected past) —
    // reloading the dashboard must bounce back to login rather than let a
    // stale cookie back in.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
