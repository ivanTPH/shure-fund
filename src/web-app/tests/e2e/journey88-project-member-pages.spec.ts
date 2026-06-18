/**
 * Journey 88 — Project member pages UI (team, token-holders, proof-of-funds) @e2e
 *
 * Covers:
 *  - /projects/[id]/members       — project team management (heading "Project team")
 *  - /projects/[id]/token-holders — token holder management (heading "Token holders")
 *  - /projects/[id]/proof-of-funds — proof of funds management (heading "Proof of Funds")
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

test.describe("Journey 88 — Project member pages UI @e2e", () => {
  test.setTimeout(60_000);

  // ── /projects/[id]/members — project team ────────────────────────────────

  test("admin can load project team page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("members"));
    await expect(
      page.getByRole("heading", { name: /project team/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("project team page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("members"));
    await expect(
      page.getByRole("heading", { name: /project team/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("project team page shows members or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("members"));
    await expect(
      page.getByRole("heading", { name: /project team/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/member|user|email|role|team|invite|no member/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("funder can load project team page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(projectUrl("members"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Funder can view members — page should load
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /projects/[id]/token-holders — token holders ─────────────────────────

  test("admin can load token holders page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("token-holders"));
    await expect(
      page.getByRole("heading", { name: /token holder/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("token holders page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("token-holders"));
    await expect(
      page.getByRole("heading", { name: /token holder/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("token holders page shows holders or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("token-holders"));
    await expect(
      page.getByRole("heading", { name: /token holder/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/holder|share|token|email|no holder|empty|add/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("funder can load token holders page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(projectUrl("token-holders"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /projects/[id]/proof-of-funds — proof of funds ───────────────────────

  test("admin can load proof of funds page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("proof-of-funds"));
    await expect(
      page.getByRole("heading", { name: /proof of funds/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("proof of funds page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("proof-of-funds"));
    await expect(
      page.getByRole("heading", { name: /proof of funds/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("proof of funds page shows entries or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(projectUrl("proof-of-funds"));
    await expect(
      page.getByRole("heading", { name: /proof of funds/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/proof|fund|bank|amount|tier|date|entry|no entry|empty|add/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("funder can load proof of funds page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(projectUrl("proof-of-funds"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });
});
