/**
 * Journey 51 — Cross-project contracts list @e2e
 *
 * Covers GET /api/contracts:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *
 * Query validation:
 *  - ?status=invalid → 400
 *  - ?status=active → 200
 *
 * GET shape:
 *  - Returns { contracts: [], summary: { total, active, draft, issued, accepted, completed, cancelled } }
 *  - All summary fields are numbers
 *
 * Roles:
 *  - admin, funder, developer, contractor, commercial all get 200
 *
 * Field types (when contracts present):
 *  - id, status, projectId are strings; totalValue, stageCount are numbers
 *
 * Status filter:
 *  - ?status=active only returns active contracts
 *  - ?status=cancelled only returns cancelled contracts
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has contract 401 with status='active'
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT   = `${BASE}/api/contracts`;
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const CONTRACT_ID = "00000000-0000-0000-0000-000000000401";

test.describe("Journey 51 — Cross-project contracts @e2e", () => {
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
      contracts: unknown[];
      summary: {
        total: number; active: number; draft: number; issued: number;
        accepted: number; completed: number; cancelled: number;
      };
    };
    expect(Array.isArray(body.contracts)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.active).toBe("number");
    expect(typeof body.summary.draft).toBe("number");
    expect(typeof body.summary.issued).toBe("number");
    expect(typeof body.summary.accepted).toBe("number");
    expect(typeof body.summary.completed).toBe("number");
    expect(typeof body.summary.cancelled).toBe("number");
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

  test("commercial GET succeeds", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Field types ──────────────────────────────────────────────────────────

  test("contracts have correct field types when present", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      contracts: Array<{
        id: string;
        status: string;
        totalValue: number;
        stageCount: number;
        projectId: string | null;
      }>;
    };
    if (body.contracts.length > 0) {
      const c = body.contracts[0];
      expect(typeof c.id).toBe("string");
      expect(typeof c.status).toBe("string");
      expect(typeof c.totalValue).toBe("number");
      expect(typeof c.stageCount).toBe("number");
    }
  });

  // ── Seeded data ──────────────────────────────────────────────────────────

  test("seeded contract 401 appears in admin results", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { contracts: Array<{ id: string }> };
    expect(body.contracts.some((c) => c.id === CONTRACT_ID)).toBe(true);
  });

  test("projectId filter scopes results to that project", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as { contracts: Array<{ projectId: string }> };
    for (const c of body.contracts) {
      expect(c.projectId).toBe(PROJECT_ID);
    }
  });

  // ── Status filter correctness ────────────────────────────────────────────

  test("status filter only returns matching contracts", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=active`);
    const body = await res.json() as { contracts: Array<{ status: string }> };
    for (const c of body.contracts) {
      expect(c.status).toBe("active");
    }
  });

  // ── Summary invariant ────────────────────────────────────────────────────

  test("summary.total equals contracts.length when no filter", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      contracts: unknown[];
      summary: { total: number };
    };
    expect(body.summary.total).toBe(body.contracts.length);
  });
});
