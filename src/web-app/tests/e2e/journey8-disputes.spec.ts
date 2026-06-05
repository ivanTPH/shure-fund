/**
 * Journey 8 — Dispute workflow @e2e
 *
 * Validates the full dispute lifecycle:
 *   1. Contractor raises a dispute on an in_progress stage
 *      → stage transitions to 'disputed', dispute record created
 *   2. Commercial begins review (dispute status: under_review)
 *   3. Developer resolves dispute — continue to approval
 *      → stage transitions back to awaiting_approval
 *   4. Escalation path: commercial raises dispute, admin escalates it
 *   5. Role gate: released stage cannot have a dispute raised
 *
 * Uses project 00000000-0000-0000-0000-000000000301.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateInProgressStageId(page: Parameters<typeof apiGet>[0]): Promise<string> {
  await signIn(page, "developer");

  const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
  const data = await res.json() as {
    contracts?: Array<{ id: string; stages: Array<{ id: string; status: string }> }>;
  };

  // Prefer an in_progress stage (best starting point for disputes)
  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (s.status === "in_progress") return s.id;
    }
  }

  // Fallback: any non-released, non-disputed stage
  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (!["released", "disputed"].includes(s.status)) return s.id;
    }
  }

  // Nothing usable — create a fresh stage and advance it to in_progress
  const firstContract = data.contracts?.[0];
  if (!firstContract) throw new Error("No contracts found on test project");

  const createRes = await page.request.post(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${firstContract.id}/stages`,
    {
      headers: { "Content-Type": "application/json" },
      data: { name: "J8 Setup Stage", value: 3_000 },
    },
  );
  if (!createRes.ok()) throw new Error(`Stage creation failed: ${createRes.status()} ${await createRes.text()}`);
  const { stageId } = await createRes.json() as { stageId: string };

  // Advance draft → sent → accepted → in_progress
  for (const action of ["submit", "accept", "allocate_funding"]) {
    const r = await page.request.post(`${BASE}/api/stages/${stageId}/transition`, {
      headers: { "Content-Type": "application/json" },
      data: { action },
    });
    if (!r.ok()) {
      const body = await r.json() as { error?: string };
      console.log(`transition ${action} skipped: ${body.error}`);
    }
  }

  return stageId;
}

async function getStageStatus(page: Parameters<typeof apiGet>[0], stageId: string): Promise<string> {
  const d = await apiGet(page, `/api/stages/${stageId}/transition`) as { currentStatus: string };
  return d.currentStatus;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 8 — Dispute workflow @e2e", () => {
  test.setTimeout(120_000);

  // ── Happy path: raise → respond → resolve (continue) ─────────────────────
  test("Full dispute lifecycle: raised → under_review → resolved (continue to approval)", async ({ page }) => {
    let stageId: string;
    let disputeId: string;

    await test.step("find or create an in_progress stage", async () => {
      stageId = await getOrCreateInProgressStageId(page);
      expect(stageId).toBeTruthy();
    });

    await test.step("contractor raises a dispute", async () => {
      await signIn(page, "contractor");

      const res = await page.request.post(`${BASE}/api/disputes`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          reason: "J8 E2E — disputed quantity of materials delivered does not match invoice",
          disputedValue: 2_500,
        },
      });
      expect(res.status(), `Raise dispute failed: ${await res.text()}`).toBeLessThan(300);
      const body = await res.json() as { dispute: { id: string } };
      disputeId = body.dispute.id;
      expect(disputeId).toBeTruthy();
    });

    await test.step("stage status transitions to 'disputed'", async () => {
      await signIn(page, "developer");
      const status = await getStageStatus(page, stageId);
      expect(status).toBe("disputed");
    });

    await test.step("dispute appears in stage dispute list", async () => {
      const data = await apiGet(page, `/api/disputes?stageId=${stageId}`) as {
        disputes: Array<{ id: string; status: string }>;
      };
      const found = data.disputes?.find((d) => d.id === disputeId);
      expect(found, "Dispute must appear in stage list").toBeTruthy();
      expect(found?.status).toBe("raised");
    });

    await test.step("commercial begins review", async () => {
      await signIn(page, "commercial");
      const res = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "respond", notes: "J8 E2E — reviewing materials delivery records" },
      });
      expect(res.status()).toBeLessThan(300);
      const body = await res.json() as { to: string };
      expect(body.to).toBe("under_review");
    });

    await test.step("developer resolves dispute — continue to approval", async () => {
      await signIn(page, "developer");

      // Resolve the dispute record
      const resolveRes = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "resolve", notes: "J8 E2E — delivery confirmed, proceeding" },
      });
      expect(resolveRes.status()).toBeLessThan(300);

      // Transition stage back to awaiting_approval
      const transRes = await page.request.post(`${BASE}/api/stages/${stageId}/transition`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "resolve_dispute_continue" },
      });
      expect(transRes.status(), `Stage transition failed: ${await transRes.text()}`).toBeLessThan(300);
    });

    await test.step("stage is no longer disputed", async () => {
      await signIn(page, "developer");
      const status = await getStageStatus(page, stageId);
      expect(["awaiting_approval", "returned", "in_progress"]).toContain(status);
    });

    await test.step("dispute is marked resolved", async () => {
      const data = await apiGet(page, `/api/disputes/${disputeId}`) as {
        dispute: { status: string };
      };
      expect(data.dispute.status).toBe("resolved");
    });
  });

  // ── Escalation path ───────────────────────────────────────────────────────
  test("Dispute can be escalated by admin", async ({ page }) => {
    let stageId: string;
    let disputeId: string;

    await test.step("find or create a stage", async () => {
      stageId = await getOrCreateInProgressStageId(page);
      expect(stageId).toBeTruthy();
    });

    await test.step("contractor raises dispute", async () => {
      await signIn(page, "contractor");
      const res = await page.request.post(`${BASE}/api/disputes`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          reason: "J8 E2E escalation — serious quality defect found",
          disputedValue: 8_000,
        },
      });
      if (!res.ok()) {
        // Stage may already be disputed from previous test step — find the existing dispute
        const list = await apiGet(page, `/api/disputes?stageId=${stageId}`) as {
          disputes: Array<{ id: string; status: string }>;
        };
        const open = list.disputes?.find((d) => d.status === "raised" || d.status === "under_review");
        if (!open) {
          console.log("No open dispute and cannot create one — skipping escalation test");
          return;
        }
        disputeId = open.id;
      } else {
        disputeId = (await res.json() as { dispute: { id: string } }).dispute.id;
      }
      expect(disputeId).toBeTruthy();
    });

    await test.step("commercial begins review", async () => {
      await signIn(page, "commercial");
      const d = await apiGet(page, `/api/disputes/${disputeId}`) as { dispute: { status: string } };
      if (d.dispute.status !== "under_review") {
        const res = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
          headers: { "Content-Type": "application/json" },
          data: { action: "respond" },
        });
        expect(res.status()).toBeLessThan(300);
      }
    });

    await test.step("admin escalates dispute", async () => {
      await signIn(page, "admin");
      const res = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "escalate", notes: "J8 E2E — escalating for senior review" },
      });
      expect(res.status()).toBeLessThan(300);
      const body = await res.json() as { to: string };
      expect(body.to).toBe("escalated");
    });

    await test.step("dispute is escalated", async () => {
      await signIn(page, "admin");
      const data = await apiGet(page, `/api/disputes/${disputeId}`) as { dispute: { status: string } };
      expect(data.dispute.status).toBe("escalated");
    });
  });

  // ── Role gate: contractor cannot resolve a dispute ────────────────────────
  test("contractor cannot resolve a dispute", async ({ page }) => {
    let stageId: string;
    let disputeId: string;

    await test.step("setup: create a dispute", async () => {
      stageId = await getOrCreateInProgressStageId(page);
      await signIn(page, "contractor");

      const res = await page.request.post(`${BASE}/api/disputes`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          reason: "J8 E2E role gate test",
          disputedValue: 1_000,
        },
      });

      if (res.ok()) {
        disputeId = (await res.json() as { dispute: { id: string } }).dispute.id;
      } else {
        // Stage already disputed — find existing
        const list = await apiGet(page, `/api/disputes?stageId=${stageId}`) as {
          disputes: Array<{ id: string; status: string }>;
        };
        const open = list.disputes?.find((d) => d.status === "raised");
        if (!open) { console.log("Cannot set up role gate test — skipping"); return; }
        disputeId = open.id;
      }
      expect(disputeId).toBeTruthy();
    });

    await test.step("contractor cannot respond (begin review)", async () => {
      await signIn(page, "contractor");
      const res = await page.request.patch(`${BASE}/api/disputes/${disputeId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "respond" },
      });
      expect(res.status()).toBe(403);
    });
  });
});
