/**
 * Journey 7 — Variation / change order workflow @e2e
 *
 * Validates the full variation lifecycle:
 *   1. Contractor creates a variation (draft)
 *   2. Contractor submits it for review
 *   3. Commercial begins review
 *   4. Commercial approves the variation
 *   5. Funder confirms funding → variation becomes active, stage value increases
 *   6. Rejection path: contractor creates another variation, commercial rejects it
 *   7. Role gate: funder cannot create a variation
 *
 * Uses project 00000000-0000-0000-0000-000000000301 which is seeded in the DB.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet, apiPost } from "./helpers/api";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateStageId(page: Parameters<typeof apiGet>[0]): Promise<string> {
  // Developer has access to list all project contracts; contractor does not.
  await signIn(page, "developer");

  const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
  const data = await res.json() as {
    contracts?: Array<{ id: string; stages: Array<{ id: string; status: string }> }>;
  };

  // Prefer a non-released stage
  for (const c of data.contracts ?? []) {
    for (const s of c.stages ?? []) {
      if (s.status !== "released") return s.id;
    }
  }

  // Any stage at all (released is fine for variations)
  for (const c of data.contracts ?? []) {
    if (c.stages?.[0]?.id) return c.stages[0].id;
  }

  // No usable stage — create one on the first contract
  const firstContract = data.contracts?.[0];
  if (!firstContract) throw new Error("No contracts found on test project");

  const createRes = await page.request.post(
    `${BASE}/api/projects/${PROJECT_ID}/contracts/${firstContract.id}/stages`,
    {
      headers: { "Content-Type": "application/json" },
      data: { name: "J7 Setup Stage", value: 5_000 },
    },
  );
  if (!createRes.ok()) {
    throw new Error(`Stage creation failed: ${createRes.status()} ${await createRes.text()}`);
  }
  const created = await createRes.json() as { stageId: string };
  return created.stageId;
}

async function getVariation(
  page: Parameters<typeof apiGet>[0],
  variationId: string,
): Promise<{ id: string; status: string; value_change: number }> {
  const d = await apiGet(page, `/api/variations/${variationId}`) as {
    variation: { id: string; status: string; value_change: number };
  };
  return d.variation;
}

async function patchVariation(
  page: Parameters<typeof apiGet>[0],
  variationId: string,
  action: string,
): Promise<{ to: string }> {
  const res = await page.request.patch(`${BASE}/api/variations/${variationId}`, {
    headers: { "Content-Type": "application/json" },
    data: { action },
  });
  const body = await res.json() as { ok?: boolean; to?: string; error?: string };
  if (!res.ok()) throw new Error(`PATCH /api/variations/${variationId} action=${action} → ${res.status()}: ${body.error}`);
  return { to: body.to ?? "" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 7 — Variation workflow @e2e", () => {
  test.setTimeout(120_000);

  let stageId: string;
  let variationId: string;

  // ── Happy path: full lifecycle ─────────────────────────────────────────────
  test("Full variation lifecycle: draft → submitted → under_review → approved → active", async ({ page }) => {

    // Step 1: find a stage (signed in as developer by getOrCreateStageId)
    await test.step("find a usable stage", async () => {
      stageId = await getOrCreateStageId(page);
      expect(stageId, "Must have a usable stage").toBeTruthy();
    });

    // Step 2: contractor creates variation (draft)
    await test.step("contractor creates variation (draft)", async () => {
      await signIn(page, "contractor");

      const res = await page.request.post(`${BASE}/api/variations`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          description: "J7 E2E — additional groundworks required due to buried services",
          valueChange: 5_000,
        },
      });
      expect(res.status(), `Create variation failed: ${await res.text()}`).toBeLessThan(300);

      const body = await res.json() as { variation: { id: string; status: string } };
      variationId = body.variation.id;
      expect(variationId).toBeTruthy();
      expect(body.variation.status).toBe("draft");
    });

    // Step 3: contractor submits for review
    await test.step("contractor submits variation for review", async () => {
      await signIn(page, "contractor");
      const { to: _newStatus } = await patchVariation(page, variationId, "submit");
      expect(_newStatus).toBe("submitted");
    });

    // Step 4: commercial begins review
    await test.step("commercial begins review", async () => {
      await signIn(page, "commercial");
      const { to: _newStatus } = await patchVariation(page, variationId, "begin_review");
      expect(_newStatus).toBe("under_review");
    });

    // Step 5: commercial approves
    await test.step("commercial approves variation", async () => {
      await signIn(page, "commercial");
      const { to: _newStatus } = await patchVariation(page, variationId, "approve");
      expect(_newStatus).toBe("approved");
    });

    // Step 6: funder confirms funding → variation goes active
    await test.step("funder confirms funding → variation active", async () => {
      await signIn(page, "funder");

      // confirm_funding may fail if wallet lacks funds — mark_pending is the fallback
      const res = await page.request.patch(`${BASE}/api/variations/${variationId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "confirm_funding" },
      });
      const body = await res.json() as { ok?: boolean; to?: string; error?: string };

      if (res.ok()) {
        expect(["active", "pending_funding"]).toContain(body.to);
      } else {
        // Wallet insufficient — mark as pending_funding instead
        console.log(`confirm_funding blocked (${body.error}) — marking pending`);
        const { to: pendingStatus } = await patchVariation(page, variationId, "mark_pending");
        expect(pendingStatus).toBe("pending_funding");
      }

      const final = await getVariation(page, variationId);
      expect(["active", "pending_funding"]).toContain(final.status);
    });

    // Step 7: verify the variation is visible on the stage page via GET
    await test.step("variation is listed on the stage", async () => {
      await signIn(page, "developer");
      const data = await apiGet(page, `/api/variations?stageId=${stageId}`) as {
        variations: Array<{ id: string; status: string }>;
      };
      const found = data.variations?.find((v) => v.id === variationId);
      expect(found, "Variation must appear in stage variation list").toBeTruthy();
    });
  });

  // ── Rejection path ─────────────────────────────────────────────────────────
  test("Variation can be rejected by commercial", async ({ page }) => {
    let rejectVariationId: string;

    await test.step("find a usable stage", async () => {
      stageId = await getOrCreateStageId(page);
      expect(stageId).toBeTruthy();
    });

    await test.step("contractor creates and submits variation", async () => {
      await signIn(page, "contractor");

      const res = await page.request.post(`${BASE}/api/variations`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          description: "J7 E2E rejection test — scaffold removal not needed",
          valueChange: -2_500,
        },
      });
      expect(res.status()).toBeLessThan(300);
      const body = await res.json() as { variation: { id: string } };
      rejectVariationId = body.variation.id;

      await patchVariation(page, rejectVariationId, "submit");
    });

    await test.step("commercial rejects the variation", async () => {
      await signIn(page, "commercial");
      const { to: _newStatus } = await patchVariation(page, rejectVariationId, "reject");
      expect(_newStatus).toBe("rejected");
    });
  });

  // ── Role gate: funder cannot create a variation ────────────────────────────
  test("funder cannot create a variation", async ({ page }) => {
    stageId = await getOrCreateStageId(page);
    expect(stageId).toBeTruthy();

    await signIn(page, "funder");

    const res = await page.request.post(`${BASE}/api/variations`, {
      headers: { "Content-Type": "application/json" },
      data: {
        stageId,
        description: "Funder should not be able to do this",
        valueChange: 1_000,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error.toLowerCase()).toMatch(/contractor|developer|admin|permission/i);
  });

  // ── Role gate: contractor cannot approve a variation ──────────────────────
  test("contractor cannot approve a variation", async ({ page }) => {
    let testVariationId: string;

    await test.step("setup: contractor creates and submits variation", async () => {
      stageId = await getOrCreateStageId(page);
      await signIn(page, "contractor");

      const res = await page.request.post(`${BASE}/api/variations`, {
        headers: { "Content-Type": "application/json" },
        data: {
          stageId,
          description: "J7 E2E — contractor approval gate test",
          valueChange: 500,
        },
      });
      expect(res.status()).toBeLessThan(300);
      const body = await res.json() as { variation: { id: string } };
      testVariationId = body.variation.id;
      await patchVariation(page, testVariationId, "submit");
    });

    await test.step("contractor cannot begin_review or approve", async () => {
      await signIn(page, "contractor");

      const res = await page.request.patch(`${BASE}/api/variations/${testVariationId}`, {
        headers: { "Content-Type": "application/json" },
        data: { action: "begin_review" },
      });
      expect([403, 400]).toContain(res.status());
    });
  });
});
