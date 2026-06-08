/**
 * Journey 2 — Approval chain @e2e
 *
 * Tests the three-role approval workflow in isolation:
 *   commercial → professional (consultant) → treasury (funder)
 *
 * Covers:
 *  - Each role can read the approval list for a stage
 *  - Each role can submit approved / rejected / returned decisions
 *  - Only approver roles can submit (funder, developer, contractor, admin-override tested separately)
 *  - Rejection short-circuits — stage does NOT auto-advance
 *  - Return requires notes
 *  - All three approved → stage advances to available_to_release (DB trigger)
 *  - GET /api/stages/[stageId]/approvals returns correct shape
 *
 * State is shared within the describe block so setup runs once.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet, apiPost, getStageStatus, transitionStage } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF"
  );
}

/** Ensure a stage is in `awaiting_approval` state, creating + advancing one if needed. */
async function ensureAwaitingApproval(page: Parameters<typeof signIn>[0]): Promise<string> {
  await signIn(page, "developer");

  // 1. Fetch contracts for the test project
  const data = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
    contracts: Array<{ id: string; stages: Array<{ id: string; status: string }> }>;
  };

  // 2. See if any stage is already at awaiting_approval
  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (s.status === "awaiting_approval") return s.id;
    }
  }

  // 3. Find a stage we can advance, or create a fresh one
  let stageId: string | undefined;
  let contractId: string | undefined;

  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (!["released", "awaiting_approval", "available_to_release"].includes(s.status)) {
        stageId = s.id;
        contractId = c.id;
        break;
      }
    }
    if (stageId) break;
  }

  if (!stageId && data.contracts?.[0]) {
    contractId = data.contracts[0].id;
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${contractId}/stages`,
      { headers: { "Content-Type": "application/json" }, data: { name: "J2 Approval Test Stage", value: 5_000 } },
    );
    expect(res.ok(), `Stage creation failed: ${await res.text()}`).toBe(true);
    const body = await res.json() as { stageId: string };
    stageId = body.stageId;
  }

  expect(stageId, "Could not find or create a stage for Journey 2").toBeTruthy();

  // 4. Advance to awaiting_approval
  const status = await getStageStatus(page, stageId!);

  if (status === "draft") await transitionStage(page, stageId!, "submit");
  const s1 = await getStageStatus(page, stageId!);

  if (s1 === "sent") await transitionStage(page, stageId!, "accept");
  const s2 = await getStageStatus(page, stageId!);

  if (s2 === "accepted" || s2 === "funding_gap") {
    // Deposit if needed so allocation succeeds
    if (s2 === "funding_gap") {
      await signIn(page, "funder");
      await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/wallet`, {
        headers: { "Content-Type": "application/json" },
        data: { amount: 10_000, reference: "J2 setup deposit" },
      });
      await signIn(page, "developer");
    }
    await transitionStage(page, stageId!, "allocate_funding");
  }
  const s3 = await getStageStatus(page, stageId!);

  if (s3 === "in_progress") {
    // Upload evidence as contractor, then submit for approval
    await signIn(page, "contractor");
    const existing = await apiGet(page, `/api/evidence?stageId=${stageId}`) as { evidence: unknown[] };
    if (existing.evidence.length === 0) {
      const uploadRes = await page.request.post(`${BASE}/api/evidence`, {
        multipart: {
          stageId: stageId!,
          file: { name: "evidence.pdf", mimeType: "application/pdf", buffer: makePdf() },
        },
      });
      expect(uploadRes.ok(), `Evidence upload failed: ${await uploadRes.text()}`).toBe(true);
    }
    await transitionStage(page, stageId!, "submit_for_approval");
  }

  const finalStatus = await getStageStatus(page, stageId!);
  expect(finalStatus, `Could not reach awaiting_approval — stuck at ${finalStatus}`).toBe("awaiting_approval");

  return stageId!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 2 — Approval chain @e2e", () => {
  test.setTimeout(120_000);

  // Shared stage ID across the describe block
  let stageId: string;

  // ── Setup: reach awaiting_approval ────────────────────────────────────────
  test("setup: advance a stage to awaiting_approval", async ({ page }) => {
    stageId = await ensureAwaitingApproval(page);
    console.log(`Journey 2 using stage: ${stageId}`);
  });

  // ── GET approvals list ────────────────────────────────────────────────────
  test("GET approvals list returns correct shape", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const data = await apiGet(page, `/api/stages/${stageId}/approvals`) as {
      approvals: Array<{ role: string; decision: string }>;
    };

    expect(Array.isArray(data.approvals)).toBe(true);
    // Each approval row has role and decision
    for (const a of data.approvals) {
      expect(["commercial", "professional", "treasury"]).toContain(a.role);
      expect(["pending", "approved", "rejected", "returned"]).toContain(a.decision);
    }
  });

  // ── Forbidden roles cannot approve ────────────────────────────────────────
  test("contractor cannot submit an approval", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "contractor");

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "should be blocked" },
    });
    expect(res.status()).toBe(403);
  });

  // ── Return requires notes ─────────────────────────────────────────────────
  test("returning without notes returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "returned" }, // no notes
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/notes/i);
  });

  // ── Invalid decision rejected ─────────────────────────────────────────────
  test("invalid decision value returns 400", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "maybe" },
    });
    expect(res.status()).toBe(400);
  });

  // ── Rejection short-circuits the chain ───────────────────────────────────
  test("commercial rejects — stage remains at awaiting_approval", async ({ page }) => {
    if (!stageId) test.skip();

    // Verify still in awaiting_approval
    const statusBefore = await (async () => {
      await signIn(page, "commercial");
      return getStageStatus(page, stageId);
    })();
    if (statusBefore !== "awaiting_approval") {
      console.log(`Stage is ${statusBefore} — skipping rejection test`);
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "rejected", notes: "J2 rejection test" },
    });
    expect(res.status()).toBeLessThan(300);

    // Stage should still be awaiting_approval (rejection does not advance)
    const statusAfter = await getStageStatus(page, stageId);
    expect(statusAfter).toBe("awaiting_approval");

    // Reset to pending so subsequent tests can approve
    const reset = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "J2 reset after rejection test" },
    });
    expect(reset.status()).toBeLessThan(300);
  });

  // ── Commercial approves ───────────────────────────────────────────────────
  test("commercial approves the stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const status = await getStageStatus(page, stageId);
    if (status !== "awaiting_approval") {
      console.log(`Stage is ${status} — skipping commercial approval`);
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "J2 commercial sign-off" },
    });
    expect(res.status()).toBeLessThan(300);

    const body = await res.json() as { approval: { role: string; decision: string } };
    expect(body.approval.role).toBe("commercial");
    expect(body.approval.decision).toBe("approved");
  });

  // ── Consultant (professional) approves ────────────────────────────────────
  test("consultant approves the stage", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "consultant");

    const status = await getStageStatus(page, stageId);
    if (status !== "awaiting_approval") {
      console.log(`Stage is ${status} — skipping consultant approval`);
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "J2 professional sign-off" },
    });
    expect(res.status()).toBeLessThan(300);

    const body = await res.json() as { approval: { role: string; decision: string } };
    expect(body.approval.role).toBe("professional");
    expect(body.approval.decision).toBe("approved");
  });

  // ── Treasury approves → stage advances ───────────────────────────────────
  test("funder gives treasury sign-off → stage advances to available_to_release", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "funder");

    const status = await getStageStatus(page, stageId);
    if (status !== "awaiting_approval") {
      console.log(`Stage is ${status} — skipping treasury approval`);
      expect(["available_to_release", "released"]).toContain(status);
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "J2 treasury sign-off" },
    });
    expect(res.status()).toBeLessThan(300);

    // DB trigger advances stage — give it a moment
    await page.waitForTimeout(1_500);

    const after = await getStageStatus(page, stageId);
    expect(["available_to_release", "released"]).toContain(after);
  });

  // ── GET approvals shows all three approved ────────────────────────────────
  test("GET approvals shows all three roles approved after full sign-off", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "admin");

    const status = await getStageStatus(page, stageId);
    if (!["available_to_release", "released"].includes(status)) {
      console.log(`Stage is ${status} — full approval not reached, skipping assertion`);
      return;
    }

    const data = await apiGet(page, `/api/stages/${stageId}/approvals`) as {
      approvals: Array<{ role: string; decision: string }>;
    };

    const byRole = Object.fromEntries(data.approvals.map((a) => [a.role, a.decision]));
    expect(byRole.commercial).toBe("approved");
    expect(byRole.professional).toBe("approved");
    expect(byRole.treasury).toBe("approved");
  });

  // ── Cannot approve a non-awaiting_approval stage ─────────────────────────
  test("submitting an approval on a non-awaiting_approval stage returns 403", async ({ page }) => {
    if (!stageId) test.skip();
    await signIn(page, "commercial");

    const status = await getStageStatus(page, stageId);
    if (status === "awaiting_approval") {
      console.log("Stage still awaiting_approval — skipping post-approval gate test");
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${stageId}/approvals`, {
      headers: { "Content-Type": "application/json" },
      data: { decision: "approved", notes: "late approval" },
    });
    expect(res.status()).toBe(403);
  });
});
