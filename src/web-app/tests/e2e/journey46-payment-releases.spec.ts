/**
 * Journey 46 — Cross-project payment releases @e2e
 *
 * Covers GET /api/payments/releases:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Contractor GET → 403
 *  - Commercial GET → 403
 *
 * GET shape:
 *  - Returns { releases: [], summary: { totalReleased, totalStages, projectCount } }
 *  - Each release: stageId, stageName, value, endDate, projectId, projectName
 *
 * Query params:
 *  - ?projectId=<uuid> scopes to one project
 *
 * Summary correctness:
 *  - summary.totalStages = releases.length
 *  - summary.totalReleased = sum of release values
 *  - summary.projectCount = unique project count
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301, contract 401) has stage 508 with status='released'
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT   = `${BASE}/api/payments/releases`;
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// Seeded released stage
const RELEASED_STAGE_ID = "00000000-0000-0000-0000-000000000508"; // Site Preparation

test.describe("Journey 46 — Payment releases @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ─────────────────────────────────────────────────────────

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

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      releases: unknown[];
      summary: { totalReleased: number; totalStages: number; projectCount: number };
    };
    expect(Array.isArray(body.releases)).toBe(true);
    expect(typeof body.summary.totalReleased).toBe("number");
    expect(typeof body.summary.totalStages).toBe("number");
    expect(typeof body.summary.projectCount).toBe("number");
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

  test("releases have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      releases: Array<{
        stageId: string;
        stageName: string;
        value: number;
        projectId: string;
      }>;
    };
    if (body.releases.length > 0) {
      const r = body.releases[0];
      expect(typeof r.stageId).toBe("string");
      expect(typeof r.stageName).toBe("string");
      expect(typeof r.value).toBe("number");
      expect(typeof r.projectId).toBe("string");
    }
  });

  // ── Seeded data ──────────────────────────────────────────────────────────

  test("seeded released stage appears in releases", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { releases: Array<{ stageId: string }> };
    const found = body.releases.some((r) => r.stageId === RELEASED_STAGE_ID);
    expect(found).toBe(true);
  });

  test("projectId filter scopes results correctly", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as { releases: Array<{ projectId: string }> };
    for (const r of body.releases) {
      expect(r.projectId).toBe(PROJECT_ID);
    }
  });

  // ── Summary correctness ──────────────────────────────────────────────────

  test("summary.totalStages equals releases.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      releases: Array<{ value: number }>;
      summary: { totalReleased: number; totalStages: number };
    };
    expect(body.summary.totalStages).toBe(body.releases.length);
  });

  test("summary.totalReleased equals sum of release values", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?projectId=${PROJECT_ID}`);
    const body = await res.json() as {
      releases: Array<{ value: number }>;
      summary: { totalReleased: number };
    };
    const sum = body.releases.reduce((s, r) => s + Number(r.value), 0);
    expect(Math.round(body.summary.totalReleased)).toBe(Math.round(sum));
  });

  test("summary.projectCount equals unique project count", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      releases: Array<{ projectId: string }>;
      summary: { projectCount: number };
    };
    const uniqueProjects = new Set(body.releases.map((r) => r.projectId)).size;
    expect(body.summary.projectCount).toBe(uniqueProjects);
  });
});
