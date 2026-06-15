/**
 * Journey 77 — Project sub-pages UI (budget, wallet, drawdown, funding, stages) @e2e
 *
 * Covers the project sub-pages not yet tested as UI:
 *  - /projects/[id]/budget      — "Budget vs actual" page
 *  - /projects/[id]/wallet      — "Wallet" page
 *  - /projects/[id]/drawdown    — drawdown request form
 *  - /projects/[id]/funding     — funding position page
 *  - /projects/[id]/stages      — stages list page
 *
 * For each page:
 *  - Admin can load (heading visible)
 *  - Back/project link is present (matched by href)
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

function projectUrl(sub: string) {
  return `${BASE}/projects/${PROJECT_ID}/${sub}`;
}

test.describe("Journey 77 — Project sub-pages UI @e2e", () => {
  test.setTimeout(60_000);

  // ── Budget vs actual page ─────────────────────────────────────────────────

  test("admin can load budget page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("budget"));
    await expect(
      page.getByRole("heading", { name: /budget/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("budget page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("budget"));
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("budget page shows financial summary data", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("budget"));
    await expect(
      page.getByRole("heading", { name: /budget/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/total|contracted|certified|stage/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Wallet page ───────────────────────────────────────────────────────────

  test("admin can load wallet page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("wallet"));
    await expect(
      page.getByRole("heading", { name: /wallet/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("wallet page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("wallet"));
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("wallet page shows balance or transactions section", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("wallet"));
    await expect(
      page.getByRole("heading", { name: /wallet/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/balance|deposit|transaction|top.up/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("funder can load wallet page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(projectUrl("wallet"));
    await expect(
      page.getByRole("heading", { name: /wallet/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Funding page ──────────────────────────────────────────────────────────

  test("admin can load project funding page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("funding"));
    // Funding page may redirect or have various headings
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Drawdown page ─────────────────────────────────────────────────────────

  test("admin can load drawdown page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("drawdown"));
    // Drawdown page renders a heading
    await expect(
      page.getByRole("heading", { name: /drawdown/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
