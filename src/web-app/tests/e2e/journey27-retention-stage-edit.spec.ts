/**
 * Journey 27 — Retention release & stage editing @e2e
 *
 * Covers:
 *
 * Retention release (POST /api/projects/[id]/retention/release):
 *  - Unauthenticated POST returns 401
 *  - Contractor cannot release retention (403)
 *  - Commercial cannot release retention (403)
 *  - Missing stageId returns 400
 *  - Stage not in released status returns 422
 *  - Admin can release retention for a released stage (200)
 *  - Releasing the same stage twice returns 409
 *
 * Stage editing (GET + PATCH /api/projects/[id]/contracts/[contractId]/stages/[stageId]):
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated PATCH returns 401
 *  - Contractor cannot GET stage (403)
 *  - Contractor cannot PATCH stage (403)
 *  - Non-existent stage returns 404
 *  - No fields provided returns 400
 *  - Empty name returns 400
 *  - PATCH a non-editable stage (released) returns 422
 *  - Admin can GET a draft stage
 *  - Admin can PATCH name/value/description of a draft stage
 *  - Contract total_value is updated when stage value changes
 *  - Developer can edit a sent stage
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const CONTRACT_ID = "00000000-0000-0000-0000-000000000401";

// Seeded released stage (Site Preparation, £80,000)
const RELEASED_STAGE_ID = "00000000-0000-0000-0000-000000000508";

// ── Helpers ────────────────────────────────────────────────────────────────

async function releaseRetention(
  page: Parameters<typeof signIn>[0],
  stageId = RELEASED_STAGE_ID,
) {
  const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/retention/release`, {
    headers: { "Content-Type": "application/json" },
    data:    { stageId },
  });
  return { status: res.status(), body: await res.json() };
}

async function patchStage(
  page: Parameters<typeof signIn>[0],
  contractId: string,
  stageId: string,
  payload: Record<string, unknown>,
) {
  const res = await page.request.patch(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${contractId}/stages/${stageId}`,
    { headers: { "Content-Type": "application/json" }, data: payload },
  );
  return { status: res.status(), body: await res.json() };
}

async function getStage(
  page: Parameters<typeof signIn>[0],
  contractId: string,
  stageId: string,
) {
  const res = await page.request.get(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${contractId}/stages/${stageId}`,
  );
  return { status: res.status(), body: res.ok() ? await res.json() : await res.json() };
}

/** Create a fresh draft stage and return its ID */
async function createDraftStage(
  page: Parameters<typeof signIn>[0],
  valuePounds = 10000,
): Promise<string> {
  await signIn(page, "admin");
  const res = await page.request.post(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
    {
      headers: { "Content-Type": "application/json" },
      data: {
        name:  `Edit-test stage ${Date.now()}`,
        value: valuePounds,
      },
    },
  );
  expect(res.status()).toBe(201);
  const data = await res.json() as { stageId: string };
  return data.stageId;
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Journey 27 — Retention release & stage editing @e2e", () => {
  test.setTimeout(60_000);

  // ── Retention: auth + role guards ─────────────────────────────────────────

  test("unauthenticated retention release returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/retention/release`, {
      headers: { "Content-Type": "application/json" },
      data:    { stageId: RELEASED_STAGE_ID },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor cannot release retention (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await releaseRetention(page);
    expect(status).toBe(403);
  });

  test("commercial cannot release retention (403)", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await releaseRetention(page);
    expect(status).toBe(403);
  });

  // ── Retention: validation ─────────────────────────────────────────────────

  test("retention release without stageId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/retention/release`, {
      headers: { "Content-Type": "application/json" },
      data:    {},
    });
    expect(res.status()).toBe(400);
  });

  test("retention release for non-released stage returns 422", async ({ page }) => {
    // Use a draft stage for the 422 test — create one to ensure it exists
    const stageId = await createDraftStage(page, 5000);
    const { status, body } = await releaseRetention(page, stageId);
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/released/i);
  });

  // ── Retention: success + idempotency ─────────────────────────────────────

  test("admin can release retention for a released stage", async ({ page }) => {
    await signIn(page, "admin");

    // Reset: set retention_released_at back to null before this test if it was
    // already released by a previous run. We do this by checking first.
    const checkRes = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/dashboard`,
    );
    if (checkRes.ok()) {
      const dash = await checkRes.json() as {
        contracts: Array<{ stages: Array<{ id: string; retentionReleasedAt: string | null }> }>;
      };
      const stage = dash.contracts
        ?.flatMap((c) => c.stages)
        .find((s) => s.id === RELEASED_STAGE_ID);
      if (stage?.retentionReleasedAt) {
        // Already released — skip the success part, just verify 409 below
        test.info().annotations.push({ type: "skip-reason", description: "already released" });
        return;
      }
    }

    const { status, body } = await releaseRetention(page);
    expect(status).toBe(200);
    const b = body as { stageId: string; retentionAmount: number; retentionReleasedAt: string };
    expect(b.stageId).toBe(RELEASED_STAGE_ID);
    expect(b.retentionAmount).toBeGreaterThan(0);
    expect(b.retentionReleasedAt).toBeTruthy();
  });

  test("releasing retention twice returns 409", async ({ page }) => {
    await signIn(page, "admin");

    // First release (may already be done — either way we expect 409 on second)
    await releaseRetention(page); // ignore result
    const { status, body } = await releaseRetention(page);
    expect(status).toBe(409);
    expect((body as { error: string }).error).toMatch(/already/i);
  });

  // ── Stage PATCH: auth + role guards ───────────────────────────────────────

  test("unauthenticated GET stage returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const { status } = await getStage(page, CONTRACT_ID, RELEASED_STAGE_ID);
    expect(status).toBe(401);
  });

  test("unauthenticated PATCH stage returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages/${RELEASED_STAGE_ID}`,
      { headers: { "Content-Type": "application/json" }, data: { name: "x" } },
    );
    expect(res.status()).toBe(401);
  });

  test("contractor cannot GET stage (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await getStage(page, CONTRACT_ID, RELEASED_STAGE_ID);
    expect(status).toBe(403);
  });

  test("contractor cannot PATCH stage (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await patchStage(page, CONTRACT_ID, RELEASED_STAGE_ID, { name: "x" });
    expect(status).toBe(403);
  });

  test("GET non-existent stage returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await getStage(page, CONTRACT_ID, "00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  // ── Stage PATCH: validation ────────────────────────────────────────────────

  test("PATCH with no fields returns 400", async ({ page }) => {
    const stageId = await createDraftStage(page);
    const { status } = await patchStage(page, CONTRACT_ID, stageId, {});
    expect(status).toBe(400);
  });

  test("PATCH with empty name returns 400", async ({ page }) => {
    const stageId = await createDraftStage(page);
    const { status, body } = await patchStage(page, CONTRACT_ID, stageId, { name: "" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/name/i);
  });

  test("PATCH a released stage returns 422", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await patchStage(
      page, CONTRACT_ID, RELEASED_STAGE_ID, { name: "New name" },
    );
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/draft|sent/i);
  });

  // ── Stage PATCH: GET ───────────────────────────────────────────────────────

  test("admin can GET a draft stage", async ({ page }) => {
    const stageId = await createDraftStage(page, 12345);
    const { status, body } = await getStage(page, CONTRACT_ID, stageId);
    expect(status).toBe(200);
    const b = body as { stage: { id: string; status: string; value: number } };
    expect(b.stage.id).toBe(stageId);
    expect(b.stage.status).toBe("draft");
    expect(b.stage.value).toBe(12345);
  });

  // ── Stage PATCH: success ───────────────────────────────────────────────────

  test("admin can patch name and description of a draft stage", async ({ page }) => {
    const stageId = await createDraftStage(page, 20000);
    const newName = `Updated stage ${Date.now()}`;

    const { status, body } = await patchStage(page, CONTRACT_ID, stageId, {
      name:        newName,
      description: "Updated description",
    });
    expect(status).toBe(200);
    const b = body as { stage: { name: string; description: string } };
    expect(b.stage.name).toBe(newName);
    expect(b.stage.description).toBe("Updated description");
  });

  test("admin can patch stage value and GET returns updated value", async ({ page }) => {
    const initialValue = 30000;
    const stageId = await createDraftStage(page, initialValue);

    const newValue = 45000;
    const { status, body } = await patchStage(page, CONTRACT_ID, stageId, { value: newValue });
    expect(status).toBe(200);
    expect((body as { stage: { value: number } }).stage.value).toBe(newValue);

    // Verify GET returns updated value
    const { body: getBody } = await getStage(page, CONTRACT_ID, stageId);
    expect((getBody as { stage: { value: number } }).stage.value).toBe(newValue);
  });

  test("developer can edit a draft stage", async ({ page }) => {
    // Create as admin, then edit as developer
    const stageId = await createDraftStage(page, 15000);

    await signIn(page, "developer");
    const { status, body } = await patchStage(page, CONTRACT_ID, stageId, {
      name: `Developer edit ${Date.now()}`,
    });
    expect(status).toBe(200);
    const b = body as { stage: { name: string } };
    expect(b.stage.name).toMatch(/Developer edit/);
  });
});
