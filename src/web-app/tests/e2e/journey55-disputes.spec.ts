/**
 * Journey 55 — Cross-project disputes list @e2e
 *
 * Covers GET /api/disputes (cross-project mode — no stageId param):
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *
 * Query validation:
 *  - ?status=invalid → 400
 *  - ?status=raised → 200
 *
 * GET shape (cross-project mode):
 *  - Returns { disputes: DisputeItem[], summary: { total, raised, under_review, resolved } }
 *  - All summary fields are numbers
 *
 * Legacy mode (with stageId):
 *  - Returns { disputes: [] } — no summary field required
 *
 * Roles:
 *  - All authenticated users with a role get 200
 *
 * Field types (when disputes present):
 *  - id, reason, stageId are strings; disputedValue is number; status is string
 *
 * Summary invariants:
 *  - total === disputes.length
 *  - raised + under_review + resolved <= total
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/disputes`;

test.describe("Journey 55 — Cross-project disputes @e2e", () => {
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
    const res = await page.request.get(`${ENDPOINT}?status=raised`);
    expect(res.status()).toBe(200);
  });

  test("status=resolved returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=resolved`);
    expect(res.status()).toBe(200);
  });

  test("status=under_review returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?status=under_review`);
    expect(res.status()).toBe(200);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct cross-project shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      disputes: unknown[];
      summary: {
        total: number;
        raised: number;
        under_review: number;
        resolved: number;
      };
    };
    expect(Array.isArray(body.disputes)).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.raised).toBe("number");
    expect(typeof body.summary.under_review).toBe("number");
    expect(typeof body.summary.resolved).toBe("number");
  });

  // ── Legacy mode (with stageId) ───────────────────────────────────────────

  test("stageId param returns disputes array (legacy mode)", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?stageId=00000000-0000-0000-0000-000000000501`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { disputes: unknown[] };
    expect(Array.isArray(body.disputes)).toBe(true);
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

  test("disputes have correct field types when present", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      disputes: Array<{
        id: string;
        reason: string;
        status: string;
        disputedValue: number;
        stageId: string;
        projectId: string | null;
        projectName: string | null;
      }>;
    };
    if (body.disputes.length > 0) {
      const d = body.disputes[0];
      expect(typeof d.id).toBe("string");
      expect(typeof d.reason).toBe("string");
      expect(typeof d.status).toBe("string");
      expect(typeof d.disputedValue).toBe("number");
      expect(typeof d.stageId).toBe("string");
    }
  });

  // ── Summary invariants ───────────────────────────────────────────────────

  test("summary.total equals disputes.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      disputes: unknown[];
      summary: { total: number };
    };
    expect(body.summary.total).toBe(body.disputes.length);
  });

  test("summary status counts sum to total", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { total: number; raised: number; under_review: number; resolved: number };
    };
    const tracked = body.summary.raised + body.summary.under_review + body.summary.resolved;
    expect(tracked).toBeLessThanOrEqual(body.summary.total);
  });

  // ── Status filter correctness ────────────────────────────────────────────

  test("status filter only returns matching disputes", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=raised`);
    const body = await res.json() as { disputes: Array<{ status: string }> };
    for (const d of body.disputes) {
      expect(d.status).toBe("raised");
    }
  });

  // ── projectId filter ─────────────────────────────────────────────────────

  test("projectId filter scopes to that project", async ({ page }) => {
    await signIn(page, "admin");
    const projectId = "00000000-0000-0000-0000-000000000301";
    const res  = await page.request.get(`${ENDPOINT}?projectId=${projectId}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { disputes: Array<{ projectId: string | null }> };
    for (const d of body.disputes) {
      expect(d.projectId).toBe(projectId);
    }
  });
});
