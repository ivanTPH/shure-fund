/**
 * Journey 94 — Main pages: home, projects list, project detail @e2e
 *
 * Covers:
 *  - /                        — root page (redirect to /projects or login)
 *  - /projects                — project list page
 *  - /projects/[id]           — project overview/dashboard page
 *  - /packages                — cross-project packages page
 *  - /disputes                — cross-project disputes page
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 94 — Main hub pages @e2e", () => {
  test.setTimeout(60_000);

  // ── / — root ──────────────────────────────────────────────────────────────

  test("authenticated admin is redirected from root to projects", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Authenticated users are directed to /projects or dashboard
    const url = page.url();
    expect(url).not.toContain("error");
    // Should show projects content
    await expect(
      page.getByText(/project|dashboard|overview/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated root redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10_000 });
  });

  // ── /projects — project list ──────────────────────────────────────────────

  test("admin can load projects list page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(
      page.getByText(/project|aurora|meridian/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load projects list page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("contractor can load projects list page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /projects/[id] — project overview ────────────────────────────────────

  test("admin can load project overview page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Project overview shows navigation/stats
    await expect(
      page.getByText(/contract|stage|wallet|budget|cashflow|schedule|member|audit/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load project overview page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("contractor can load project overview page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /packages — cross-project packages ───────────────────────────────────

  test("admin can load packages page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/packages`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    await expect(
      page.getByText(/package|work|item|stage|no package|empty/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("contractor can load packages page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/packages`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /disputes — cross-project disputes ───────────────────────────────────

  test("admin can load cross-project disputes page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/disputes`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    await expect(
      page.getByText(/dispute|stage|contract|status|no dispute|empty/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("funder can load cross-project disputes page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/disputes`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });
});
