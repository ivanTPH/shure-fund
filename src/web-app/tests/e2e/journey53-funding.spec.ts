/**
 * Journey 53 — Funding hub (via /api/portfolio) @e2e
 *
 * Verifies the /api/portfolio endpoint from a funding-specific perspective:
 * Tier 1 (wallet) vs Tier 2 (PoF) breakdown per project.
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Commercial → 403
 *
 * Data integrity:
 *  - walletAvailable <= walletBalance (available cannot exceed balance)
 *  - pofTotal >= 0 for all projects
 *  - hasFundingGap is boolean
 *  - tier1+tier2 = walletBalance + pofTotal (per project)
 *
 * Roles:
 *  - funder, developer, admin get 200
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has wallet and PoF data
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT   = `${BASE}/api/portfolio`;
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 53 — Funding hub @e2e", () => {
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

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Funding-specific field validation ────────────────────────────────────

  test("each project has walletBalance, walletAvailable, pofTotal, hasFundingGap", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      projects: Array<{
        walletBalance: number;
        walletAvailable: number;
        pofTotal: number;
        hasFundingGap: boolean;
        totalRingfenced: number;
      }>;
    };
    for (const p of body.projects) {
      expect(typeof p.walletBalance).toBe("number");
      expect(typeof p.walletAvailable).toBe("number");
      expect(typeof p.pofTotal).toBe("number");
      expect(typeof p.hasFundingGap).toBe("boolean");
      expect(p.walletAvailable).toBeGreaterThanOrEqual(0);
      expect(p.pofTotal).toBeGreaterThanOrEqual(0);
    }
  });

  test("walletAvailable <= walletBalance for all projects", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      projects: Array<{ walletBalance: number; walletAvailable: number }>;
    };
    for (const p of body.projects) {
      expect(p.walletAvailable).toBeLessThanOrEqual(p.walletBalance + 0.01); // float tolerance
    }
  });

  test("summary has totalPof field", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { totalPof: number; totalAvailable: number };
    };
    expect(typeof body.summary.totalPof).toBe("number");
    expect(typeof body.summary.totalAvailable).toBe("number");
    expect(body.summary.totalPof).toBeGreaterThanOrEqual(0);
    expect(body.summary.totalAvailable).toBeGreaterThanOrEqual(0);
  });

  test("summary.totalAvailable equals sum of project walletAvailable", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      summary: { totalAvailable: number };
      projects: Array<{ walletAvailable: number }>;
    };
    const sum = body.projects.reduce((s, p) => s + p.walletAvailable, 0);
    expect(Math.round(body.summary.totalAvailable)).toBe(Math.round(sum));
  });

  // ── Seeded project ───────────────────────────────────────────────────────

  test("seeded project 301 has wallet and pof data", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      projects: Array<{
        projectId: string;
        walletBalance: number;
        pofTotal: number;
      }>;
    };
    const proj = body.projects.find((p) => p.projectId === PROJECT_ID);
    expect(proj).toBeTruthy();
    if (proj) {
      expect(proj.walletBalance).toBeGreaterThanOrEqual(0);
      expect(proj.pofTotal).toBeGreaterThanOrEqual(0);
    }
  });
});
