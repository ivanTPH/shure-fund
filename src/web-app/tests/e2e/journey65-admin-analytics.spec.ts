/**
 * Journey 65 — Admin analytics @e2e
 *
 * Covers:
 *   GET /api/admin/analytics — admin-only analytics endpoint
 *   /admin/analytics page — analytics dashboard UI
 *
 * API:
 *  - Auth: 401 for unauthenticated
 *  - Role guard: non-admin (funder, developer, contractor, commercial) → 403
 *  - Admin → 200 with full analytics payload
 *
 * Response shape:
 *  - { stages, evidence, approvals, funding, contracts, projects }
 *  - stages: { distribution, totalCount, totalValue, releasedValue, releaseRate }
 *  - evidence: { distribution, totalCount, pendingCount, reviewedCount }
 *  - approvals: { byRole, totalCount }
 *  - funding: { totalWalletBalance, totalWalletAvailable, activePofTotal, tier1AndTier2Total }
 *  - contracts: { distribution, totalCount }
 *  - projects: { distribution, totalCount }
 *
 * Invariants:
 *  - stages.releaseRate in [0, 1]
 *  - stages.totalCount >= 0
 *  - funding.tier1AndTier2Total = totalWalletBalance + activePofTotal
 *  - evidence.totalCount = pendingCount + reviewedCount + (unreviewable items like "returned")
 *  - All count fields are non-negative integers
 *
 * UI:
 *  - /admin/analytics renders for admin
 *  - Shows heading "Analytics"
 *  - Non-admin (contractor) is redirected
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/admin/analytics`;
const PAGE_URL = `${BASE}/admin/analytics`;

type AnalyticsBody = {
  stages: {
    distribution: Record<string, number>;
    totalCount: number;
    totalValue: number;
    releasedValue: number;
    releaseRate: number;
  };
  evidence: {
    distribution: Record<string, number>;
    totalCount: number;
    pendingCount: number;
    reviewedCount: number;
  };
  approvals: {
    byRole: Record<string, Record<string, number>>;
    totalCount: number;
  };
  funding: {
    totalWalletBalance: number;
    totalWalletAvailable: number;
    activePofTotal: number;
    tier1AndTier2Total: number;
  };
  contracts: {
    distribution: Record<string, number>;
    totalCount: number;
  };
  projects: {
    distribution: Record<string, number>;
    totalCount: number;
  };
};

test.describe("Journey 65 — Admin analytics @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Role guards ──────────────────────────────────────────────────────────

  test("funder GET analytics returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET analytics returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("contractor GET analytics returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("commercial GET analytics returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Admin happy path ─────────────────────────────────────────────────────

  test("admin GET analytics returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("analytics response has correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(body.stages).toBeTruthy();
    expect(body.evidence).toBeTruthy();
    expect(body.approvals).toBeTruthy();
    expect(body.funding).toBeTruthy();
    expect(body.contracts).toBeTruthy();
    expect(body.projects).toBeTruthy();
  });

  test("stages fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(typeof body.stages.totalCount).toBe("number");
    expect(typeof body.stages.totalValue).toBe("number");
    expect(typeof body.stages.releasedValue).toBe("number");
    expect(typeof body.stages.releaseRate).toBe("number");
    expect(typeof body.stages.distribution).toBe("object");
  });

  test("stages.releaseRate is in [0, 1]", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(body.stages.releaseRate).toBeGreaterThanOrEqual(0);
    expect(body.stages.releaseRate).toBeLessThanOrEqual(1);
  });

  test("stages.releasedValue <= stages.totalValue", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(body.stages.releasedValue).toBeLessThanOrEqual(body.stages.totalValue + 0.01);
  });

  test("evidence fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(typeof body.evidence.totalCount).toBe("number");
    expect(typeof body.evidence.pendingCount).toBe("number");
    expect(typeof body.evidence.reviewedCount).toBe("number");
    expect(body.evidence.pendingCount).toBeGreaterThanOrEqual(0);
    expect(body.evidence.reviewedCount).toBeGreaterThanOrEqual(0);
  });

  test("funding tier1+tier2 = walletBalance + activePof", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(Math.round(body.funding.tier1AndTier2Total)).toBe(
      Math.round(body.funding.totalWalletBalance + body.funding.activePofTotal)
    );
  });

  test("funding values are all non-negative", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(body.funding.totalWalletBalance).toBeGreaterThanOrEqual(0);
    expect(body.funding.totalWalletAvailable).toBeGreaterThanOrEqual(0);
    expect(body.funding.activePofTotal).toBeGreaterThanOrEqual(0);
    expect(body.funding.tier1AndTier2Total).toBeGreaterThanOrEqual(0);
  });

  test("approvals has byRole object and totalCount", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(typeof body.approvals.byRole).toBe("object");
    expect(typeof body.approvals.totalCount).toBe("number");
    expect(body.approvals.totalCount).toBeGreaterThanOrEqual(0);
  });

  test("contracts and projects have distribution and totalCount", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    expect(typeof body.contracts.distribution).toBe("object");
    expect(typeof body.contracts.totalCount).toBe("number");
    expect(typeof body.projects.distribution).toBe("object");
    expect(typeof body.projects.totalCount).toBe("number");
    expect(body.projects.totalCount).toBeGreaterThanOrEqual(0);
  });

  test("stage distribution count totals match totalCount", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as AnalyticsBody;
    const distributionSum = Object.values(body.stages.distribution).reduce((s, v) => s + v, 0);
    expect(distributionSum).toBe(body.stages.totalCount);
  });

  // ── Analytics UI page ────────────────────────────────────────────────────

  test("admin can load analytics page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible({ timeout: 10_000 });
  });

  test("analytics page shows release rate KPI", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByText(/release rate/i)).toBeVisible({ timeout: 10_000 });
  });

  test("analytics page has link back to platform overview", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("link", { name: /platform overview/i })).toBeVisible({ timeout: 10_000 });
  });
});
