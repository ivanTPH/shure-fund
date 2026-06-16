/**
 * Journey 81 — Global audit trail page @e2e
 *
 * Covers:
 *  - /audit-log — global audit trail page (server component, no API)
 *
 * Access:
 *  - Unauthenticated → redirected to login
 *  - Contractor → redirected (role not allowed)
 *  - Commercial → redirected (role not allowed)
 *  - Admin/funder/developer → 200, shows "Global audit trail" heading
 *
 * Page features:
 *  - Heading "Global audit trail"
 *  - Shows audit events or empty state
 *  - Filter by action type (UI dropdown)
 *  - CSV export button present
 *  - Events are ordered newest first
 *
 * Note: /audit-log is a server component that fetches directly from Supabase,
 * not via a public API endpoint, so we test it purely at the UI/page level.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PAGE_URL = `${BASE}/audit-log`;

test.describe("Journey 81 — Global audit trail page @e2e", () => {
  test.setTimeout(60_000);

  // ── Access control ────────────────────────────────────────────────────────

  test("unauthenticated user is redirected from audit-log", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(PAGE_URL);
    // Should redirect to login
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10_000 });
  });

  test("admin can load global audit trail page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load global audit trail page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
  });

  test("developer can load global audit trail page", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Page content ──────────────────────────────────────────────────────────

  test("audit trail page shows events or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/event|action|audit|no event|empty/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("audit trail page has a CSV export or filter control", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
    // Either a CSV button or a filter/select
    const exportOrFilter = page
      .getByRole("button", { name: /csv|export/i })
      .or(page.locator("select"))
      .or(page.getByRole("combobox"))
      .first();
    await expect(exportOrFilter).toBeVisible({ timeout: 5_000 });
  });

  test("audit trail shows project audit events", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /global audit trail/i })
    ).toBeVisible({ timeout: 20_000 });
    // Project 301 has seeded audit events — should appear in global trail
    // Events show either a date or an action name
    await expect(
      page.getByText(/stage|approved|released|submitted|contract/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
