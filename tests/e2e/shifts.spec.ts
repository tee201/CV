import path from "node:path";
import { test, expect } from "../support/fixtures";
import { resetMockServer, loginAs } from "../support/fixtures";
import { TEST_USERS } from "../support/users";

const PHOTO_FIXTURE = path.join(__dirname, "..", "fixtures", "photo.jpg");
const HEIC_FIXTURE = path.join(__dirname, "..", "fixtures", "photo.heic");

// Defaults to three JPEGs (the common camera-capture case); pass a mixed
// array to exercise iPhone drivers picking HEIC photos from their library —
// see src/lib/image/process-photo.ts, which converts HEIC client-side since
// most non-Safari browsers can't decode it natively.
async function completeInspection(
  page: import("@playwright/test").Page,
  submitLabel: string,
  fixtures: [string, string, string] = [PHOTO_FIXTURE, PHOTO_FIXTURE, PHOTO_FIXTURE],
) {
  const fileInputs = page.locator('input[type="file"]');
  await expect(fileInputs).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await fileInputs.nth(i).setInputFiles(fixtures[i]);
    // processPhoto() must finish (including, for a HEIC file, the on-demand
    // heic2any conversion) before the tile reports "selected" — wait for
    // that per-photo rather than racing all three through at once.
    await expect(page.getByText(/Could not read that photo/)).toHaveCount(0);
  }
  const submit = page.getByRole("button", { name: submitLabel });
  await expect(submit).toBeEnabled();
  await submit.click();
}

test.describe("Shift workflow — personal vehicle", () => {
  test.beforeAll(async () => {
    await resetMockServer();
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.driver1.email, TEST_USERS.driver1.password);
    await expect(page).toHaveURL("/");
  });

  test("starts a shift with a personal vehicle", async ({ page }) => {
    await page.getByRole("link", { name: "Start Shift" }).click();
    await expect(page).toHaveURL("/shift/start");

    await page.getByRole("button", { name: "Personal Vehicle" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Currently checked in")).toBeVisible();
    await expect(page.getByText("Personal vehicle")).toBeVisible();
  });

  test("cannot start a second active shift", async ({ page }) => {
    // The previous test left driver1 checked in. Visiting the start page
    // directly must bounce back to the dashboard server-side (StartShiftPage
    // redirects when an active attendance record already exists) rather than
    // let a second one begin.
    await page.goto("/shift/start");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Currently checked in")).toBeVisible();
  });

  test("ends the personal-vehicle shift", async ({ page }) => {
    await page.getByRole("link", { name: "End Shift" }).click();
    await expect(page).toHaveURL("/shift/end");

    await page.getByRole("button", { name: "End Shift" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Currently checked out")).toBeVisible();
    await expect(page.getByText("Not on shift")).toBeVisible();
  });
});

test.describe("Shift workflow — company vehicle (3-photo handover)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.driver2.email, TEST_USERS.driver2.password);
    await expect(page).toHaveURL("/");
  });

  test("starts a shift with a company vehicle after a 3-photo inspection", async ({ page }) => {
    await page.getByRole("link", { name: "Start Shift" }).click();
    await page.getByRole("button", { name: "Company Vehicle" }).click();
    await expect(page.getByText("Select vehicle")).toBeVisible();

    await page.getByRole("button", { name: "Continue to photo check" }).click();
    await expect(page.getByText(/Take a photo of each area/)).toBeVisible();

    // Mixed HEIC/JPEG, matching a real iPhone driver picking photos from
    // their library rather than shooting fresh through the camera prompt.
    await completeInspection(page, "Submit inspection & start shift", [HEIC_FIXTURE, PHOTO_FIXTURE, HEIC_FIXTURE]);

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Currently checked in")).toBeVisible();
    await expect(page.getByText("Company vehicle")).toBeVisible();
  });

  test("ends a company-vehicle shift after a 3-photo inspection", async ({ page }) => {
    await page.getByRole("link", { name: "End Shift" }).click();
    await expect(page).toHaveURL("/shift/end");
    await expect(page.getByText(/leaving it before your shift ends/)).toBeVisible();

    await page.getByRole("button", { name: "Start end-of-shift photo check" }).click();
    await completeInspection(page, "Submit inspection & end shift");

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Currently checked out")).toBeVisible();
  });
});
