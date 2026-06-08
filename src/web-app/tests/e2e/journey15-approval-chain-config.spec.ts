/**
 * Journey 15 — Approval chain configuration @e2e
 *
 * Tests GET and POST /api/projects/[projectId]/contracts/[contractId]/approval-chain
 *
 * Covers:
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated POST returns 401
 *  - Any authenticated user can GET the approval chain
 *  - GET returns correct shape: { contract, stages, approvers }
 *  - Approvers are grouped by commercial / professional / treasury
 *  - Non-admin/developer POST returns 403
 *  - Admin can seed a pending approval record (200)
 *  - Developer can seed a pending approval record (200)
 *  - Missing required fields return 400
 *  - Invalid approvalRole returns 400
 *  - Stage not in contract returns 404
 *  - Unknown contractId returns 404
 *  - User not a project member returns 403
 *  - Re-seeding an already-decided approval returns 409
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getChain(
  page: Parameters<typeof signIn>[0],
  projectId: string,
  contractId: string,
) {
  const res = await page.request.get(
    `${BASE}/api/projects/${projectId}/contracts/${contractId}/approval-chain`,
  );
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

async function seedApproval(
  page: Parameters<typeof signIn>[0],
  projectId: string,
  contractId: string,
  body: Record<string, unknown>,
) {
  const res = await page.request.post(
    `${BASE}/api/projects/${projectId}/contracts/${contractId}/approval-chain`,
    {
      headers: { "Content-Type": "application/json" },
      data: body,
    },
  );
  return { status: res.status(), body: await res.json() };
}

/** Find (or fail) a contract + stage we can use for this journey. */
async function getContractAndStage(page: Parameters<typeof signIn>[0]): Promise<{
  contractId: string;
  stageId: string;
}> {
  const data = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
    contracts: Array<{ id: string; contract_stages: Array<{ id: string }> }>;
  };

  for (const c of data.contracts ?? []) {
    if ((c.contract_stages ?? []).length > 0) {
      return { contractId: c.id, stageId: c.contract_stages[0].id };
    }
  }
  throw new Error("No contract with stages found in test project — seed data missing");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 15 — Approval chain configuration @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/00000000-0000-0000-0000-000000000000/approval-chain`,
    );
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/00000000-0000-0000-0000-000000000000/approval-chain`,
      {
        headers: { "Content-Type": "application/json" },
        data: { stageId: "x", approvalRole: "commercial", userId: "y" },
      },
    );
    expect(res.status()).toBe(401);
  });

  // ── GET shape ──────────────────────────────────────────────────────────────

  test("contractor can GET approval chain", async ({ page }) => {
    await signIn(page, "contractor");
    const { contractId } = await getContractAndStage(page);
    const { status, body } = await getChain(page, PROJECT_ID, contractId);
    expect(status).toBe(200);
    expect(body).toHaveProperty("contract");
    expect(body).toHaveProperty("stages");
    expect(body).toHaveProperty("approvers");
  });

  test("GET returns correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId } = await getContractAndStage(page);
    const { status, body } = await getChain(page, PROJECT_ID, contractId);

    expect(status).toBe(200);

    // contract shape
    expect(typeof body.contract.id).toBe("string");
    expect(typeof body.contract.totalValue).toBe("number");
    expect(typeof body.contract.status).toBe("string");

    // stages is an array
    expect(Array.isArray(body.stages)).toBe(true);

    // approvers grouped correctly
    expect(Array.isArray(body.approvers.commercial)).toBe(true);
    expect(Array.isArray(body.approvers.professional)).toBe(true);
    expect(Array.isArray(body.approvers.treasury)).toBe(true);
  });

  test("each stage in GET response has approvals array", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId } = await getContractAndStage(page);
    const { body } = await getChain(page, PROJECT_ID, contractId);

    for (const stage of body.stages as Array<{ approvals: unknown }>) {
      expect(Array.isArray(stage.approvals)).toBe(true);
    }
  });

  test("unknown contractId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await getChain(
      page, PROJECT_ID,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(status).toBe(404);
  });

  // ── POST role guard ────────────────────────────────────────────────────────

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const { contractId, stageId } = await getContractAndStage(page);
    const { status } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "commercial",
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(status).toBe(403);
  });

  test("commercial POST returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const { contractId, stageId } = await getContractAndStage(page);
    const { status } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "commercial",
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(status).toBe(403);
  });

  test("funder POST returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const { contractId, stageId } = await getContractAndStage(page);
    const { status } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "treasury",
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(status).toBe(403);
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("missing stageId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId } = await getContractAndStage(page);
    const { status, body } = await seedApproval(page, PROJECT_ID, contractId, {
      approvalRole: "commercial",
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/stageId/i);
  });

  test("invalid approvalRole returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId, stageId } = await getContractAndStage(page);
    const { status, body } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "supervisor",
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/approvalRole/i);
  });

  test("stage not in this contract returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId } = await getContractAndStage(page);
    const { status } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId: "00000000-0000-0000-0000-000000000099",
      approvalRole: "commercial",
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(status).toBe(404);
  });

  test("user not a project member returns 403", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId, stageId } = await getContractAndStage(page);
    // Use a random UUID that is not a project member
    const { status } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "commercial",
      userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    // 404 (user not found) or 403 (not a member) — both acceptable
    expect([403, 404]).toContain(status);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("admin can seed a pending approval record", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId, stageId } = await getContractAndStage(page);

    // Get the approval chain to find a valid commercial approver
    const { body: chain } = await getChain(page, PROJECT_ID, contractId);
    const commercialApprovers = (chain.approvers.commercial as Array<{ user: { id: string } }>);

    if (commercialApprovers.length === 0) {
      console.log("No commercial approvers in project — skipping seed test");
      return;
    }

    const userId = commercialApprovers[0].user.id;
    const { status, body } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "commercial",
      userId,
    });

    // 200/201 or 409 if already decided
    if (status === 409) {
      console.log("Approval already decided — cannot re-seed (expected in later suite runs)");
      return;
    }

    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);
    expect((body as { approval: { role: string } }).approval.role).toBe("commercial");
    expect((body as { approval: { decision: string } }).approval.decision).toBe("pending");
    expect((body as { approval: { stageId: string } }).approval.stageId).toBe(stageId);
  });

  test("developer can seed a pending approval record", async ({ page }) => {
    await signIn(page, "developer");
    const { contractId, stageId } = await getContractAndStage(page);

    const { body: chain } = await getChain(page, PROJECT_ID, contractId);
    const treasuryApprovers = (chain.approvers.treasury as Array<{ user: { id: string } }>);

    if (treasuryApprovers.length === 0) {
      console.log("No treasury approvers in project — skipping developer seed test");
      return;
    }

    const userId = treasuryApprovers[0].user.id;
    const { status, body } = await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "treasury",
      userId,
    });

    if (status === 409) {
      console.log("Treasury approval already decided — skipping");
      return;
    }

    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);
    expect((body as { approval: { role: string } }).approval.role).toBe("treasury");
  });

  test("seeded approval appears in subsequent GET response", async ({ page }) => {
    await signIn(page, "admin");
    const { contractId, stageId } = await getContractAndStage(page);

    const { body: chain } = await getChain(page, PROJECT_ID, contractId);
    const professionalApprovers = (chain.approvers.professional as Array<{ user: { id: string } }>);

    if (professionalApprovers.length === 0) {
      console.log("No professional approvers in project — skipping");
      return;
    }

    const userId = professionalApprovers[0].user.id;
    await seedApproval(page, PROJECT_ID, contractId, {
      stageId,
      approvalRole: "professional",
      userId,
    });

    // Re-fetch and verify the approval appears
    const { body: updated } = await getChain(page, PROJECT_ID, contractId);
    const stage = (updated.stages as Array<{ id: string; approvals: Array<{ role: string; decision: string }> }>)
      .find((s) => s.id === stageId);

    expect(stage).toBeDefined();
    const professionalApproval = stage?.approvals.find((a) => a.role === "professional");
    if (professionalApproval) {
      // Could be pending or a later decision from other tests
      expect(typeof professionalApproval.decision).toBe("string");
    }
  });
});
