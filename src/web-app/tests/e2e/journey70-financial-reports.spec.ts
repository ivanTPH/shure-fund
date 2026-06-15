/**
 * Journey 70 — Financial reports page & budget API @e2e
 *
 * Covers:
 *  - GET /api/projects/[projectId]/budget — budget vs actual analysis
 *  - /projects/[id]/reports — financial reports UI page
 *
 * Budget API:
 *  - Auth: 401 unauthenticated
 *  - Contractor → 403
 *  - Funder / developer / admin → 200
 *
 * Budget response shape:
 *  { contracts: [...], portfolio: { originalTotal, variationTotal, currentTotal,
 *    certifiedTotal, paidTotal, pendingTotal, retentionHeld, retentionReleased } }
 *
 *  Per contract: { id, contractorName, contractStatus, stages[], summary }
 *  Per stage: { id, name, status, originalValue, variationImpact, currentValue,
 *               certifiedAmount, paid, retentionWithheld, retentionReleased, variance }
 *
 * Invariants:
 *  - portfolio.currentTotal = originalTotal + variationTotal
 *  - paidTotal >= 0 and <= currentTotal
 *  - retentionHeld >= 0
 *  - Per-stage: currentValue = originalValue + variationImpact
 *
 * Reports page:
 *  - Heading "Financial report"
 *  - Export buttons: "Export certified CSV", "Export variations CSV", etc.
 *  - Shows sections: certified vs instructed, retention, variations
 *
 * Seeded data:
 *  - Project 301 has contracts and stages
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const BUDGET_URL  = `${BASE}/api/projects/${PROJECT_ID}/budget`;
const REPORTS_URL = `${BASE}/projects/${PROJECT_ID}/reports`;

type Portfolio = {
  originalTotal: number;
  variationTotal: number;
  currentTotal: number;
  certifiedTotal: number;
  paidTotal: number;
  pendingTotal: number;
  retentionHeld: number;
  retentionReleased: number;
};

type ContractStage = {
  id: string;
  name: string;
  status: string;
  originalValue: number;
  variationImpact: number;
  currentValue: number;
  certifiedAmount: number | null;
  paid: number;
  retentionWithheld: number;
  variance: number | null;
};

type BudgetBody = {
  contracts: Array<{
    id: string;
    contractorName: string;
    contractStatus: string;
    stages: ContractStage[];
    summary: Portfolio;
  }>;
  portfolio: Portfolio;
};

test.describe("Journey 70 — Financial reports page & budget API @e2e", () => {
  test.setTimeout(60_000);

  // ── Budget API auth guards ────────────────────────────────────────────────

  test("unauthenticated budget GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(401);
  });

  test("contractor budget GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(403);
  });

  // ── Budget API — allowed roles ────────────────────────────────────────────

  test("admin budget GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(200);
  });

  test("funder budget GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(200);
  });

  test("developer budget GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(200);
  });

  // ── Budget API — response shape ───────────────────────────────────────────

  test("budget response has contracts array and portfolio", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as BudgetBody;
    expect(Array.isArray(body.contracts)).toBe(true);
    expect(body.portfolio).toBeTruthy();
  });

  test("portfolio has correct field types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    const { portfolio } = body;
    expect(typeof portfolio.originalTotal).toBe("number");
    expect(typeof portfolio.variationTotal).toBe("number");
    expect(typeof portfolio.currentTotal).toBe("number");
    expect(typeof portfolio.paidTotal).toBe("number");
    expect(typeof portfolio.retentionHeld).toBe("number");
    expect(typeof portfolio.retentionReleased).toBe("number");
  });

  test("portfolio: currentTotal = originalTotal + variationTotal", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    const { portfolio: p } = body;
    expect(Math.round(p.currentTotal)).toBe(Math.round(p.originalTotal + p.variationTotal));
  });

  test("portfolio: paidTotal >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    expect(body.portfolio.paidTotal).toBeGreaterThanOrEqual(0);
  });

  test("portfolio: retentionHeld >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    expect(body.portfolio.retentionHeld).toBeGreaterThanOrEqual(0);
  });

  test("portfolio: pendingTotal = currentTotal - paidTotal", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    const { portfolio: p } = body;
    expect(Math.round(p.pendingTotal)).toBe(Math.round(p.currentTotal - p.paidTotal));
  });

  // ── Stage-level shape ────────────────────────────────────────────────────

  test("budget stages have correct field types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    const stage = body.contracts.flatMap((c) => c.stages)[0];
    if (!stage) return;
    expect(typeof stage.id).toBe("string");
    expect(typeof stage.name).toBe("string");
    expect(typeof stage.originalValue).toBe("number");
    expect(typeof stage.variationImpact).toBe("number");
    expect(typeof stage.currentValue).toBe("number");
    expect(typeof stage.paid).toBe("number");
    expect(typeof stage.retentionWithheld).toBe("number");
  });

  test("per-stage: currentValue = originalValue + variationImpact", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    for (const c of body.contracts) {
      for (const s of c.stages) {
        expect(Math.round(s.currentValue)).toBe(
          Math.round(s.originalValue + s.variationImpact)
        );
      }
    }
  });

  // ── Portfolio vs stage sum ────────────────────────────────────────────────

  test("portfolio.originalTotal = sum of all stage originalValues", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(BUDGET_URL);
    const body = await res.json() as BudgetBody;
    const stageSum = body.contracts
      .flatMap((c) => c.stages)
      .reduce((s, st) => s + st.originalValue, 0);
    expect(Math.round(body.portfolio.originalTotal)).toBe(Math.round(stageSum));
  });

  // ── Financial reports page ────────────────────────────────────────────────

  test("admin can load reports page heading", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(REPORTS_URL);
    // Wait specifically for h1 "Financial report" (not the loading spinner text)
    await expect(page.getByRole("heading", { name: "Financial report", exact: true }))
      .toBeVisible({ timeout: 20_000 });
  });

  test("reports page shows Export certified CSV button after data loads", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(REPORTS_URL);
    // Wait for data to load (heading appears once data is set)
    await expect(page.getByRole("heading", { name: "Financial report", exact: true }))
      .toBeVisible({ timeout: 20_000 });
    // Export buttons are rendered in the same render cycle
    await expect(page.getByRole("button", { name: "Export certified CSV" }))
      .toBeVisible({ timeout: 5_000 });
  });

  test("reports page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(REPORTS_URL);
    await expect(page.getByRole("link", { name: /back to project/i }))
      .toBeVisible({ timeout: 20_000 });
  });

  test("reports page shows stage data after load", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(REPORTS_URL);
    await expect(page.getByRole("heading", { name: "Financial report", exact: true }))
      .toBeVisible({ timeout: 20_000 });
    // Look for section headers from the reports page
    await expect(
      page.getByText(/certified|instructed|variation|retention/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
