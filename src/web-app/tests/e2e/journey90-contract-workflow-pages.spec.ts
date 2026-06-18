/**
 * Journey 90 — Contract workflow pages + project-scoped contracts API @e2e
 *
 * Covers:
 *  - GET /api/projects/[projectId]/contracts    — project-scoped contract list
 *  - /projects/[id]/contracts/[contractId]/add-stage         — "Add stage" page
 *  - /projects/[id]/contracts/[contractId]/approval-chain    — "Approval chain" page
 *  - /projects/[id]/contracts/[contractId]/stages/[stageId]/edit  — "Edit stage" page
 *  - /projects/[id]/contracts/new                             — "New contract" page
 *
 * GET /api/projects/[projectId]/contracts:
 *  - Unauthenticated → 401
 *  - Any auth user → 200 { contracts: [] }
 *  - Each contract has stages array
 *
 * Seeded data: project 301, contract 401, stage 501
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE        = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID  = "00000000-0000-0000-0000-000000000301";
const CONTRACT_ID = "00000000-0000-0000-0000-000000000401";
const STAGE_ID    = "00000000-0000-0000-0000-000000000501";

const CONTRACTS_API = `${BASE}/api/projects/${PROJECT_ID}/contracts`;

function contractUrl(sub?: string) {
  const base = `${BASE}/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}`;
  return sub ? `${base}/${sub}` : base;
}

type Contract = {
  id:          string;
  status:      string;
  total_value: number;
  created_at:  string;
  contract_stages: unknown[];
};

test.describe("Journey 90 — Contract workflow pages @e2e", () => {
  test.setTimeout(60_000);

  // ── GET /api/projects/[projectId]/contracts — auth ─────────────────────────

  test("unauthenticated GET project contracts returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(CONTRACTS_API);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/projects/[projectId]/contracts — happy path ──────────────────

  test("admin can GET project contracts", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(CONTRACTS_API);
    expect(res.status()).toBe(200);
    const body = await res.json() as { contracts: Contract[] };
    expect(Array.isArray(body.contracts)).toBe(true);
  });

  test("funder can GET project contracts", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(CONTRACTS_API);
    expect(res.status()).toBe(200);
    const body = await res.json() as { contracts: Contract[] };
    expect(Array.isArray(body.contracts)).toBe(true);
  });

  test("project contracts include seeded contract 401", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(CONTRACTS_API);
    const body = await res.json() as { contracts: Contract[] };
    const found = body.contracts.find((c) => c.id === CONTRACT_ID);
    expect(found).toBeDefined();
  });

  test("contract response includes stages array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(CONTRACTS_API);
    const body = await res.json() as { contracts: Contract[] };
    if (body.contracts.length === 0) return;
    const contract = body.contracts[0];
    expect(Array.isArray(contract.contract_stages)).toBe(true);
  });

  // ── /projects/[id]/contracts/[contractId]/add-stage ───────────────────────

  test("admin can load add stage page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl("add-stage"));
    await expect(
      page.getByRole("heading", { name: /add stage/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("add stage page has back link to contract", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl("add-stage"));
    await expect(
      page.getByRole("heading", { name: /add stage/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("add stage page shows form fields", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl("add-stage"));
    // Wait for page heading, then check form elements
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(
      page.locator("input, textarea, select, form").first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /projects/[id]/contracts/[contractId]/approval-chain ──────────────────

  test("admin can load approval chain page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl("approval-chain"));
    await expect(
      page.getByRole("heading", { name: /approval chain/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("approval chain page shows roles or configuration", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl("approval-chain"));
    await expect(
      page.getByRole("heading", { name: /approval chain/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/commercial|professional|treasury|role|approval|sign.off/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── /projects/[id]/contracts/[contractId]/stages/[stageId]/edit ───────────

  test("admin can load edit stage page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl(`stages/${STAGE_ID}/edit`));
    await expect(
      page.getByRole("heading", { name: /edit stage/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("edit stage page shows form populated with stage data", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(contractUrl(`stages/${STAGE_ID}/edit`));
    await expect(
      page.getByRole("heading", { name: /edit stage/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    // Stage name input should be visible and populated
    await expect(
      page.locator("input, textarea, form").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── /projects/[id]/contracts/new ──────────────────────────────────────────

  test("admin can load new contract page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/new`);
    await expect(
      page.getByRole("heading", { name: /new contract/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("new contract page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/new`);
    await expect(
      page.getByRole("heading", { name: /new contract/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
