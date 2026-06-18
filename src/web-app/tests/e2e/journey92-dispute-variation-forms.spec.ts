/**
 * Journey 92 — Raise dispute form, dispute detail, submit variation form @e2e
 *
 * Covers:
 *  - /projects/[id]/stages/[stageId]/disputes/new       — "Raise dispute" page
 *  - /projects/[id]/stages/[stageId]/disputes/[id]      — "Dispute" detail page
 *  - /projects/[id]/stages/[stageId]/variations/new     — "Submit variation" page
 *  - /projects/[id]/stages/[stageId]/variations/[id]    — variation detail page
 *
 * Seeded data: project 301, stage 501
 * For dispute detail + variation detail, we need to fetch existing IDs first.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const STAGE_ID   = "00000000-0000-0000-0000-000000000501";

function stageUrl(sub: string) {
  return `${BASE}/projects/${PROJECT_ID}/stages/${STAGE_ID}/${sub}`;
}

test.describe("Journey 92 — Dispute + variation form pages @e2e", () => {
  test.setTimeout(60_000);

  // ── Raise dispute page ────────────────────────────────────────────────────

  test("admin can load raise dispute page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("disputes/new"));
    await expect(
      page.getByRole("heading", { name: /raise dispute/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("raise dispute page has back link to stage", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("disputes/new"));
    await expect(
      page.getByRole("heading", { name: /raise dispute/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}/stages/${STAGE_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("raise dispute page shows form fields", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("disputes/new"));
    await expect(
      page.getByRole("heading", { name: /raise dispute/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator("textarea, input, select").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("contractor can load raise dispute page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(stageUrl("disputes/new"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── Dispute detail page ───────────────────────────────────────────────────

  test("admin can load stage disputes list page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("disputes"));
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("dispute detail page loads if seeded dispute exists", async ({ page }) => {
    await signIn(page, "admin");
    // Fetch disputes for this stage
    const res  = await page.request.get(`${BASE}/api/disputes?stageId=${STAGE_ID}`);
    const body = await res.json() as { disputes: { id: string }[] };
    if (!body.disputes || body.disputes.length === 0) return; // Skip if no disputes
    const disputeId = body.disputes[0].id;
    await page.goto(stageUrl(`disputes/${disputeId}`));
    await expect(
      page.getByRole("heading", { name: /dispute/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Submit variation page ─────────────────────────────────────────────────

  test("admin can load submit variation page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("variations/new"));
    await expect(
      page.getByRole("heading", { name: /submit variation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("submit variation page has back link to stage", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("variations/new"));
    await expect(
      page.getByRole("heading", { name: /submit variation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}/stages/${STAGE_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("submit variation page shows form fields", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("variations/new"));
    await expect(
      page.getByRole("heading", { name: /submit variation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator("textarea, input, select").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("contractor can load submit variation page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(stageUrl("variations/new"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── Variation detail page ─────────────────────────────────────────────────

  test("variation detail page loads if seeded variation exists", async ({ page }) => {
    await signIn(page, "admin");
    // Fetch variations for this stage
    const res  = await page.request.get(`${BASE}/api/variations?stageId=${STAGE_ID}`);
    const body = await res.json() as { variations: { id: string }[] };
    if (!body.variations || body.variations.length === 0) return; // Skip if no variations
    const variationId = body.variations[0].id;
    await page.goto(stageUrl(`variations/${variationId}`));
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });
});
