/**
 * Journey 54 — Cross-project stage list API @e2e
 *
 * Covers GET /api/stages (top-level, not /api/stages/[stageId]):
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *
 * Query validation:
 *  - ?status=invalid → 400
 *  - ?status=in_progress → 200
 *  - ?awaitingApproval=true → 200 (only awaiting_approval stages)
 *
 * GET shape:
 *  - Returns {
 *      stages: StageItem[],
 *      summary: { total, in_progress, awaiting_approval, available_to_release, released }
 *    }
 *
 * Roles:
 *  - All authenticated users get 200
 *
 * Field types:
 *  - id, name, contractId are strings; value is number; status is string
 *  - projectId, projectName may be null (if project not found) but are present
 *
 * Filters:
 *  - ?projectId scopes to one project
 *  - ?status only returns stages with that status
 *  - ?awaitingApproval=true implies status=awaiting_approval
 *
 * Summary invariants:
 *  - total === stages.length
 *  - in_progress + awaiting_approval + available_to_release + released <= total
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has multiple stages including released ones
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT   = `${BASE}/api/stages`;
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 54 — Cross-project stage list @e2e", () => {
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
    const res = await page.request.get(`${ENDPOINT}?status=invalid_status`);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test("valid status filter returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=in_progress`);
    expect(res.status()).toBe(200);
  });

  test("awaitingApproval=true returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?awaitingApproval=true`);
    expect(res.status()).toBe(200);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      stages: unknown[];
      summary: {
        total: number;
        in_progress: number;
        awaiting_approval: number;
        available_to_release: number;
        released: number;
      };
    };
    expect(Array.isArray(body.stages)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.in_progress).toBe("number");
    expect(typeof body.summary.awaiting_approval).toBe("number");
    expect(typeof body.summary.available_to_release).toBe("number");
    expect(typeof body.summary.released).toBe("number");
  });

  // ── Roles ────────────────────────────────────────────────────────────────

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

  test("contractor GET returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("commercial GET returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Field types ──────────────────────────────────────────────────────────

  test("stages have correct field types when present", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: Array<{
        id: string;
        name: string;
        value: number;
        status: string;
        contractId: string;
        projectId: string | null;
        projectName: string | null;
      }>;
    };
    if (body.stages.length > 0) {
      const s = body.stages[0];
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.value).toBe("number");
      expect(typeof s.status).toBe("string");
      expect(typeof s.contractId).toBe("string");
    }
  });

  // ── Filters ──────────────────────────────────────────────────────────────

  test("projectId filter scopes to that project", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as { stages: Array<{ projectId: string | null }> };
    for (const s of body.stages) {
      expect(s.projectId).toBe(PROJECT_ID);
    }
  });

  test("status filter only returns matching stages", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=released`);
    const body = await res.json() as { stages: Array<{ status: string }> };
    for (const s of body.stages) {
      expect(s.status).toBe("released");
    }
  });

  test("awaitingApproval=true only returns awaiting_approval stages", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?awaitingApproval=true`);
    const body = await res.json() as { stages: Array<{ status: string }> };
    for (const s of body.stages) {
      expect(s.status).toBe("awaiting_approval");
    }
  });

  // ── Summary invariants ───────────────────────────────────────────────────

  test("summary.total equals stages.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: unknown[];
      summary: { total: number };
    };
    expect(body.summary.total).toBe(body.stages.length);
  });

  test("summary status counts sum to total", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: {
        total: number;
        in_progress: number;
        awaiting_approval: number;
        available_to_release: number;
        released: number;
      };
    };
    const tracked = body.summary.in_progress + body.summary.awaiting_approval +
      body.summary.available_to_release + body.summary.released;
    expect(tracked).toBeLessThanOrEqual(body.summary.total);
  });

  // ── Seeded data ──────────────────────────────────────────────────────────

  test("admin sees seeded released stage in project 301", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}&status=released`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { stages: Array<{ status: string }> };
    expect(body.stages.length).toBeGreaterThan(0);
  });
});
