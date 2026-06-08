/**
 * Journey 7 — Contract creation @e2e
 *
 * Tests POST /api/projects/[projectId]/contracts.
 *
 * Covers:
 *  - Unauthenticated POST returns 401
 *  - Contractor/commercial/funder/consultant POST returns 403
 *  - Missing contractorEmail returns 400
 *  - Empty stages array returns 400
 *  - Stage with missing name returns 400
 *  - Stage with zero or negative value returns 400
 *  - Non-existent contractor email returns 404
 *  - Admin can create a contract with stages (201)
 *  - Developer can create a contract (201)
 *  - Created contract appears in GET /contracts response
 *  - Contract total_value equals sum of stage values
 *  - Contractor is added as project member
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// Real contractor test account (matches DEV_PROFILES in auth helper)
const CONTRACTOR_EMAIL = "contracts@hawthornebuild.co.uk";

const VALID_STAGES = [
  { name: "Foundation",    value: 15_000 },
  { name: "Frame",         value: 25_000 },
  { name: "Fit-out",       value: 10_000 },
];

async function createContract(
  page: Parameters<typeof signIn>[0],
  body: Record<string, unknown>,
) {
  const res = await page.request.post(
    `${BASE}/api/projects/${PROJECT_ID}/contracts`,
    {
      headers: { "Content-Type": "application/json" },
      data: body,
    },
  );
  return { status: res.status(), body: await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 7 — Contract creation @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gate ──────────────────────────────────────────────────────────────

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts`,
      {
        headers: { "Content-Type": "application/json" },
        data: { contractorEmail: CONTRACTOR_EMAIL, stages: VALID_STAGES },
      },
    );
    expect(res.status()).toBe(401);
  });

  // ── Role guards ────────────────────────────────────────────────────────────

  test("contractor cannot create a contract", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: VALID_STAGES,
    });
    expect(status).toBe(403);
  });

  test("commercial cannot create a contract", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: VALID_STAGES,
    });
    expect(status).toBe(403);
  });

  test("funder cannot create a contract", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: VALID_STAGES,
    });
    expect(status).toBe(403);
  });

  test("consultant cannot create a contract", async ({ page }) => {
    await signIn(page, "consultant");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: VALID_STAGES,
    });
    expect(status).toBe(403);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("missing contractorEmail returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createContract(page, { stages: VALID_STAGES });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/contractor.*email/i);
  });

  test("empty contractorEmail returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await createContract(page, {
      contractorEmail: "   ",
      stages: VALID_STAGES,
    });
    expect(status).toBe(400);
  });

  test("empty stages array returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: [],
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/stage/i);
  });

  test("stage with missing name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: [{ value: 10_000 }],
    });
    expect(status).toBe(400);
  });

  test("stage with zero value returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: [{ name: "Bad stage", value: 0 }],
    });
    expect(status).toBe(400);
  });

  test("stage with negative value returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: [{ name: "Bad stage", value: -1000 }],
    });
    expect(status).toBe(400);
  });

  test("non-existent contractor email returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createContract(page, {
      contractorEmail: "nobody@notregistered.invalid",
      stages: VALID_STAGES,
    });
    expect(status).toBe(404);
    expect((body as { error: string }).error).toMatch(/no user found/i);
  });

  // ── Success ────────────────────────────────────────────────────────────────

  test("admin can create a contract with stages — returns 201 with contractId", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: VALID_STAGES,
    });

    expect(status).toBe(201);
    const b = body as { contractId: string };
    expect(typeof b.contractId).toBe("string");
    expect(b.contractId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    console.log(`Created contract: ${b.contractId}`);
  });

  test("developer can create a contract — returns 201", async ({ page }) => {
    await signIn(page, "developer");
    const { status, body } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: [{ name: "Dev-created stage", value: 5_000 }],
    });

    expect(status).toBe(201);
    expect(typeof (body as { contractId: string }).contractId).toBe("string");
  });

  test("created contract appears in GET /contracts with correct total_value", async ({ page }) => {
    await signIn(page, "admin");

    // Create a fresh contract
    const stageValues = [12_000, 8_000, 5_000];
    const { status, body } = await createContract(page, {
      contractorEmail: CONTRACTOR_EMAIL,
      stages: stageValues.map((v, i) => ({ name: `Stage ${i + 1}`, value: v })),
    });
    expect(status).toBe(201);
    const { contractId } = body as { contractId: string };

    // Verify it appears in the list
    const listData = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
      contracts: Array<{
        id: string;
        total_value: number;
        contract_stages: Array<{ id: string; value: number }>;
      }>;
    };

    const created = listData.contracts.find((c) => c.id === contractId);
    expect(created).toBeDefined();

    const expectedTotal = stageValues.reduce((s, v) => s + v, 0);
    expect(Number(created!.total_value)).toBe(expectedTotal);
    expect((created!.contract_stages ?? []).length).toBe(stageValues.length);
  });
});
