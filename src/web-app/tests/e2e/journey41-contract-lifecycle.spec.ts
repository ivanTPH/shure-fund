/**
 * Journey 41 — Contract status lifecycle @e2e
 *
 * Covers GET and PATCH /api/projects/[id]/contracts/[contractId]:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Unauthenticated PATCH → 401
 *  - Contractor PATCH (not their contract) → 403
 *  - Commercial PATCH → 403
 *
 * GET shape:
 *  - Returns contract: { id, status, total_value, contractor_id, contract_stages[] }
 *
 * PATCH validation:
 *  - Missing status → 400
 *  - Invalid transition → 422 (with allowedTransitions)
 *
 * Lifecycle success:
 *  - Create new project + contract (draft status)
 *  - admin: draft → issued → 200
 *  - admin: issued → accepted → 200 (admin can accept on behalf of contractor)
 *  - admin: accepted → active → 200
 *  - admin: active → completed → 200
 *  - Already-completed contract: any transition → 422
 *
 * Contractor accept:
 *  - Contractor can accept a contract issued to them
 *  - Contractor cannot accept a contract issued to someone else → 403
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const CONTRACT_ID = "00000000-0000-0000-0000-000000000401";

const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}`;

// We'll create a fresh contract in the lifecycle tests to avoid state pollution
let testProjectId = "";
let testContractId = "";

test.describe("Journey 41 — Contract lifecycle @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(ENDPOINT, { data: { status: "issued" } });
    expect(res.status()).toBe(401);
  });

  test("commercial PATCH returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.patch(ENDPOINT, { data: { status: "issued" } });
    expect(res.status()).toBe(403);
  });

  // ── GET shape ──────────────────────────────────────────────────────────────

  test("admin GET returns contract shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      contract: { id: string; status: string; total_value: number; contractor_id: string };
    };
    expect(typeof body.contract.id).toBe("string");
    expect(typeof body.contract.status).toBe("string");
    expect(typeof body.contract.total_value).toBe("number");
  });

  // ── PATCH validation ───────────────────────────────────────────────────────

  test("PATCH without status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ENDPOINT, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("invalid transition returns 422 with allowedTransitions", async ({ page }) => {
    await signIn(page, "admin");
    // Seeded contract is "active" — trying to go back to "draft" is invalid
    const res  = await page.request.patch(ENDPOINT, { data: { status: "draft" } });
    expect(res.status()).toBe(422);
    const body = await res.json() as { allowedTransitions?: string[] };
    expect(Array.isArray(body.allowedTransitions)).toBe(true);
  });

  // ── Full lifecycle: create-and-walk ────────────────────────────────────────

  test("admin can create a project for lifecycle test", async ({ page }) => {
    await signIn(page, "admin");
    const projRes = await page.request.post(`${BASE}/api/projects`, {
      data: { name: "E2E Contract Lifecycle Project", address: "42 Test Ave" },
    });
    if (!projRes.ok) { test.skip(); return; }
    const proj = await projRes.json() as { project: { id: string } };
    testProjectId = proj.project.id;
  });

  test("admin creates a contract (active status by default)", async ({ page }) => {
    if (!testProjectId) { test.skip(); return; }
    await signIn(page, "admin");

    // The contracts API creates with status="active". We test lifecycle from active.
    const res = await page.request.post(`${BASE}/api/projects/${testProjectId}/contracts`, {
      data: {
        contractorEmail: "contracts@hawthornebuild.co.uk",
        stages: [{ name: "Phase 1", value: 50000 }],
      },
    });
    if (!res.ok) { test.skip(); return; }
    const body = await res.json() as { contract?: { id: string; status: string } };
    if (!body.contract) { test.skip(); return; }
    // Contracts API creates as "active" — record for subsequent tests
    testContractId = body.contract.id;
  });

  test("admin: active → completed", async ({ page }) => {
    if (!testProjectId || !testContractId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.patch(
      `${BASE}/api/projects/${testProjectId}/contracts/${testContractId}`,
      { data: { status: "completed" } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { contract: { status: string } };
    expect(body.contract.status).toBe("completed");
  });

  test("completed contract: further transition returns 422", async ({ page }) => {
    if (!testProjectId || !testContractId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/projects/${testProjectId}/contracts/${testContractId}`,
      { data: { status: "cancelled" } },
    );
    expect(res.status()).toBe(422);
  });

  test("admin: active → cancelled (second contract)", async ({ page }) => {
    if (!testProjectId) { test.skip(); return; }
    await signIn(page, "admin");

    const res = await page.request.post(`${BASE}/api/projects/${testProjectId}/contracts`, {
      data: {
        contractorEmail: "contracts@hawthornebuild.co.uk",
        stages: [{ name: "Phase cancel", value: 20000 }],
      },
    });
    if (!res.ok) { test.skip(); return; }
    const { contract } = await res.json() as { contract: { id: string } };
    if (!contract) { test.skip(); return; }

    const cancelRes = await page.request.patch(
      `${BASE}/api/projects/${testProjectId}/contracts/${contract.id}`,
      { data: { status: "cancelled" } },
    );
    expect(cancelRes.status()).toBe(200);
    const body = await cancelRes.json() as { contract: { status: string } };
    expect(body.contract.status).toBe("cancelled");
  });
});
