/**
 * Journey 49 — Portfolio summary API @e2e
 *
 * Covers GET /api/portfolio:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Contractor GET → 403
 *  - Commercial GET → 403
 *
 * GET shape:
 *  - Returns { summary: PortfolioSummary, projects: ProjectSnapshot[] }
 *  - summary: totalProjects, totalCommitted, totalDrawn, totalAvailable, totalPof,
 *             fundingGaps, awaitingApproval — all numbers
 *  - projects: array of snapshots with required fields
 *
 * Roles:
 *  - funder, developer, admin all get 200
 *
 * Invariants:
 *  - summary.totalProjects === projects.length
 *  - fundingGaps === count of projects with hasFundingGap === true
 *  - totalCommitted >= totalDrawn (cannot draw more than committed)
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) is seeded and accessible to admin
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/portfolio`;
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 49 — Portfolio summary @e2e", () => {
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

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      summary: {
        totalProjects: number;
        totalCommitted: number;
        totalDrawn: number;
        totalAvailable: number;
        totalPof: number;
        fundingGaps: number;
        awaitingApproval: number;
      };
      projects: unknown[];
    };
    expect(Array.isArray(body.projects)).toBe(true);
    expect(typeof body.summary.totalProjects).toBe("number");
    expect(typeof body.summary.totalCommitted).toBe("number");
    expect(typeof body.summary.totalDrawn).toBe("number");
    expect(typeof body.summary.totalAvailable).toBe("number");
    expect(typeof body.summary.totalPof).toBe("number");
    expect(typeof body.summary.fundingGaps).toBe("number");
    expect(typeof body.summary.awaitingApproval).toBe("number");
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

  // ── Project snapshot fields ──────────────────────────────────────────────

  test("project snapshots have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      projects: Array<{
        projectId: string;
        walletBalance: number;
        walletAvailable: number;
        totalCommitted: number;
        totalDrawn: number;
        hasFundingGap: boolean;
        stageCount: number;
        releasedCount: number;
        awaitingCount: number;
      }>;
    };
    if (body.projects.length > 0) {
      const p = body.projects[0];
      expect(typeof p.projectId).toBe("string");
      expect(typeof p.walletBalance).toBe("number");
      expect(typeof p.walletAvailable).toBe("number");
      expect(typeof p.totalCommitted).toBe("number");
      expect(typeof p.totalDrawn).toBe("number");
      expect(typeof p.hasFundingGap).toBe("boolean");
      expect(typeof p.stageCount).toBe("number");
      expect(typeof p.releasedCount).toBe("number");
      expect(typeof p.awaitingCount).toBe("number");
    }
  });

  test("seeded project 301 appears in admin portfolio", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { projects: Array<{ projectId: string }> };
    expect(body.projects.some((p) => p.projectId === PROJECT_ID)).toBe(true);
  });

  // ── Summary invariants ───────────────────────────────────────────────────

  test("summary.totalProjects equals projects.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { totalProjects: number };
      projects: unknown[];
    };
    expect(body.summary.totalProjects).toBe(body.projects.length);
  });

  test("fundingGaps equals count of projects with hasFundingGap true", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { fundingGaps: number };
      projects: Array<{ hasFundingGap: boolean }>;
    };
    const gapCount = body.projects.filter((p) => p.hasFundingGap).length;
    expect(body.summary.fundingGaps).toBe(gapCount);
  });

  test("totalCommitted >= totalDrawn", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { totalCommitted: number; totalDrawn: number };
    };
    expect(body.summary.totalCommitted).toBeGreaterThanOrEqual(body.summary.totalDrawn);
  });
});
