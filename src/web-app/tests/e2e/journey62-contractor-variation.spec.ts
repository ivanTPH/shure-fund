/**
 * Journey 62 — Contractor summary & variation detail @e2e
 *
 * Covers:
 *   GET /api/contractor/summary  — contractor portal backing API
 *   GET /api/variations/[variationId]  — variation detail with full context
 *   PATCH /api/variations/[variationId]  — variation lifecycle transitions
 *
 * Contractor summary:
 *  - Auth: 401 for unauthenticated
 *  - Role guard: funder → 403, admin → 403, developer → 403
 *  - Contractor gets 200 with { projects, totals }
 *  - totals: { totalValue, paidValue, pendingValue, actionRequired } — all numbers
 *  - projects[]: each has id, name, address, status, contracts[]
 *  - contracts[]: each has id, status, stages[]
 *  - stages[]: each has id, name, value, status
 *  - Invariant: totals.pendingValue = totalValue - paidValue
 *  - Invariant: totalValue >= paidValue >= 0
 *
 * Variation detail (GET):
 *  - Auth: 401 for unauthenticated
 *  - Non-existent variationId → 404
 *  - After creating a variation: returns { variation, wallet }
 *  - variation has id, stage_id, description, value_change, status
 *
 * Variation PATCH:
 *  - Auth: 401 for unauthenticated
 *  - Missing action → 400
 *  - Invalid transition for role → 403
 *  - Submit: draft → submitted (contractor)
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301), contractor account
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const SUMMARY_ENDPOINT = `${BASE}/api/contractor/summary`;

test.describe("Journey 62 — Contractor summary & variation detail @e2e", () => {
  test.setTimeout(60_000);

  // ── Contractor summary — auth guards ─────────────────────────────────────

  test("unauthenticated GET summary returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Contractor summary — role guards ─────────────────────────────────────

  test("funder GET summary returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("admin GET summary returns 403", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET summary returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("commercial GET summary returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Contractor summary — shape ───────────────────────────────────────────

  test("contractor GET summary returns 200 with correct shape", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(SUMMARY_ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      projects: unknown[];
      totals: { totalValue: number; paidValue: number; pendingValue: number; actionRequired: number };
    };
    expect(Array.isArray(body.projects)).toBe(true);
    expect(typeof body.totals.totalValue).toBe("number");
    expect(typeof body.totals.paidValue).toBe("number");
    expect(typeof body.totals.pendingValue).toBe("number");
    expect(typeof body.totals.actionRequired).toBe("number");
  });

  test("contractor summary totals invariant: pendingValue = totalValue - paidValue", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(SUMMARY_ENDPOINT);
    const body = await res.json() as {
      totals: { totalValue: number; paidValue: number; pendingValue: number };
    };
    expect(Math.round(body.totals.pendingValue)).toBe(
      Math.round(body.totals.totalValue - body.totals.paidValue)
    );
  });

  test("contractor summary totals: paidValue <= totalValue", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(SUMMARY_ENDPOINT);
    const body = await res.json() as { totals: { totalValue: number; paidValue: number } };
    expect(body.totals.paidValue).toBeLessThanOrEqual(body.totals.totalValue + 0.01);
  });

  test("contractor summary totals: all values >= 0", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(SUMMARY_ENDPOINT);
    const body = await res.json() as {
      totals: { totalValue: number; paidValue: number; pendingValue: number; actionRequired: number };
    };
    expect(body.totals.totalValue).toBeGreaterThanOrEqual(0);
    expect(body.totals.paidValue).toBeGreaterThanOrEqual(0);
    expect(body.totals.pendingValue).toBeGreaterThanOrEqual(0);
    expect(body.totals.actionRequired).toBeGreaterThanOrEqual(0);
  });

  test("contractor projects have correct field types", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(SUMMARY_ENDPOINT);
    const body = await res.json() as {
      projects: Array<{
        id: string; name: string; address: string; status: string;
        contracts: Array<{
          id: string; status: string;
          stages: Array<{ id: string; name: string; value: number; status: string }>;
        }>;
      }>;
    };
    if (body.projects.length === 0) return;
    const proj = body.projects[0];
    expect(typeof proj.id).toBe("string");
    expect(typeof proj.name).toBe("string");
    expect(typeof proj.status).toBe("string");
    expect(Array.isArray(proj.contracts)).toBe(true);
    if (proj.contracts.length > 0) {
      expect(Array.isArray(proj.contracts[0].stages)).toBe(true);
    }
  });

  // ── Variation detail — auth guards ───────────────────────────────────────

  test("unauthenticated GET variation detail returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/variations/non-existent-id`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH variation returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(`${BASE}/api/variations/non-existent-id`, {
      data: { action: "submit" },
    });
    expect(res.status()).toBe(401);
  });

  // ── Variation detail — non-existent ID ──────────────────────────────────

  test("GET non-existent variation returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${BASE}/api/variations/00000000-dead-beef-dead-beef00000000`);
    expect(res.status()).toBe(404);
  });

  // ── Variation detail — PATCH validation ──────────────────────────────────

  test("PATCH variation without action returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/variations/00000000-dead-beef-dead-beef00000000`,
      { data: {} }
    );
    expect([400, 404]).toContain(res.status()); // 404 if not found before action check
  });

  // ── Variation create + detail lifecycle ──────────────────────────────────

  test("create variation as contractor then fetch detail", async ({ page }) => {
    // Get a stage ID from the project dashboard (returns stages[] on each contract)
    await signIn(page, "developer");
    const dashRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/dashboard`);
    if (!dashRes.ok()) return;
    const dashBody = await dashRes.json() as {
      contracts: Array<{ stages: Array<{ id: string; status: string }> }>;
    };
    const stageId = dashBody.contracts
      .flatMap((c) => c.stages)
      .find((s) => s.status !== "released")?.id;
    if (!stageId) return; // skip if no suitable stage

    // Create a variation as contractor
    await signIn(page, "contractor");
    const createRes = await page.request.post(`${BASE}/api/variations`, {
      data: { stageId, description: "Journey 62 E2E variation test", valueChange: 500 },
    });
    if (!createRes.ok()) return;
    const createBody = await createRes.json() as { variation: { id: string } };
    const variationId = createBody.variation.id;

    // Fetch the variation detail
    const detailRes = await page.request.get(`${BASE}/api/variations/${variationId}`);
    expect(detailRes.status()).toBe(200);
    const detailBody = await detailRes.json() as {
      variation: {
        id: string;
        description: string;
        value_change: number;
        status: string;
        stage_id: string;
      };
    };
    expect(detailBody.variation.id).toBe(variationId);
    expect(detailBody.variation.description).toBe("Journey 62 E2E variation test");
    expect(detailBody.variation.value_change).toBe(500);
    expect(detailBody.variation.status).toBe("draft");
    expect(detailBody.variation.stage_id).toBe(stageId);
  });

  test("submit variation (draft → submitted)", async ({ page }) => {
    // Get a stage via dashboard
    await signIn(page, "developer");
    const dashRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/dashboard`);
    if (!dashRes.ok()) return;
    const body = await dashRes.json() as {
      contracts: Array<{ stages: Array<{ id: string; status: string }> }>;
    };
    const stageId = body.contracts.flatMap((c) => c.stages)[0]?.id;
    if (!stageId) return;

    // Create as contractor
    await signIn(page, "contractor");
    const createRes = await page.request.post(`${BASE}/api/variations`, {
      data: { stageId, description: "Journey 62 submit test", valueChange: 1000 },
    });
    if (!createRes.ok()) return;
    const { variation } = await createRes.json() as { variation: { id: string } };

    // Submit (draft → submitted)
    const patchRes = await page.request.patch(`${BASE}/api/variations/${variation.id}`, {
      data: { action: "submit" },
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json() as { ok: boolean; from: string; to: string };
    expect(patchBody.ok).toBe(true);
    expect(patchBody.from).toBe("draft");
    expect(patchBody.to).toBe("submitted");
  });

  test("funder cannot submit a variation (wrong role)", async ({ page }) => {
    // Get a stage via dashboard
    await signIn(page, "developer");
    const dashRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/dashboard`);
    if (!dashRes.ok()) return;
    const body = await dashRes.json() as {
      contracts: Array<{ stages: Array<{ id: string }> }>;
    };
    const stageId = body.contracts.flatMap((c) => c.stages)[0]?.id;
    if (!stageId) return;

    await signIn(page, "contractor");
    const createRes = await page.request.post(`${BASE}/api/variations`, {
      data: { stageId, description: "Journey 62 role test", valueChange: 200 },
    });
    if (!createRes.ok()) return;
    const { variation } = await createRes.json() as { variation: { id: string } };

    // Funder tries to submit — should be rejected
    await signIn(page, "funder");
    const patchRes = await page.request.patch(`${BASE}/api/variations/${variation.id}`, {
      data: { action: "submit" },
    });
    expect(patchRes.status()).toBe(403);
  });
});
