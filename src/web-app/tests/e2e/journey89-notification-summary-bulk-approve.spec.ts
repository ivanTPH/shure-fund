/**
 * Journey 89 — Notification summary API, bulk approval API, account payments page @e2e
 *
 * Covers:
 *  - GET  /api/notifications/summary                      — badge counts
 *  - POST /api/projects/[projectId]/approvals/bulk        — bulk stage approval
 *  - /account/payments                                    — "My payments" page
 *
 * GET /api/notifications/summary:
 *  - Unauthenticated → 401
 *  - Any auth user → 200 { unread: number, actionRequired: number }
 *
 * POST /api/projects/[projectId]/approvals/bulk:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Missing stageIds → 400
 *  - Too many stageIds (> 50) → 400
 *  - Invalid decision → 400
 *  - "returned" without notes → 400
 *  - Non-existent stageIds → results[].success = false
 *  - Valid → 200 { results, succeeded, failed }
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

const SUMMARY_URL = `${BASE}/api/notifications/summary`;
const BULK_URL    = `${BASE}/api/projects/${PROJECT_ID}/approvals/bulk`;

test.describe("Journey 89 — Notification summary, bulk approval, payments page @e2e", () => {
  test.setTimeout(60_000);

  // ── GET /api/notifications/summary — auth ─────────────────────────────────

  test("unauthenticated GET summary returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(SUMMARY_URL);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/notifications/summary — happy path ───────────────────────────

  test("admin can GET notification summary", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(SUMMARY_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(typeof body.unread).toBe("number");
    expect(typeof body.actionRequired).toBe("number");
    expect(body.unread).toBeGreaterThanOrEqual(0);
    expect(body.actionRequired).toBeGreaterThanOrEqual(0);
    // actionRequired is always <= unread
    expect(body.actionRequired).toBeLessThanOrEqual(body.unread);
  });

  test("funder can GET notification summary", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(SUMMARY_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(typeof body.unread).toBe("number");
    expect(typeof body.actionRequired).toBe("number");
  });

  test("contractor can GET notification summary", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(SUMMARY_URL);
    expect(res.status()).toBe(200);
  });

  // ── POST /api/.../approvals/bulk — auth ───────────────────────────────────

  test("unauthenticated POST bulk returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(BULK_URL, {
      data: { stageIds: ["id1"], decision: "approved" },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor POST bulk returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(BULK_URL, {
      data: { stageIds: ["id1"], decision: "approved" },
    });
    expect(res.status()).toBe(403);
  });

  // ── POST /api/.../approvals/bulk — validation ─────────────────────────────

  test("POST bulk without stageIds returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, { data: { decision: "approved" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/stageIds/i);
  });

  test("POST bulk with empty stageIds returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, { data: { stageIds: [], decision: "approved" } });
    expect(res.status()).toBe(400);
  });

  test("POST bulk with > 50 stages returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const stageIds = Array.from({ length: 51 }, (_, i) => `id-${i}`);
    const res = await page.request.post(BULK_URL, { data: { stageIds, decision: "approved" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/50|maximum/i);
  });

  test("POST bulk with invalid decision returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, {
      data: { stageIds: ["id1"], decision: "cleared" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/approved|rejected|returned/i);
  });

  test("POST bulk 'returned' without notes returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, {
      data: { stageIds: ["id1"], decision: "returned" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/notes/i);
  });

  // ── POST /api/.../approvals/bulk — happy path ─────────────────────────────

  test("admin POST bulk with non-existent stage returns results with failed", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, {
      data: {
        stageIds: ["00000000-0000-0000-0000-999999999999"],
        decision: "approved",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { results: { stageId: string; success: boolean }[]; succeeded: number; failed: number };
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.failed).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.results[0].success).toBe(false);
  });

  test("POST bulk response has correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(BULK_URL, {
      data: {
        stageIds: ["00000000-0000-0000-0000-000000000000"],
        decision: "approved",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { results: unknown[]; succeeded: number; failed: number };
    expect(typeof body.succeeded).toBe("number");
    expect(typeof body.failed).toBe("number");
    expect(body.succeeded + body.failed).toBe(body.results.length);
  });

  // ── /account/payments — my payments page ─────────────────────────────────

  test("admin can load account payments page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/account/payments`);
    await expect(
      page.getByRole("heading", { name: /my payment/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load account payments page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/account/payments`);
    await expect(
      page.getByRole("heading", { name: /my payment/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contractor can load account payments page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/account/payments`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("payments page shows releases or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/account/payments`);
    await expect(
      page.getByRole("heading", { name: /my payment/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/payment|release|amount|stage|no payment|empty/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
