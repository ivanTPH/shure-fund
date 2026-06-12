/**
 * Journey 50 — Admin analytics API @e2e
 *
 * Covers GET /api/admin/analytics:
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Funder → 403 (admin only endpoint)
 *  - Developer → 403
 *  - Contractor → 403
 *
 * GET shape (admin only):
 *  - stages: { distribution, totalCount, totalValue, releasedValue, releaseRate }
 *  - evidence: { distribution, totalCount, pendingCount, reviewedCount }
 *  - approvals: { byRole, totalCount }
 *  - funding: { totalWalletBalance, totalWalletAvailable, activePofTotal, tier1AndTier2Total }
 *  - contracts: { distribution, totalCount }
 *  - projects: { distribution, totalCount }
 *
 * Invariants:
 *  - releaseRate is between 0 and 1
 *  - tier1AndTier2Total === totalWalletBalance + activePofTotal
 *  - pendingCount + reviewedCount <= totalCount (evidence)
 *  - stages.totalCount >= 0, contracts.totalCount >= 0, projects.totalCount >= 0
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/admin/analytics`;

test.describe("Journey 50 — Admin analytics @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("funder GET returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty("stages");
    expect(body).toHaveProperty("evidence");
    expect(body).toHaveProperty("approvals");
    expect(body).toHaveProperty("funding");
    expect(body).toHaveProperty("contracts");
    expect(body).toHaveProperty("projects");
  });

  test("stages block has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: {
        distribution: Record<string, number>;
        totalCount: number;
        totalValue: number;
        releasedValue: number;
        releaseRate: number;
      };
    };
    expect(typeof body.stages.totalCount).toBe("number");
    expect(typeof body.stages.totalValue).toBe("number");
    expect(typeof body.stages.releasedValue).toBe("number");
    expect(typeof body.stages.releaseRate).toBe("number");
    expect(typeof body.stages.distribution).toBe("object");
  });

  test("evidence block has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      evidence: {
        distribution: Record<string, number>;
        totalCount: number;
        pendingCount: number;
        reviewedCount: number;
      };
    };
    expect(typeof body.evidence.totalCount).toBe("number");
    expect(typeof body.evidence.pendingCount).toBe("number");
    expect(typeof body.evidence.reviewedCount).toBe("number");
  });

  test("funding block has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      funding: {
        totalWalletBalance: number;
        totalWalletAvailable: number;
        activePofTotal: number;
        tier1AndTier2Total: number;
      };
    };
    expect(typeof body.funding.totalWalletBalance).toBe("number");
    expect(typeof body.funding.totalWalletAvailable).toBe("number");
    expect(typeof body.funding.activePofTotal).toBe("number");
    expect(typeof body.funding.tier1AndTier2Total).toBe("number");
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  test("releaseRate is between 0 and 1", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { stages: { releaseRate: number } };
    expect(body.stages.releaseRate).toBeGreaterThanOrEqual(0);
    expect(body.stages.releaseRate).toBeLessThanOrEqual(1);
  });

  test("tier1AndTier2Total equals walletBalance + activePofTotal", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      funding: {
        totalWalletBalance: number;
        activePofTotal: number;
        tier1AndTier2Total: number;
      };
    };
    expect(body.funding.tier1AndTier2Total).toBeCloseTo(
      body.funding.totalWalletBalance + body.funding.activePofTotal,
      2,
    );
  });

  test("evidence pendingCount + reviewedCount <= totalCount", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      evidence: { totalCount: number; pendingCount: number; reviewedCount: number };
    };
    expect(body.evidence.pendingCount + body.evidence.reviewedCount)
      .toBeLessThanOrEqual(body.evidence.totalCount);
  });

  test("stages.totalCount >= 0 and contracts.totalCount >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: { totalCount: number };
      contracts: { totalCount: number };
      projects: { totalCount: number };
    };
    expect(body.stages.totalCount).toBeGreaterThanOrEqual(0);
    expect(body.contracts.totalCount).toBeGreaterThanOrEqual(0);
    expect(body.projects.totalCount).toBeGreaterThanOrEqual(0);
  });

  test("projects.totalCount is positive (seeded data exists)", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { projects: { totalCount: number } };
    expect(body.projects.totalCount).toBeGreaterThan(0);
  });
});
