/**
 * Journey 32 — Contractor portal (cross-project summary) @e2e
 *
 * Covers GET /api/contractor/summary:
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Admin → 403 (contractor role only)
 *  - Funder → 403
 *  - Developer → 403
 *
 * Contractor access:
 *  - Contractor → 200
 *  - Response has projects[] and totals{}
 *  - totals has totalValue, paidValue, pendingValue, actionRequired (all numbers)
 *  - pendingValue = totalValue - paidValue
 *  - projects have id, name, address, status, contracts[]
 *  - stages have id, name, value, status
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/contractor/summary`;

type ContractorSummary = {
  projects: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
    contracts: Array<{
      id: string;
      status: string;
      stages: Array<{ id: string; name: string; value: number; status: string }>;
    }>;
  }>;
  totals: {
    totalValue: number;
    paidValue: number;
    pendingValue: number;
    actionRequired: number;
  };
};

test.describe("Journey 32 — Contractor portal @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated contractor/summary returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("admin cannot access contractor/summary (403)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("funder cannot access contractor/summary (403)", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer cannot access contractor/summary (403)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Contractor access ──────────────────────────────────────────────────────

  test("contractor can GET summary (200)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("contractor summary has correct shape", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as ContractorSummary;

    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.totals).toBeDefined();
    expect(typeof body.totals.totalValue).toBe("number");
    expect(typeof body.totals.paidValue).toBe("number");
    expect(typeof body.totals.pendingValue).toBe("number");
    expect(typeof body.totals.actionRequired).toBe("number");
  });

  test("pendingValue = totalValue - paidValue", async ({ page }) => {
    await signIn(page, "contractor");
    const { totals } = await (await page.request.get(ENDPOINT)).json() as ContractorSummary;
    expect(totals.pendingValue).toBeCloseTo(totals.totalValue - totals.paidValue, 0);
  });

  test("projects have required fields", async ({ page }) => {
    await signIn(page, "contractor");
    const { projects } = await (await page.request.get(ENDPOINT)).json() as ContractorSummary;
    for (const p of projects) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(typeof p.address).toBe("string");
      expect(typeof p.status).toBe("string");
      expect(Array.isArray(p.contracts)).toBe(true);
    }
  });

  test("stages have required fields", async ({ page }) => {
    await signIn(page, "contractor");
    const { projects } = await (await page.request.get(ENDPOINT)).json() as ContractorSummary;
    const stages = projects.flatMap((p) => p.contracts.flatMap((c) => c.stages));
    for (const s of stages) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.value).toBe("number");
      expect(typeof s.status).toBe("string");
    }
  });

  test("totalValue matches sum of all stage values", async ({ page }) => {
    await signIn(page, "contractor");
    const { projects, totals } = await (await page.request.get(ENDPOINT)).json() as ContractorSummary;
    const sum = projects
      .flatMap((p) => p.contracts.flatMap((c) => c.stages))
      .reduce((s, stage) => s + stage.value, 0);
    expect(sum).toBeCloseTo(totals.totalValue, 0);
  });
});
