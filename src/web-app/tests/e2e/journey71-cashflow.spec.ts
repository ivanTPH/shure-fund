/**
 * Journey 71 — Cashflow API & page @e2e
 *
 * Covers:
 *  - GET /api/projects/[projectId]/cashflow
 *  - /projects/[id]/cashflow page
 *
 * Auth:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Commercial/funder/developer/admin → 200
 *
 * Response shape:
 *  - { months: CashflowMonth[], totals: { totalProjected, totalActual, outstanding } }
 *  - Each month: { month (YYYY-MM), projectedValue, projectedCount, actualPaid,
 *                  actualCount, cumulativeProjected, cumulativeActual }
 *
 * Invariants:
 *  - months are sorted chronologically (YYYY-MM string order)
 *  - totals.totalProjected = sum(months[*].projectedValue)
 *  - totals.totalActual    = sum(months[*].actualPaid)
 *  - last month's cumulativeActual = totals.totalActual
 *  - all numeric fields >= 0
 *  - month strings match YYYY-MM format
 *
 * Seeded data: project 301 has contracts with stages
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/cashflow`;
const PAGE_URL   = `${BASE}/projects/${PROJECT_ID}/cashflow`;

type CashflowMonth = {
  month: string;
  projectedValue: number;
  projectedCount: number;
  actualPaid: number;
  actualCount: number;
  cumulativeProjected: number;
  cumulativeActual: number;
};

type CashflowBody = {
  months: CashflowMonth[];
  totals: { totalProjected: number; totalActual: number; outstanding: number };
};

test.describe("Journey 71 — Cashflow API & page @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Allowed roles ────────────────────────────────────────────────────────

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("commercial GET returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Response shape ───────────────────────────────────────────────────────

  test("response has months array and totals", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as CashflowBody;
    expect(Array.isArray(body.months)).toBe(true);
    expect(typeof body.totals).toBe("object");
    expect(typeof body.totals.totalProjected).toBe("number");
    expect(typeof body.totals.totalActual).toBe("number");
    expect(typeof body.totals.outstanding).toBe("number");
  });

  test("totals are all non-negative", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    expect(body.totals.totalProjected).toBeGreaterThanOrEqual(0);
    expect(body.totals.totalActual).toBeGreaterThanOrEqual(0);
    expect(body.totals.outstanding).toBeGreaterThanOrEqual(0);
  });

  test("month fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    if (body.months.length === 0) return;
    const m = body.months[0];
    expect(typeof m.month).toBe("string");
    expect(typeof m.projectedValue).toBe("number");
    expect(typeof m.projectedCount).toBe("number");
    expect(typeof m.actualPaid).toBe("number");
    expect(typeof m.actualCount).toBe("number");
    expect(typeof m.cumulativeProjected).toBe("number");
    expect(typeof m.cumulativeActual).toBe("number");
  });

  test("month strings match YYYY-MM format", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    for (const m of body.months) {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  test("months are sorted chronologically", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    if (body.months.length < 2) return;
    for (let i = 1; i < body.months.length; i++) {
      expect(body.months[i].month >= body.months[i - 1].month).toBe(true);
    }
  });

  test("totals.totalProjected = sum of projectedValues", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    const sum  = body.months.reduce((s, m) => s + m.projectedValue, 0);
    expect(Math.round(body.totals.totalProjected)).toBe(Math.round(sum));
  });

  test("totals.totalActual = sum of actualPaid", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    const sum  = body.months.reduce((s, m) => s + m.actualPaid, 0);
    expect(Math.round(body.totals.totalActual)).toBe(Math.round(sum));
  });

  test("last month cumulativeActual equals totalActual", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    if (body.months.length === 0) return;
    const last = body.months[body.months.length - 1];
    expect(Math.round(last.cumulativeActual)).toBe(Math.round(body.totals.totalActual));
  });

  test("all month numeric values are non-negative", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;
    for (const m of body.months) {
      expect(m.projectedValue).toBeGreaterThanOrEqual(0);
      expect(m.projectedCount).toBeGreaterThanOrEqual(0);
      expect(m.actualPaid).toBeGreaterThanOrEqual(0);
      expect(m.actualCount).toBeGreaterThanOrEqual(0);
    }
  });

  // ── Cashflow page ────────────────────────────────────────────────────────

  test("admin can load cashflow page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /cash\s*flow/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("cashflow page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    // Back link shows project name (← <project name>), match by href
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("cashflow page shows totals section", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /cash\s*flow/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/projected|actual|total/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
