import path from "node:path";
import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

const PHOTO_FIXTURE = path.join(__dirname, "..", "fixtures", "photo.jpg");
const HEIC_FIXTURE = path.join(__dirname, "..", "fixtures", "photo.heic");

test.describe("Incident reporting", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test("driver reports an incident with a JPEG and a HEIC photo", async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);
    await page.getByRole("link", { name: "Incidents" }).click();
    await expect(page).toHaveURL("/incidents");

    await page.goto("/incidents/new");
    await page.getByLabel("Incident type").selectOption({ label: "Vehicle issue" });
    await page.getByLabel("Location").fill("A40 near junction 3, Playwright test");
    await page.getByLabel("What happened?").fill("Wing mirror clipped by a passing vehicle while parked.");
    await page.getByLabel("Urgency").selectOption("low");

    // Most iPhone drivers shoot HEIC by default — attaching one alongside a
    // plain JPEG exercises the client-side HEIC-to-JPEG conversion in
    // src/lib/image/process-photo.ts, since most non-Safari browsers (this
    // suite runs Chromium, same as most Android phones) can't decode HEIC
    // natively at all.
    const photoInput = page.locator('input[type="file"]');
    await photoInput.setInputFiles(PHOTO_FIXTURE);
    await expect(page.locator('[aria-label="Remove photo"]')).toHaveCount(1);
    await photoInput.setInputFiles(HEIC_FIXTURE);
    await expect(page.locator('[aria-label="Remove photo"]')).toHaveCount(2);

    await page.getByRole("button", { name: "Submit report" }).click();

    await expect(page).toHaveURL("/incidents");
    await expect(page.getByText("A40 near junction 3, Playwright test")).toBeVisible();
  });

  test("admin triages the reported incident and sees both photos", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/incidents");

    await page.getByText("Playwright test", { exact: false }).first().click();
    await expect(page).toHaveURL(/\/admin\/incidents\//);
    await expect(page.getByText("Reported by " + TEST_USERS.driver1.fullName)).toBeVisible();
    await expect(page.getByText("Wing mirror clipped")).toBeVisible();
    await expect(page.locator("img")).toHaveCount(2);

    await page.getByRole("combobox").selectOption("resolved");
    await expect(page.getByText("Saving…")).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("combobox")).toHaveValue("resolved");
  });
});
