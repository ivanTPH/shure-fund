/**
 * Journey 68 — Token payments API @e2e
 *
 * Covers GET /api/token-payments
 *
 * Two modes:
 *  a) Personal (no ?projectId): any authenticated user sees their own payments
 *  b) Project-scoped (?projectId=<uuid>): funder/developer/admin only → 200;
 *     contractor/commercial → 403
 *
 * Auth:
 *  - Unauthenticated → 401
 *
 * Response shape:
 *  - { payments: TokenPayment[], summary: { total, count, projectCount } }
 *  - payments: array (may be empty)
 *  - Each payment has: id, amount, sharePct, reference, paidAt, projectId, stageId, userId, projectName, stageName
 *  - summary.count === payments.length
 *  - summary.total === sum(payment.amount)
 *  - summary.projectCount === number of distinct projectIds
 *
 * Invariants:
 *  - summary.total >= 0
 *  - summary.count >= 0
 *  - summary.count === payments.length
 *  - summary.projectCount <= summary.count
 *
 * Seeded data:
 *  - Project 301 has token_payment records from seed.sql
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/token-payments`;

test.describe("Journey 68 — Token payments API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Personal mode — all roles get 200 ───────────────────────────────────

  test("admin personal GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder personal GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer personal GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("contractor personal GET returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("commercial personal GET returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Personal mode — response shape ───────────────────────────────────────

  test("personal GET response has payments array and summary", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      payments: unknown[];
      summary: { total: number; count: number; projectCount: number };
    };
    expect(Array.isArray(body.payments)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.count).toBe("number");
    expect(typeof body.summary.projectCount).toBe("number");
  });

  test("summary.count equals payments.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { payments: unknown[]; summary: { count: number } };
    expect(body.summary.count).toBe(body.payments.length);
  });

  test("summary.total >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { summary: { total: number } };
    expect(body.summary.total).toBeGreaterThanOrEqual(0);
  });

  test("summary.projectCount <= summary.count", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { summary: { total: number; count: number; projectCount: number } };
    expect(body.summary.projectCount).toBeLessThanOrEqual(body.summary.count);
  });

  test("payment fields have correct types when present", async ({ page }) => {
    await signIn(page, "funder");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as {
      payments: Array<{
        id: string;
        amount: number;
        sharePct: number | null;
        reference: string;
        projectId: string;
        stageId: string | null;
        userId: string;
        paidAt: string;
        projectName: string | null;
        stageName: string | null;
      }>;
    };
    if (body.payments.length === 0) return;
    const p = body.payments[0];
    expect(typeof p.id).toBe("string");
    expect(typeof p.amount).toBe("number");
    expect(typeof p.projectId).toBe("string");
    expect(typeof p.paidAt).toBe("string");
  });

  // ── Project-scoped mode — role guards ────────────────────────────────────

  test("contractor project-scoped GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(403);
  });

  test("commercial project-scoped GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(403);
  });

  test("funder project-scoped GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(200);
  });

  test("developer project-scoped GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(200);
  });

  test("admin project-scoped GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(200);
  });

  // ── Summary invariant: total = sum of amounts ────────────────────────────

  test("summary.total equals sum of payment amounts", async ({ page }) => {
    await signIn(page, "funder");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as {
      payments: Array<{ amount: number }>;
      summary: { total: number };
    };
    const computed = body.payments.reduce((s, p) => s + p.amount, 0);
    expect(Math.round(body.summary.total)).toBe(Math.round(computed));
  });
});
