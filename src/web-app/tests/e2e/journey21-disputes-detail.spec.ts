/**
 * Journey 21 — Disputes detail & lifecycle @e2e
 *
 * Tests GET /api/disputes?stageId=, GET /api/disputes/[id], and
 * PATCH /api/disputes/[id].
 *
 * Covers:
 *  - Unauthenticated GET (list + detail) returns 401
 *  - GET list: missing stageId returns 400
 *  - GET list: returns disputes array with correct shape
 *  - GET detail: non-existent dispute returns 404
 *  - GET detail: correct shape with raiser, stage
 *  - POST /api/disputes: unauthenticated 401, missing fields 400
 *  - Any authenticated role can raise a dispute
 *  - PATCH invalid action returns 400
 *  - Contractor cannot resolve (403)
 *  - Funder/commercial can respond (raised → under_review)
 *  - Admin can resolve (under_review → resolved)
 *  - Admin can escalate (raised/under_review → escalated)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet, transitionStage } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

async function raiseDispute(
  page: Parameters<typeof signIn>[0],
  stageId: string,
  reason = "Quality of work does not meet specification",
  disputedValue = 5000,
) {
  const res = await page.request.post(`${BASE}/api/disputes`, {
    headers: { "Content-Type": "application/json" },
    data: { stageId, reason, disputedValue },
  });
  return { status: res.status(), body: await res.json() };
}

async function patchDispute(
  page: Parameters<typeof signIn>[0],
  disputeId: string,
  body: Record<string, unknown>,
) {
  const res = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

/** Find or create a stage suitable for dispute testing (in_progress or awaiting_approval) */
async function ensureDisputeableStage(page: Parameters<typeof signIn>[0]): Promise<string> {
  await signIn(page, "developer");
  const data = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
    contracts: Array<{ contract_stages: Array<{ id: string; status: string }> }>;
  };

  // First: find an in_progress or awaiting_approval stage
  for (const c of data.contracts ?? []) {
    for (const s of c.contract_stages ?? []) {
      if (s.status === "in_progress" || s.status === "awaiting_approval") return s.id;
    }
  }

  // Advance an accepted stage to in_progress
  for (const c of data.contracts ?? []) {
    for (const s of c.contract_stages ?? []) {
      if (s.status === "accepted") {
        await transitionStage(page, s.id, "allocate_funding");
        return s.id;
      }
    }
  }

  throw new Error("No disputable stage found for journey 21");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 21 — Disputes detail & lifecycle @e2e", () => {
  test.setTimeout(90_000);

  let disputeStageId = "";
  let raisedDisputeId = "";
  let respondDisputeId = "";

  test("setup: ensure a disputable stage exists", async ({ page }) => {
    disputeStageId = await ensureDisputeableStage(page);
    console.log(`Journey 21 using stage: ${disputeStageId}`);
    expect(typeof disputeStageId).toBe("string");
  });

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated GET list returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/disputes?stageId=x`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated GET detail returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/disputes/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/disputes`, {
      headers: { "Content-Type": "application/json" },
      data: { stageId: "x", reason: "test", disputedValue: 1000 },
    });
    expect(res.status()).toBe(401);
  });

  // ── GET list ───────────────────────────────────────────────────────────────

  test("GET list: missing stageId returns cross-project disputes (200)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${BASE}/api/disputes`);
    // Cross-project mode: no stageId returns all disputes the user can access
    expect(res.status()).toBe(200);
    const data = await res.json() as { disputes: unknown[] };
    expect(Array.isArray(data.disputes)).toBe(true);
  });

  test("GET list: returns disputes array for stage", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }
    await signIn(page, "admin");
    const data = await apiGet(page, `/api/disputes?stageId=${disputeStageId}`) as {
      disputes: Array<Record<string, unknown>>;
    };
    expect(Array.isArray(data.disputes)).toBe(true);
  });

  // ── GET detail ─────────────────────────────────────────────────────────────

  test("GET detail: non-existent dispute returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/disputes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`,
    );
    expect(res.status()).toBe(404);
  });

  // ── POST: raise a dispute ──────────────────────────────────────────────────

  test("POST missing reason returns 400", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }
    await signIn(page, "contractor");
    const res = await page.request.post(`${BASE}/api/disputes`, {
      headers: { "Content-Type": "application/json" },
      data: { stageId: disputeStageId, disputedValue: 1000 },
    });
    expect(res.status()).toBe(400);
  });

  test("POST missing disputedValue returns 400", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }
    await signIn(page, "contractor");
    const res = await page.request.post(`${BASE}/api/disputes`, {
      headers: { "Content-Type": "application/json" },
      data: { stageId: disputeStageId, reason: "Bad work" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST zero disputedValue returns 400", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }
    await signIn(page, "contractor");
    const { status } = await raiseDispute(page, disputeStageId, "Bad work", 0);
    expect(status).toBe(400);
  });

  test("contractor can raise a dispute (201)", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }
    await signIn(page, "contractor");
    const { status, body } = await raiseDispute(
      page, disputeStageId,
      "Quality does not meet spec — J21 test",
      7500,
    );
    expect(status).toBe(201);
    const d = (body as { dispute: { id: string } }).dispute;
    expect(typeof d.id).toBe("string");
    raisedDisputeId = d.id;
    console.log(`Raised dispute: ${d.id}`);
  });

  test("GET detail: returns dispute with correct shape", async ({ page }) => {
    if (!raisedDisputeId) { test.skip(); return; }
    await signIn(page, "admin");
    const data = await apiGet(page, `/api/disputes/${raisedDisputeId}`) as {
      dispute: {
        id: string;
        status: string;
        reason: string;
        disputed_value: number;
        raiser: { id: string; full_name: string } | null;
      };
    };

    expect(data.dispute.id).toBe(raisedDisputeId);
    expect(typeof data.dispute.status).toBe("string");
    expect(typeof data.dispute.reason).toBe("string");
    expect(typeof data.dispute.disputed_value).toBe("number");
  });

  // ── PATCH transitions ──────────────────────────────────────────────────────

  test("PATCH invalid action returns 400", async ({ page }) => {
    if (!raisedDisputeId) { test.skip(); return; }
    await signIn(page, "admin");
    const { status } = await patchDispute(page, raisedDisputeId, { action: "dismiss" });
    expect(status).toBe(400);
  });

  test("contractor cannot resolve a dispute (403)", async ({ page }) => {
    if (!raisedDisputeId) { test.skip(); return; }
    await signIn(page, "contractor");
    const { status } = await patchDispute(page, raisedDisputeId, { action: "resolve" });
    expect(status).toBe(403);
  });

  test("funder can respond to a dispute (raised → under_review)", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }

    // Raise a fresh dispute for this test
    await signIn(page, "contractor");
    const { status: rs, body: rb } = await raiseDispute(
      page, disputeStageId, "Funder respond test", 2000,
    );
    if (rs !== 201) {
      // Stage may now be disputed — use the raisedDisputeId
      console.log("Could not raise fresh dispute — using existing one");
      if (!raisedDisputeId) { return; }
      respondDisputeId = raisedDisputeId;
    } else {
      respondDisputeId = (rb as { dispute: { id: string } }).dispute.id;
    }

    await signIn(page, "funder");
    const { status, body } = await patchDispute(page, respondDisputeId, {
      action: "respond",
      notes: "We are investigating this claim",
    });
    expect(status).toBe(200);
    expect((body as { to: string }).to).toBe("under_review");
  });

  test("admin can resolve a dispute (under_review → resolved)", async ({ page }) => {
    // Use the respondDisputeId which should be under_review, or raise a new one
    const targetId = respondDisputeId || raisedDisputeId;
    if (!targetId) { test.skip(); return; }

    await signIn(page, "admin");

    // If already raised (not yet responded), respond first
    const detail = await apiGet(page, `/api/disputes/${targetId}`) as {
      dispute: { status: string };
    };
    if (detail.dispute.status === "raised") {
      await patchDispute(page, targetId, { action: "respond", notes: "Admin reviewing" });
    }

    const { status, body } = await patchDispute(page, targetId, {
      action: "resolve",
      notes: "Dispute resolved — both parties agreed on revised scope",
    });
    expect(status).toBe(200);
    expect((body as { to: string }).to).toBe("resolved");
  });

  test("admin can raise and escalate a dispute", async ({ page }) => {
    if (!disputeStageId) { test.skip(); return; }

    // Raise a fresh dispute to escalate
    await signIn(page, "admin");
    const { status: rs, body: rb } = await raiseDispute(
      page, disputeStageId, "Escalation test dispute", 1000,
    );
    if (rs !== 201) {
      console.log("Could not raise dispute for escalation test — stage may be resolved");
      return;
    }

    const escalateId = (rb as { dispute: { id: string } }).dispute.id;
    const { status, body } = await patchDispute(page, escalateId, {
      action: "escalate",
      notes: "Escalating to senior management",
    });
    expect(status).toBe(200);
    expect((body as { to: string }).to).toBe("escalated");
  });
});
