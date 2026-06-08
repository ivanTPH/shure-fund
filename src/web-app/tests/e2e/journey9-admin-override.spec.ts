/**
 * Journey 9 — Admin override @e2e
 *
 * Tests the PATCH /api/stages/[stageId]/override endpoint which allows
 * admins to force-set a stage status, bypassing the normal state machine.
 *
 * Covers:
 *  - Non-admin roles are blocked (403)
 *  - Missing reason returns 400
 *  - Invalid target status returns 400
 *  - Overriding to the same status returns 400
 *  - Admin can override stage to any valid status
 *  - Stage status actually changes in DB
 *  - Audit event with action=override_applied is written
 *  - Override reason is captured in audit metadata
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet, getStageStatus, transitionStage } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function patchOverride(
  page: Parameters<typeof signIn>[0],
  stageId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await page.request.patch(`${BASE}/api/stages/${stageId}/override`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

/** Find or create a reusable stage that is NOT in a terminal state. */
async function findOrCreateStage(page: Parameters<typeof signIn>[0]): Promise<string> {
  await signIn(page, "developer");

  const data = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
    contracts: Array<{ id: string; stages: Array<{ id: string; status: string }> }>;
  };

  // Prefer a non-released stage so we can override it freely
  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (s.status !== "released") return s.id;
    }
  }

  // All released — create a fresh draft stage
  const firstContract = data.contracts?.[0];
  expect(firstContract, "No contracts on test project").toBeTruthy();

  const res = await page.request.post(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${firstContract.id}/stages`,
    {
      headers: { "Content-Type": "application/json" },
      data: { name: "J9 Override Test Stage", value: 1_000 },
    },
  );
  expect(res.ok(), `Stage creation failed: ${await res.text()}`).toBe(true);
  const body = await res.json() as { stageId: string };
  return body.stageId;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 9 — Admin override @e2e", () => {
  test.setTimeout(90_000);

  let stageId: string;

  test("setup: find or create a non-released stage", async ({ page }) => {
    stageId = await findOrCreateStage(page);
    console.log(`Journey 9 using stage: ${stageId}`);
  });

  // ── Non-admin roles are blocked ───────────────────────────────────────────

  test("developer cannot override a stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "developer");

    const { status } = await patchOverride(page, stageId, {
      status: "in_progress",
      reason: "developer trying to override",
    });
    expect(status).toBe(403);
  });

  test("contractor cannot override a stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "contractor");

    const { status } = await patchOverride(page, stageId, {
      status: "in_progress",
      reason: "contractor trying to override",
    });
    expect(status).toBe(403);
  });

  test("commercial cannot override a stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const { status } = await patchOverride(page, stageId, {
      status: "in_progress",
      reason: "commercial trying to override",
    });
    expect(status).toBe(403);
  });

  test("funder cannot override a stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "funder");

    const { status } = await patchOverride(page, stageId, {
      status: "in_progress",
      reason: "funder trying to override",
    });
    expect(status).toBe(403);
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test("override without reason returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const { status, body } = await patchOverride(page, stageId, {
      status: "in_progress",
      // no reason
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/reason/i);
  });

  test("override with empty reason returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const { status } = await patchOverride(page, stageId, {
      status: "in_progress",
      reason: "   ", // whitespace only
    });
    expect(status).toBe(400);
  });

  test("override with invalid status returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const { status, body } = await patchOverride(page, stageId, {
      status: "flying",
      reason: "testing invalid status",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/invalid status/i);
  });

  test("override to the same status returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const currentStatus = await getStageStatus(page, stageId);
    const { status, body } = await patchOverride(page, stageId, {
      status: currentStatus,
      reason: "testing same-status guard",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/already/i);
  });

  // ── Admin can override ────────────────────────────────────────────────────

  test("admin can override stage to in_progress, bypassing state machine", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const currentStatus = await getStageStatus(page, stageId);
    const targetStatus = currentStatus === "in_progress" ? "awaiting_approval" : "in_progress";

    const { status, body } = await patchOverride(page, stageId, {
      status: targetStatus,
      reason: "J9 admin override test — forcing stage to " + targetStatus,
    });

    expect(status).toBeLessThan(300);
    const b = body as { ok: boolean; from: string; to: string };
    expect(b.ok).toBe(true);
    expect(b.from).toBe(currentStatus);
    expect(b.to).toBe(targetStatus);

    // Verify DB state changed
    const afterStatus = await getStageStatus(page, stageId);
    expect(afterStatus).toBe(targetStatus);
  });

  test("admin can override stage to any valid status (draft)", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const currentStatus = await getStageStatus(page, stageId);
    if (currentStatus === "draft") {
      console.log("Stage already draft — skipping draft override test");
      return;
    }

    const { status } = await patchOverride(page, stageId, {
      status: "draft",
      reason: "J9 reset stage back to draft for cleanup",
    });
    expect(status).toBeLessThan(300);

    const afterStatus = await getStageStatus(page, stageId);
    expect(afterStatus).toBe("draft");
  });

  // ── Audit event written ───────────────────────────────────────────────────

  test("override writes an audit event with action=override_applied", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    // Perform a known override
    const currentStatus = await getStageStatus(page, stageId);
    const targetStatus = currentStatus === "sent" ? "draft" : "sent";
    const overrideReason = "J9 audit trail verification override";

    const { status } = await patchOverride(page, stageId, {
      status: targetStatus,
      reason: overrideReason,
    });
    expect(status).toBeLessThan(300);

    // Fetch the project audit log and find the override event
    const audit = await apiGet(page, `/api/projects/${PROJECT_ID}/audit?limit=20`) as {
      events: Array<{
        action: string;
        fromState: string;
        toState: string;
        metadata?: { reason?: string };
      }>;
    };

    const overrideEvent = audit.events?.find(
      (e) => e.action === "override_applied" && e.toState === targetStatus,
    );

    expect(overrideEvent, "override_applied audit event should exist").toBeTruthy();
    expect(overrideEvent?.fromState).toBe(currentStatus);
    expect(overrideEvent?.metadata?.reason).toBe(overrideReason);
  });

  // ── Override a non-existent stage returns 404 ─────────────────────────────

  test("override on a non-existent stage returns 404", async ({ page }) => {
    await signIn(page, "admin");

    const { status } = await patchOverride(
      page,
      "00000000-0000-0000-0000-000000000000",
      { status: "in_progress", reason: "testing 404 path" },
    );
    expect(status).toBe(404);
  });
});
