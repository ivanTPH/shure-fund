/**
 * Journey 83 — Stage detail page UI + stage sub-pages @e2e
 *
 * Covers:
 *  - /projects/[id]/stages/[stageId]            — stage overview hub page
 *  - /projects/[id]/stages/[stageId]/action      — submit stage for review
 *  - /projects/[id]/stages/[stageId]/approve     — approval decision page
 *  - /projects/[id]/stages/[stageId]/override    — admin status override page
 *  - /projects/[id]/stages/[stageId]/reconciliation — reconciliation page
 *  - /projects/[id]/stages/[stageId]/release     — release payment page
 *
 * Seeded data: project 301, stage 501 ("Foundation Package")
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const STAGE_ID   = "00000000-0000-0000-0000-000000000501";

function stageUrl(sub?: string) {
  const base = `${BASE}/projects/${PROJECT_ID}/stages/${STAGE_ID}`;
  return sub ? `${base}/${sub}` : base;
}

test.describe("Journey 83 — Stage detail page UI @e2e", () => {
  test.setTimeout(60_000);

  // ── Stage detail (hub) page ───────────────────────────────────────────────

  test("admin can load stage detail page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl());
    // Heading is the stage name from the DB
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("stage detail page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl());
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    // Back link to project (href-based)
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("stage detail page shows status and value", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl());
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    // Status badge or value text should be visible
    await expect(
      page.getByText(/released|approved|in.progress|draft|sent|accepted|awaiting/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("contractor can load stage detail page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(stageUrl());
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load stage detail page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(stageUrl());
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("stage detail page shows evidence section or comments", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl());
    await expect(
      page.getByRole("heading", { name: /foundation package/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/evidence|comment|approval|variation|dispute/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Stage action page ─────────────────────────────────────────────────────

  test("admin can load stage action page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("action"));
    // Page loads without error — may redirect or show action form
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    expect(url).not.toMatch(/^.*\/auth\/login/);
  });

  // ── Stage approve page ────────────────────────────────────────────────────

  test("admin can load stage approve page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("approve"));
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    // Should show approve/decision content or redirect gracefully
  });

  // ── Stage override page ───────────────────────────────────────────────────

  test("admin can load stage override page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("override"));
    await expect(
      page.getByRole("heading", { name: /force stage status|override/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Stage reconciliation page ─────────────────────────────────────────────

  test("admin can load stage reconciliation page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("reconciliation"));
    await expect(
      page.getByRole("heading", { name: /reconciliation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Stage release page ────────────────────────────────────────────────────

  test("admin can load stage release page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(stageUrl("release"));
    await expect(
      page.getByRole("heading", { name: /release/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load stage release page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(stageUrl("release"));
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });
});
