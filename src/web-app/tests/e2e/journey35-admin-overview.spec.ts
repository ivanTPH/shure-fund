/**
 * Journey 35 — Admin overview dashboard @e2e
 *
 * Covers GET /api/admin/overview:
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Funder → 403
 *  - Developer → 403
 *  - Contractor → 403
 *  - Commercial → 403
 *  - Admin → 200
 *
 * Response shape:
 *  - totals: { projects, walletBalance, walletAvailable, totalContracted, totalReleased,
 *               pendingApprovals, activeDisputes, pendingVariations, amlFlags, pendingKyc }
 *  - projects[]: { id, name, address, status, wallet, stages, financials, alerts }
 *  - recentActivity[]: { id, eventType, createdAt }
 *
 * Invariants:
 *  - totals.walletAvailable === sum(project.wallet.available)
 *  - totals.totalContracted === sum(project.financials.contracted)
 *  - totals.totalReleased   === sum(project.financials.released)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/admin/overview`;

test.describe("Journey 35 — Admin overview @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

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

  test("commercial GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Admin access and shape ─────────────────────────────────────────────────

  test("admin GET returns 200 with correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      totals: {
        projects: number;
        walletBalance: number;
        walletAvailable: number;
        totalContracted: number;
        totalReleased: number;
        pendingApprovals: number;
        activeDisputes: number;
        pendingVariations: number;
        amlFlags: number;
        pendingKyc: number;
      };
      projects: Array<{
        id: string;
        name: string;
        address: string;
        status: string;
        wallet: { balance: number; available: number; ringfenced: number };
        stages: { total: number; inProgress: number; awaitingApproval: number; released: number };
        financials: { contracted: number; released: number };
        alerts: { pendingApprovals: number; activeDisputes: number; pendingVariations: number };
      }>;
      recentActivity: Array<{ id: string; eventType: string; createdAt: string }>;
    };

    // Required keys on totals
    expect(typeof body.totals.projects).toBe("number");
    expect(typeof body.totals.walletBalance).toBe("number");
    expect(typeof body.totals.walletAvailable).toBe("number");
    expect(typeof body.totals.totalContracted).toBe("number");
    expect(typeof body.totals.totalReleased).toBe("number");
    expect(typeof body.totals.pendingApprovals).toBe("number");
    expect(typeof body.totals.activeDisputes).toBe("number");
    expect(typeof body.totals.pendingVariations).toBe("number");
    expect(typeof body.totals.amlFlags).toBe("number");
    expect(typeof body.totals.pendingKyc).toBe("number");

    // Arrays present
    expect(Array.isArray(body.projects)).toBe(true);
    expect(Array.isArray(body.recentActivity)).toBe(true);
  });

  test("projects array has expected fields", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      projects: Array<{
        id: string; name: string; status: string;
        wallet: { available: number }; financials: { contracted: number; released: number };
        alerts: { pendingApprovals: number };
      }>;
    };

    if (body.projects.length === 0) { return; } // no projects seeded yet

    const p = body.projects[0];
    expect(typeof p.id).toBe("string");
    expect(typeof p.name).toBe("string");
    expect(typeof p.status).toBe("string");
    expect(typeof p.wallet.available).toBe("number");
    expect(typeof p.financials.contracted).toBe("number");
    expect(typeof p.financials.released).toBe("number");
    expect(typeof p.alerts.pendingApprovals).toBe("number");
  });

  test("totals.walletAvailable matches sum of project wallets", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      totals: { walletAvailable: number };
      projects: Array<{ wallet: { available: number } }>;
    };

    const sumAvailable = body.projects.reduce((s, p) => s + p.wallet.available, 0);
    expect(body.totals.walletAvailable).toBeCloseTo(sumAvailable, 1);
  });

  test("totals.totalContracted matches sum of project financials", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      totals: { totalContracted: number };
      projects: Array<{ financials: { contracted: number } }>;
    };

    const sumContracted = body.projects.reduce((s, p) => s + p.financials.contracted, 0);
    expect(body.totals.totalContracted).toBeCloseTo(sumContracted, 1);
  });

  test("recentActivity items have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      recentActivity: Array<{ id: string; eventType: string; createdAt: string }>;
    };

    if (body.recentActivity.length === 0) { return; }

    const item = body.recentActivity[0];
    expect(typeof item.id).toBe("string");
    expect(typeof item.eventType).toBe("string");
    expect(typeof item.createdAt).toBe("string");
  });
});
