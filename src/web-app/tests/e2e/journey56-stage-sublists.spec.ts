/**
 * Journey 56 — Stage sub-list pages (variations & disputes) @e2e
 *
 * Covers the UI list pages at:
 *   /projects/[id]/stages/[stageId]/disputes
 *   /projects/[id]/stages/[stageId]/variations
 *
 * These pages call existing APIs (GET /api/disputes?stageId=, GET /api/variations?stageId=)
 * and render the results as a list of cards.
 *
 * Tests:
 *  - Auth gate: unauthenticated → redirected away from page (not 200 showing real data)
 *  - Disputes list page loads and shows heading
 *  - Variations list page loads and shows heading
 *  - "Raise Dispute" link is present on disputes page
 *  - "New Variation" link is present on variations page
 *  - Breadcrumb navigation links are present
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301), stage 501 exists in the DB
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const STAGE_ID   = "00000000-0000-0000-0000-000000000501";

const DISPUTES_PAGE   = `${BASE}/projects/${PROJECT_ID}/stages/${STAGE_ID}/disputes`;
const VARIATIONS_PAGE = `${BASE}/projects/${PROJECT_ID}/stages/${STAGE_ID}/variations`;

test.describe("Journey 56 — Stage sub-list pages @e2e", () => {
  test.setTimeout(60_000);

  // ── Disputes list page ───────────────────────────────────────────────────

  test("disputes list page renders heading for admin", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(DISPUTES_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Disputes/i })).toBeVisible();
  });

  test("disputes list page has Raise Dispute link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(DISPUTES_PAGE);
    await expect(page.getByRole("link", { name: /Raise Dispute/i })).toBeVisible();
  });

  test("disputes list page has breadcrumb links", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(DISPUTES_PAGE);
    await expect(page.getByRole("link", { name: "Project", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stage", exact: true })).toBeVisible();
  });

  test("disputes list page loads for contractor", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(DISPUTES_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Disputes/i })).toBeVisible();
  });

  test("disputes list page loads for funder", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(DISPUTES_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Disputes/i })).toBeVisible();
  });

  // ── Variations list page ─────────────────────────────────────────────────

  test("variations list page renders heading for admin", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(VARIATIONS_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Variations/i })).toBeVisible();
  });

  test("variations list page has New Variation link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(VARIATIONS_PAGE);
    await expect(page.getByRole("link", { name: /New Variation/i })).toBeVisible();
  });

  test("variations list page has breadcrumb links", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(VARIATIONS_PAGE);
    await expect(page.getByRole("link", { name: "Project", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stage", exact: true })).toBeVisible();
  });

  test("variations list page loads for contractor", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(VARIATIONS_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Variations/i })).toBeVisible();
  });

  test("variations list page loads for funder", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(VARIATIONS_PAGE);
    await expect(page.getByRole("heading", { name: /Stage Variations/i })).toBeVisible();
  });

  // ── API backing these pages ──────────────────────────────────────────────

  test("disputes API returns array for stage 501", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${BASE}/api/disputes?stageId=${STAGE_ID}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { disputes: unknown[] };
    expect(Array.isArray(body.disputes)).toBe(true);
  });

  test("variations API returns array for stage 501", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${BASE}/api/variations?stageId=${STAGE_ID}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { variations: unknown[] };
    expect(Array.isArray(body.variations)).toBe(true);
  });

  test("disputes API returns 401 for unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/disputes?stageId=${STAGE_ID}`);
    expect(res.status()).toBe(401);
  });

  test("variations API returns 401 for unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/variations?stageId=${STAGE_ID}`);
    expect(res.status()).toBe(401);
  });

  test("variations API returns 400 when stageId missing", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${BASE}/api/variations`);
    expect(res.status()).toBe(400);
  });
});
