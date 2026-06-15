/**
 * Journey 78 — Settings pages (user + project) @e2e
 *
 * Covers:
 *  - /settings              — user account settings page
 *  - /projects/[id]/settings — project settings page
 *
 * User settings (/settings):
 *  - Admin can load page with heading "Settings"
 *  - Shows display name section
 *  - Shows password change section
 *  - Shows notification preferences section
 *
 * Project settings (/projects/[id]/settings):
 *  - Admin can load page with heading "Project settings"
 *  - Shows project name field
 *  - Shows back link (by href to project dashboard)
 *  - Non-admin roles may see restricted view or redirect
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const SETTINGS_URL         = `${BASE}/settings`;
const PROJECT_SETTINGS_URL = `${BASE}/projects/${PROJECT_ID}/settings`;

test.describe("Journey 78 — Settings pages (user + project) @e2e", () => {
  test.setTimeout(60_000);

  // ── User settings page (/settings) ───────────────────────────────────────

  test("admin can load settings page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load settings page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contractor can load settings page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("settings page shows display name section", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/display name|full name/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("settings page shows password section", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/password/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("settings page shows notification preferences", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/notification/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Project settings page (/projects/[id]/settings) ──────────────────────

  test("admin can load project settings page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PROJECT_SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /project settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("project settings page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PROJECT_SETTINGS_URL);
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("project settings page shows project name field", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PROJECT_SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /project settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/project name|name/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("developer can load project settings page", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PROJECT_SETTINGS_URL);
    await expect(
      page.getByRole("heading", { name: /project settings/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
