/**
 * Journey 59 — Project dashboard API @e2e
 *
 * Covers GET /api/projects/[projectId]/dashboard — the primary aggregated
 * endpoint consumed by all role-specific project views.
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *
 * Access control:
 *  - All authenticated roles get 200 on seeded project 301
 *
 * Response shape:
 *  - { project, wallet, contracts, summary }
 *  - project: { id, name, address, status }
 *  - wallet: { balance, available, ringfenced }
 *  - contracts: array (each with id, status, totalValue, stages[])
 *  - summary: { totalCommitted, totalDrawn, totalRemaining, pendingApprovals,
 *               activeDisputes, pendingVariations, stagesInProgress,
 *               stagesAwaiting, pendingEvidence, projectedDraw30d, fundingGapWarning }
 *
 * Field types:
 *  - All money fields are numbers; status fields are strings; arrays are arrays
 *
 * Invariants:
 *  - summary.totalRemaining === totalCommitted - totalDrawn
 *  - summary.fundingGapWarning is boolean
 *  - contracts[] each have a stages[] array
 *  - Each stage has pendingApprovals, pendingEvidence, activeDisputes (numbers >= 0)
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has contracts and stages
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/dashboard`;

type DashboardBody = {
  project: { id: string; name: string; address: string; status: string };
  wallet: { balance: number; available: number; ringfenced: number };
  contracts: Array<{
    id: string;
    status: string;
    totalValue: number;
    stages: Array<{
      id: string;
      name: string;
      value: number;
      status: string;
      pendingApprovals: number;
      pendingEvidence: number;
      activeDisputes: number;
      nextAction: string;
    }>;
  }>;
  summary: {
    totalCommitted: number;
    totalDrawn: number;
    totalRemaining: number;
    pendingApprovals: number;
    activeDisputes: number;
    pendingVariations: number;
    stagesInProgress: number;
    stagesAwaiting: number;
    pendingEvidence: number;
    projectedDraw30d: number;
    fundingGapWarning: boolean;
  };
};

test.describe("Journey 59 — Project dashboard API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Role access ──────────────────────────────────────────────────────────

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
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

  // ── Response shape ───────────────────────────────────────────────────────

  test("response has correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as DashboardBody;
    expect(body.project).toBeTruthy();
    expect(body.wallet).toBeTruthy();
    expect(Array.isArray(body.contracts)).toBe(true);
    expect(body.summary).toBeTruthy();
  });

  test("project fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    expect(typeof body.project.id).toBe("string");
    expect(typeof body.project.name).toBe("string");
    expect(typeof body.project.status).toBe("string");
    expect(body.project.id).toBe(PROJECT_ID);
  });

  test("wallet fields are numbers", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    expect(typeof body.wallet.balance).toBe("number");
    expect(typeof body.wallet.available).toBe("number");
    expect(typeof body.wallet.ringfenced).toBe("number");
  });

  test("summary fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    const { summary } = body;
    expect(typeof summary.totalCommitted).toBe("number");
    expect(typeof summary.totalDrawn).toBe("number");
    expect(typeof summary.totalRemaining).toBe("number");
    expect(typeof summary.pendingApprovals).toBe("number");
    expect(typeof summary.activeDisputes).toBe("number");
    expect(typeof summary.pendingVariations).toBe("number");
    expect(typeof summary.stagesInProgress).toBe("number");
    expect(typeof summary.stagesAwaiting).toBe("number");
    expect(typeof summary.pendingEvidence).toBe("number");
    expect(typeof summary.projectedDraw30d).toBe("number");
    expect(typeof summary.fundingGapWarning).toBe("boolean");
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  test("totalRemaining = totalCommitted - totalDrawn", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    const { totalCommitted, totalDrawn, totalRemaining } = body.summary;
    expect(Math.round(totalRemaining)).toBe(Math.round(totalCommitted - totalDrawn));
  });

  test("totalDrawn <= totalCommitted", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    expect(body.summary.totalDrawn).toBeLessThanOrEqual(body.summary.totalCommitted + 0.01);
  });

  test("wallet.available <= wallet.balance", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    expect(body.wallet.available).toBeLessThanOrEqual(body.wallet.balance + 0.01);
  });

  test("all numeric summary counters are non-negative", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    const { summary } = body;
    expect(summary.totalCommitted).toBeGreaterThanOrEqual(0);
    expect(summary.totalDrawn).toBeGreaterThanOrEqual(0);
    expect(summary.pendingApprovals).toBeGreaterThanOrEqual(0);
    expect(summary.activeDisputes).toBeGreaterThanOrEqual(0);
    expect(summary.pendingVariations).toBeGreaterThanOrEqual(0);
    expect(summary.projectedDraw30d).toBeGreaterThanOrEqual(0);
  });

  // ── Contracts and stages ─────────────────────────────────────────────────

  test("contracts is a non-empty array for seeded project 301", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    expect(body.contracts.length).toBeGreaterThan(0);
  });

  test("contract fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    if (body.contracts.length === 0) return;
    const c = body.contracts[0];
    expect(typeof c.id).toBe("string");
    expect(typeof c.status).toBe("string");
    expect(typeof c.totalValue).toBe("number");
    expect(Array.isArray(c.stages)).toBe(true);
  });

  test("stages have correct fields including action counts", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    const stage = body.contracts.flatMap((c) => c.stages)[0];
    if (!stage) return;
    expect(typeof stage.id).toBe("string");
    expect(typeof stage.name).toBe("string");
    expect(typeof stage.value).toBe("number");
    expect(typeof stage.status).toBe("string");
    expect(typeof stage.pendingApprovals).toBe("number");
    expect(typeof stage.pendingEvidence).toBe("number");
    expect(typeof stage.activeDisputes).toBe("number");
    expect(typeof stage.nextAction).toBe("string");
  });

  test("stage pendingApprovals >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as DashboardBody;
    for (const c of body.contracts) {
      for (const s of c.stages) {
        expect(s.pendingApprovals).toBeGreaterThanOrEqual(0);
        expect(s.activeDisputes).toBeGreaterThanOrEqual(0);
        expect(s.pendingEvidence).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // ── Non-existent project ─────────────────────────────────────────────────

  test("non-existent project returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/projects/00000000-0000-0000-0000-000000000999/dashboard`
    );
    expect(res.status()).toBe(404);
  });
});
