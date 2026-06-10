/**
 * Journey 29 — Budget vs actual & payment schedule @e2e
 *
 * Covers:
 *
 * Budget API (GET /api/projects/[id]/budget):
 *  - Unauthenticated returns 401
 *  - Contractor returns 403 (no project access)
 *  - Admin can access — returns contracts + portfolio totals
 *  - Funder can access
 *  - Developer can access
 *  - Response has expected shape (contracts[], portfolio{})
 *  - Portfolio totals are numbers
 *  - Stage has originalValue, currentValue, paid, variance fields
 *
 * Schedule API (GET /api/projects/[id]/schedule):
 *  - Unauthenticated returns 401
 *  - Admin can access — returns stages + windows
 *  - Funder can access
 *  - Response has stages[], undated[], windows{next30,next60,next90}
 *  - Windows have value and count fields
 *  - Stages with dates have daysUntilDue and isOverdue fields
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

async function getBudget(page: Parameters<typeof signIn>[0]) {
  const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/budget`);
  return { status: res.status(), body: res.ok() ? await res.json() : await res.json() };
}

async function getSchedule(page: Parameters<typeof signIn>[0]) {
  const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/schedule`);
  return { status: res.status(), body: res.ok() ? await res.json() : await res.json() };
}

test.describe("Journey 29 — Budget vs actual & payment schedule @e2e", () => {
  test.setTimeout(60_000);

  // ── Budget: auth guards ────────────────────────────────────────────────────

  test("unauthenticated budget request returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/budget`);
    expect(res.status()).toBe(401);
  });

  test("contractor cannot access budget (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await getBudget(page);
    expect(status).toBe(403);
  });

  // ── Budget: success ────────────────────────────────────────────────────────

  test("admin can GET budget with correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await getBudget(page);
    expect(status).toBe(200);

    const b = body as {
      contracts: Array<{
        id: string;
        contractorName: string;
        stages: Array<{ originalValue: number; currentValue: number; paid: number; variance: number | null }>;
        summary: { originalTotal: number; currentTotal: number; paidTotal: number };
      }>;
      portfolio: {
        originalTotal: number;
        currentTotal: number;
        paidTotal: number;
        pendingTotal: number;
        retentionHeld: number;
      };
    };

    expect(Array.isArray(b.contracts)).toBe(true);
    expect(b.portfolio).toBeDefined();
    expect(typeof b.portfolio.originalTotal).toBe("number");
    expect(typeof b.portfolio.currentTotal).toBe("number");
    expect(typeof b.portfolio.paidTotal).toBe("number");
    expect(typeof b.portfolio.pendingTotal).toBe("number");
    expect(typeof b.portfolio.retentionHeld).toBe("number");
  });

  test("funder can GET budget", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await getBudget(page);
    expect(status).toBe(200);
  });

  test("developer can GET budget", async ({ page }) => {
    await signIn(page, "developer");
    const { status } = await getBudget(page);
    expect(status).toBe(200);
  });

  test("budget stages have required financial fields", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getBudget(page);
    const b = body as { contracts: Array<{ stages: Array<Record<string, unknown>> }> };
    const allStages = b.contracts.flatMap((c) => c.stages);
    if (allStages.length > 0) {
      const s = allStages[0];
      expect(typeof s.originalValue).toBe("number");
      expect(typeof s.currentValue).toBe("number");
      expect(typeof s.paid).toBe("number");
      expect(typeof s.retentionWithheld).toBe("number");
      expect("variance" in s).toBe(true); // can be null
    }
  });

  test("budget portfolio pendingTotal = currentTotal - paidTotal", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getBudget(page);
    const { portfolio } = body as {
      portfolio: { currentTotal: number; paidTotal: number; pendingTotal: number };
    };
    expect(portfolio.pendingTotal).toBe(portfolio.currentTotal - portfolio.paidTotal);
  });

  test("contract summary currentTotal = originalTotal + variationTotal", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getBudget(page);
    const b = body as {
      contracts: Array<{ summary: { originalTotal: number; variationTotal: number; currentTotal: number } }>;
    };
    for (const c of b.contracts) {
      expect(c.summary.currentTotal).toBeCloseTo(
        c.summary.originalTotal + c.summary.variationTotal,
        0,
      );
    }
  });

  // ── Schedule: auth guards ──────────────────────────────────────────────────

  test("unauthenticated schedule request returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/schedule`);
    expect(res.status()).toBe(401);
  });

  test("contractor cannot access schedule (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await getSchedule(page);
    expect(status).toBe(403);
  });

  // ── Schedule: success ──────────────────────────────────────────────────────

  test("admin can GET schedule with correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await getSchedule(page);
    expect(status).toBe(200);

    const b = body as {
      stages: unknown[];
      undated: unknown[];
      windows: {
        next30: { value: number; count: number };
        next60: { value: number; count: number };
        next90: { value: number; count: number };
      };
    };

    expect(Array.isArray(b.stages)).toBe(true);
    expect(Array.isArray(b.undated)).toBe(true);
    expect(b.windows).toBeDefined();
    expect(typeof b.windows.next30.value).toBe("number");
    expect(typeof b.windows.next30.count).toBe("number");
    expect(typeof b.windows.next60.value).toBe("number");
    expect(typeof b.windows.next90.value).toBe("number");
  });

  test("funder can GET schedule", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await getSchedule(page);
    expect(status).toBe(200);
  });

  test("schedule stages with dates have daysUntilDue and isOverdue", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getSchedule(page);
    const b = body as { stages: Array<{ daysUntilDue: number | null; isOverdue: boolean }> };
    for (const s of b.stages) {
      expect(typeof s.isOverdue).toBe("boolean");
      // daysUntilDue can be null only if no endDate, but stages list only includes dated stages
      expect(s.daysUntilDue === null || typeof s.daysUntilDue === "number").toBe(true);
    }
  });

  test("windows next90 value >= next60 value >= next30 value (cumulative)", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getSchedule(page);
    const { windows } = body as {
      windows: { next30: { value: number }; next60: { value: number }; next90: { value: number } };
    };
    expect(windows.next60.value).toBeGreaterThanOrEqual(windows.next30.value);
    expect(windows.next90.value).toBeGreaterThanOrEqual(windows.next60.value);
  });

  test("commercial can access schedule", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await getSchedule(page);
    expect(status).toBe(200);
  });
});
