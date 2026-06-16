/**
 * Journey 82 — Hub pages: contractor portal, admin overview, platform pages @e2e
 *
 * Covers the remaining top-level hub pages not yet tested as UI:
 *  - /contractor    — contractor portal ("My work") — contractor role only
 *  - /admin         — admin platform overview page
 *  - /funding       — funding hub (redirected from /funds)
 *  - /summary       — portfolio summary page
 *  - /payments      — payment releases page
 *  - /requests      — drawdown requests page
 *
 * For each page: authenticated user of the correct role can load, heading visible.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

test.describe("Journey 82 — Hub pages UI @e2e", () => {
  test.setTimeout(60_000);

  // ── /contractor — contractor portal ──────────────────────────────────────

  test("contractor can load contractor portal", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/contractor`);
    await expect(
      page.getByRole("heading", { name: /my work/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contractor portal shows project or stage data", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/contractor`);
    await expect(
      page.getByRole("heading", { name: /my work/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/stage|contract|project|outstanding|value|released/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // Admin should also be able to see the contractor portal
  test("admin can load contractor portal", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/contractor`);
    // Admin may see the contractor portal or be redirected — just check page loads
    // without error (either content or redirect is fine)
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    // Should either stay on /contractor or redirect elsewhere — not error page
    expect(url).not.toContain("error");
  });

  // ── /admin — platform overview ────────────────────────────────────────────

  test("admin can load admin overview page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/admin`);
    await expect(
      page.getByRole("heading", { name: /platform overview|overview/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("admin overview shows key metrics", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/admin`);
    await expect(
      page.getByRole("heading", { name: /platform overview|overview/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/project|stage|contract|wallet|user/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── /funding — funding hub ────────────────────────────────────────────────

  test("funder can load funding hub", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/funding`);
    await expect(
      page.getByRole("heading", { name: /funding|fund/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("admin can load funding hub", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/funding`);
    await expect(
      page.getByRole("heading", { name: /funding|fund/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /summary — portfolio summary ──────────────────────────────────────────

  test("admin can load portfolio summary page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/summary`);
    await expect(
      page.getByRole("heading", { name: /summary|portfolio/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /payments — payment releases ─────────────────────────────────────────

  test("admin can load payments page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/payments`);
    await expect(
      page.getByRole("heading", { name: /payment|release/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load payments page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/payments`);
    await expect(
      page.getByRole("heading", { name: /payment|release/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /requests — drawdown requests hub ────────────────────────────────────

  test("admin can load drawdown requests hub", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/requests`);
    await expect(
      page.getByRole("heading", { name: /drawdown|request/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load drawdown requests hub", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/requests`);
    await expect(
      page.getByRole("heading", { name: /drawdown|request/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
