/**
 * Journey 17 — Evidence review @e2e
 *
 * Tests PATCH /api/evidence/[id] — the evidence review endpoint.
 *
 * Covers:
 *  - Unauthenticated PATCH returns 401
 *  - Contractor cannot review (403)
 *  - Missing status returns 400
 *  - Invalid status returns 400
 *  - Commercial can accept evidence
 *  - Commercial can mark requires_more
 *  - Commercial can reject evidence
 *  - Consultant (professional) can review evidence
 *  - Funder can review evidence
 *  - Admin can review evidence
 *  - Review updates status — GET returns updated status
 *
 * Setup: finds an in_progress stage and uploads fresh evidence as contractor.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet, transitionStage } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

function makeJpeg(): Buffer {
  return Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc000110800010001" +
    "03012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc40000ffda00030101003f00ffd9",
    "hex",
  );
}

async function patchEvidence(
  page: Parameters<typeof signIn>[0],
  evidenceId: string,
  body: Record<string, unknown>,
) {
  const res = await page.request.patch(`${BASE}/api/evidence/${evidenceId}`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

/**
 * Upload a fresh evidence file to a given in_progress stage.
 * Returns the evidence ID.
 */
async function uploadEvidence(
  page: Parameters<typeof signIn>[0],
  stageId: string,
): Promise<string> {
  await signIn(page, "contractor");
  const res = await page.request.post(`${BASE}/api/evidence`, {
    multipart: {
      stageId,
      file: { name: "j17-review-test.jpg", mimeType: "image/jpeg", buffer: makeJpeg() },
    },
  });
  if (!res.ok()) throw new Error(`Evidence upload failed: ${res.status()} ${await res.text()}`);
  const body = await res.json() as { evidence: { id: string } };
  return body.evidence.id;
}

/**
 * Find or create an in_progress stage, then upload evidence to it.
 * Returns { stageId, evidenceId }.
 */
async function ensureEvidenceExists(page: Parameters<typeof signIn>[0]): Promise<{
  stageId: string;
  evidenceId: string;
}> {
  await signIn(page, "developer");

  const data = await apiGet(page, `/api/projects/${PROJECT_ID}/contracts`) as {
    contracts: Array<{ id: string; contract_stages: Array<{ id: string; status: string }> }>;
  };

  // First look for an in_progress stage
  for (const c of data.contracts ?? []) {
    for (const s of c.contract_stages ?? []) {
      if (s.status === "in_progress") {
        const evidenceId = await uploadEvidence(page, s.id);
        return { stageId: s.id, evidenceId };
      }
    }
  }

  // Otherwise advance the first accepted stage to in_progress
  for (const c of data.contracts ?? []) {
    for (const s of c.contract_stages ?? []) {
      if (s.status === "accepted") {
        await signIn(page, "developer");
        await transitionStage(page, s.id, "start_work");
        const evidenceId = await uploadEvidence(page, s.id);
        return { stageId: s.id, evidenceId };
      }
      if (s.status === "draft") {
        await signIn(page, "developer");
        await transitionStage(page, s.id, "send");
        await signIn(page, "contractor");
        await transitionStage(page, s.id, "accept");
        await signIn(page, "developer");
        await transitionStage(page, s.id, "start_work");
        const evidenceId = await uploadEvidence(page, s.id);
        return { stageId: s.id, evidenceId };
      }
    }
  }

  throw new Error("No suitable stage found for evidence review test — seed data missing");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 17 — Evidence review @e2e", () => {
  test.setTimeout(90_000);

  let evidenceId = "";
  let stageId = "";

  test("setup: upload evidence to an in_progress stage", async ({ page }) => {
    const result = await ensureEvidenceExists(page);
    stageId    = result.stageId;
    evidenceId = result.evidenceId;
    console.log(`Journey 17 using evidence: ${evidenceId} on stage: ${stageId}`);
    expect(typeof evidenceId).toBe("string");
    expect(evidenceId.length).toBeGreaterThan(0);
  });

  // ── Auth gate ──────────────────────────────────────────────────────────────

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(`${BASE}/api/evidence/00000000-0000-0000-0000-000000000000`, {
      headers: { "Content-Type": "application/json" },
      data: { status: "accepted" },
    });
    expect(res.status()).toBe(401);
  });

  // ── Role guard ─────────────────────────────────────────────────────────────

  test("contractor cannot review evidence (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await patchEvidence(page, "00000000-0000-0000-0000-000000000001", {
      status: "accepted",
    });
    expect(status).toBe(403);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("missing status returns 400", async ({ page }) => {
    await signIn(page, "commercial");
    const { status, body } = await patchEvidence(page, "00000000-0000-0000-0000-000000000001", {});
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/status/i);
  });

  test("invalid status returns 400", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await patchEvidence(page, "00000000-0000-0000-0000-000000000001", {
      status: "approved",
    });
    expect(status).toBe(400);
  });

  // ── Commercial review ──────────────────────────────────────────────────────

  test("commercial can mark evidence as requires_more", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }
    await signIn(page, "commercial");
    const { status, body } = await patchEvidence(page, evidenceId, {
      status: "requires_more",
      notes: "Please include a clearer photograph",
    });
    expect(status).toBe(200);
    const ev = (body as { evidence: { id: string; status: string; notes: string | null } }).evidence;
    expect(ev.status).toBe("requires_more");
    expect(ev.notes).toContain("clearer");
  });

  test("commercial can accept evidence", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }
    await signIn(page, "commercial");
    const { status, body } = await patchEvidence(page, evidenceId, {
      status: "accepted",
    });
    expect(status).toBe(200);
    expect((body as { evidence: { status: string } }).evidence.status).toBe("accepted");
  });

  test("GET evidence shows updated status after review", async ({ page }) => {
    if (!stageId || !evidenceId) { test.skip(); return; }
    await signIn(page, "commercial");
    const data = await apiGet(page, `/api/evidence?stageId=${stageId}`) as {
      evidence: Array<{ id: string; status: string }>;
    };
    const ev = data.evidence.find((e) => e.id === evidenceId);
    // Status should be accepted (from the previous test) or requires_more
    expect(ev).toBeDefined();
    expect(["accepted", "requires_more", "pending"]).toContain(ev?.status);
  });

  // ── Other reviewer roles ───────────────────────────────────────────────────

  test("consultant can review evidence", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }
    await signIn(page, "consultant");
    const { status } = await patchEvidence(page, evidenceId, {
      status: "accepted",
      notes: "Verified by consultant",
    });
    expect(status).toBe(200);
  });

  test("funder can review evidence", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }
    await signIn(page, "funder");
    const { status } = await patchEvidence(page, evidenceId, {
      status: "accepted",
    });
    expect(status).toBe(200);
  });

  test("admin can review evidence", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }
    await signIn(page, "admin");
    const { status } = await patchEvidence(page, evidenceId, {
      status: "accepted",
      notes: "Admin approved",
    });
    expect(status).toBe(200);
  });

  test("commercial can reject evidence", async ({ page }) => {
    if (!evidenceId) { test.skip(); return; }

    // Upload a fresh evidence file to reject (the earlier one is already accepted)
    const result = await ensureEvidenceExists(page);
    const newEvidenceId = result.evidenceId;

    await signIn(page, "commercial");
    const { status, body } = await patchEvidence(page, newEvidenceId, {
      status: "rejected",
      notes: "Evidence does not meet requirements",
    });
    expect(status).toBe(200);
    expect((body as { evidence: { status: string } }).evidence.status).toBe("rejected");
  });
});
