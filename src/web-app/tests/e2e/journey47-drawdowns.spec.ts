/**
 * Journey 47 — Cross-project drawdown requests @e2e
 *
 * Covers GET /api/drawdowns:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Contractor GET → 403
 *  - Commercial GET → 403
 *
 * Query validation:
 *  - ?status=invalid → 400
 *  - ?status=pending → 200 (valid filter)
 *
 * GET shape:
 *  - Returns { requests: [], summary: { total, pending, approved, rejected } }
 *  - summary counts are numbers
 *
 * Roles:
 *  - funder, developer, admin all get 200
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has drawdown_requests seeded in the DB
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/drawdowns`;

test.describe("Journey 47 — Drawdown requests @e2e", () => {
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

  test("commercial GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Query validation ─────────────────────────────────────────────────────

  test("invalid status filter returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=invalid`);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test("valid status filter returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=pending`);
    expect(res.status()).toBe(200);
  });

  test("status=all returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=all`);
    expect(res.status()).toBe(200);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      requests: unknown[];
      summary: { total: number; pending: number; approved: number; rejected: number };
    };
    expect(Array.isArray(body.requests)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.pending).toBe("number");
    expect(typeof body.summary.approved).toBe("number");
    expect(typeof body.summary.rejected).toBe("number");
  });

  test("funder GET succeeds", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET succeeds", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Field types ──────────────────────────────────────────────────────────

  test("requests have correct field types when present", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      requests: Array<{
        id: string;
        amount: number;
        status: string;
        projectId: string;
        createdAt: string;
      }>;
    };
    if (body.requests.length > 0) {
      const r = body.requests[0];
      expect(typeof r.id).toBe("string");
      expect(typeof r.amount).toBe("number");
      expect(typeof r.status).toBe("string");
      expect(typeof r.projectId).toBe("string");
      expect(typeof r.createdAt).toBe("string");
    }
  });

  // ── Summary invariant ────────────────────────────────────────────────────

  test("summary.total >= pending + approved + rejected", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { total: number; pending: number; approved: number; rejected: number };
    };
    const { total, pending, approved, rejected } = body.summary;
    expect(total).toBeGreaterThanOrEqual(pending + approved + rejected);
  });
});
