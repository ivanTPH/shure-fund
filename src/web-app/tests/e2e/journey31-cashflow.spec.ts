/**
 * Journey 31 — Cash flow forecast @e2e
 *
 * Covers GET /api/projects/[id]/cashflow:
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *
 * Access:
 *  - Admin → 200 with correct shape
 *  - Funder → 200
 *  - Developer → 200
 *  - Commercial → 200 (same lazy-membership access as budget/schedule)
 *
 * Shape:
 *  - Response has months[] and totals{}
 *  - totals has totalProjected, totalActual, outstanding (all numbers)
 *  - Each month has: month (YYYY-MM string), projectedValue, projectedCount,
 *    actualPaid, actualCount, cumulativeProjected, cumulativeActual
 *
 * Math invariants:
 *  - totals.outstanding === totals.totalProjected
 *  - Sum of months[].projectedValue === totals.totalProjected
 *  - Sum of months[].actualPaid     === totals.totalActual
 *  - months are sorted chronologically (YYYY-MM ascending)
 *  - cumulativeProjected is non-decreasing
 *  - cumulativeActual    is non-decreasing
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/cashflow`;

type CashflowMonth = {
  month:               string;
  projectedValue:      number;
  projectedCount:      number;
  actualPaid:          number;
  actualCount:         number;
  cumulativeProjected: number;
  cumulativeActual:    number;
};

type CashflowBody = {
  months: CashflowMonth[];
  totals: { totalProjected: number; totalActual: number; outstanding: number };
};

test.describe("Journey 31 — Cash flow forecast @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated cashflow request returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("contractor cannot access cashflow (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Access ─────────────────────────────────────────────────────────────────

  test("admin can GET cashflow (200)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder can GET cashflow (200)", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer can GET cashflow (200)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("commercial can GET cashflow (200)", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Shape ──────────────────────────────────────────────────────────────────

  test("admin GET cashflow has correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as CashflowBody;

    expect(Array.isArray(body.months)).toBe(true);
    expect(body.totals).toBeDefined();
    expect(typeof body.totals.totalProjected).toBe("number");
    expect(typeof body.totals.totalActual).toBe("number");
    expect(typeof body.totals.outstanding).toBe("number");
  });

  test("each month has required numeric fields", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    for (const m of body.months) {
      expect(typeof m.month).toBe("string");
      expect(/^\d{4}-\d{2}$/.test(m.month)).toBe(true);
      expect(typeof m.projectedValue).toBe("number");
      expect(typeof m.projectedCount).toBe("number");
      expect(typeof m.actualPaid).toBe("number");
      expect(typeof m.actualCount).toBe("number");
      expect(typeof m.cumulativeProjected).toBe("number");
      expect(typeof m.cumulativeActual).toBe("number");
    }
  });

  // ── Math invariants ────────────────────────────────────────────────────────

  test("totals.outstanding === totals.totalProjected", async ({ page }) => {
    await signIn(page, "admin");
    const { totals } = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    expect(totals.outstanding).toBe(totals.totalProjected);
  });

  test("sum of projectedValue === totals.totalProjected", async ({ page }) => {
    await signIn(page, "admin");
    const { months, totals } = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    const sum = months.reduce((s, m) => s + m.projectedValue, 0);
    expect(sum).toBeCloseTo(totals.totalProjected, 0);
  });

  test("sum of actualPaid === totals.totalActual", async ({ page }) => {
    await signIn(page, "admin");
    const { months, totals } = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    const sum = months.reduce((s, m) => s + m.actualPaid, 0);
    expect(sum).toBeCloseTo(totals.totalActual, 0);
  });

  test("months are sorted chronologically", async ({ page }) => {
    await signIn(page, "admin");
    const { months } = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    for (let i = 1; i < months.length; i++) {
      expect(months[i].month >= months[i - 1].month).toBe(true);
    }
  });

  test("cumulativeProjected and cumulativeActual are non-decreasing", async ({ page }) => {
    await signIn(page, "admin");
    const { months } = await (await page.request.get(ENDPOINT)).json() as CashflowBody;
    for (let i = 1; i < months.length; i++) {
      expect(months[i].cumulativeProjected).toBeGreaterThanOrEqual(months[i - 1].cumulativeProjected);
      expect(months[i].cumulativeActual).toBeGreaterThanOrEqual(months[i - 1].cumulativeActual);
    }
  });
});
