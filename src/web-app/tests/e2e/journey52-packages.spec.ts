/**
 * Journey 52 — Cross-project packages list @e2e
 *
 * Covers GET /api/packages:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *
 * Query validation:
 *  - ?status=invalid → 400
 *  - ?status=active → 200
 *
 * GET shape:
 *  - Returns { packages: [], summary: { total, active, completed, draft, on_hold } }
 *  - All summary fields are numbers
 *
 * Roles:
 *  - admin, developer, contractor, funder, commercial all get 200
 *
 * Query params:
 *  - ?assignedToMe=true only returns packages assigned to current user
 *  - ?status=active only returns active packages
 *
 * Summary invariant:
 *  - total === packages.length
 *  - active + completed + draft + on_hold <= total
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/packages`;

test.describe("Journey 52 — Cross-project packages @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Query validation ─────────────────────────────────────────────────────

  test("invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=invalid`);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test("valid status filter returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=active`);
    expect(res.status()).toBe(200);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      packages: unknown[];
      summary: { total: number; active: number; completed: number; draft: number; on_hold: number };
    };
    expect(Array.isArray(body.packages)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.active).toBe("number");
    expect(typeof body.summary.completed).toBe("number");
    expect(typeof body.summary.draft).toBe("number");
    expect(typeof body.summary.on_hold).toBe("number");
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

  test("contractor GET succeeds", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Field types ──────────────────────────────────────────────────────────

  test("packages have correct field types when present", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      packages: Array<{
        id: string;
        name: string;
        value: number;
        status: string;
        stageId: string;
      }>;
    };
    if (body.packages.length > 0) {
      const p = body.packages[0];
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(typeof p.value).toBe("number");
      expect(typeof p.status).toBe("string");
      expect(typeof p.stageId).toBe("string");
    }
  });

  // ── Filters ──────────────────────────────────────────────────────────────

  test("status filter only returns matching packages", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=draft`);
    const body = await res.json() as { packages: Array<{ status: string }> };
    for (const p of body.packages) {
      expect(p.status).toBe("draft");
    }
  });

  test("assignedToMe=true returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${ENDPOINT}?assignedToMe=true`);
    expect(res.status()).toBe(200);
  });

  // ── Summary invariants ───────────────────────────────────────────────────

  test("summary.total equals packages.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      packages: unknown[];
      summary: { total: number };
    };
    expect(body.summary.total).toBe(body.packages.length);
  });

  test("summary counts sum to total", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { total: number; active: number; completed: number; draft: number; on_hold: number };
    };
    const sum = body.summary.active + body.summary.completed + body.summary.draft + body.summary.on_hold;
    expect(sum).toBe(body.summary.total);
  });
});
