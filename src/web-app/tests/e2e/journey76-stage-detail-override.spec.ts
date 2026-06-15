/**
 * Journey 76 — Stage detail GET & admin override @e2e
 *
 * Covers:
 *  - GET  /api/stages/[stageId]
 *  - PATCH /api/stages/[stageId]/override
 *
 * Stage GET:
 *  - Auth: unauthenticated → 401
 *  - Auth: any authenticated user → 200 (no role guard)
 *  - Unknown stageId → 404
 *  - Response: { stage: { id, name, description, value, status, start_date,
 *               end_date, created_at, contracts: { id, project_id, ... } } }
 *
 * Admin override (PATCH):
 *  - Unauthenticated → 401
 *  - Non-admin → 403 (all roles except admin)
 *  - Missing status → 400
 *  - Invalid status → 400
 *  - Missing reason → 400
 *  - Same status as current → 400 ("already in status")
 *  - Happy path: { ok: true, from: string, to: string }
 *
 * Valid stage statuses: draft, sent, accepted, in_progress, awaiting_approval,
 *   returned, disputed, available_to_release, released, funding_gap, part_funded
 *
 * Seeded data: project 301 has contracts and stages
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 76 — Stage detail GET & admin override @e2e", () => {
  test.setTimeout(60_000);

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function getFirstStage(page: import("@playwright/test").Page) {
    const dashRes = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/dashboard`,
    );
    const dash = await dashRes.json() as {
      contracts: Array<{ stages: Array<{ id: string; status: string }> }>;
    };
    return dash.contracts.flatMap((c) => c.stages)[0] ?? null;
  }

  // ── Stage GET — auth ──────────────────────────────────────────────────────

  test("unauthenticated stage GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(
      `${BASE}/api/stages/00000000-0000-0000-0000-000000000001`,
    );
    expect(res.status()).toBe(401);
  });

  test("admin stage GET returns 200 for valid stage", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.get(`${BASE}/api/stages/${stage.id}`);
    expect(res.status()).toBe(200);
  });

  test("contractor can GET stage detail", async ({ page }) => {
    await signIn(page, "contractor");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.get(`${BASE}/api/stages/${stage.id}`);
    expect(res.status()).toBe(200);
  });

  test("unknown stage returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/stages/00000000-0000-0000-0000-000000099999`,
    );
    expect(res.status()).toBe(404);
  });

  // ── Stage GET — response shape ────────────────────────────────────────────

  test("stage GET response has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res  = await page.request.get(`${BASE}/api/stages/${stage.id}`);
    const body = await res.json() as {
      stage: {
        id: string; name: string; value: number; status: string;
        created_at: string;
        contracts: { id: string; project_id: string } | Array<{ id: string; project_id: string }>;
      };
    };
    expect(typeof body.stage.id).toBe("string");
    expect(typeof body.stage.name).toBe("string");
    expect(typeof body.stage.value).toBe("number");
    expect(typeof body.stage.status).toBe("string");
    expect(typeof body.stage.created_at).toBe("string");
    // contracts may be array or object depending on Supabase join
    const contract = Array.isArray(body.stage.contracts)
      ? body.stage.contracts[0]
      : body.stage.contracts;
    expect(typeof contract.project_id).toBe("string");
  });

  // ── Stage override — auth guards ──────────────────────────────────────────

  test("unauthenticated override returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(
      `${BASE}/api/stages/00000000-0000-0000-0000-000000000001/override`,
      { data: { status: "draft", reason: "test" } },
    );
    expect(res.status()).toBe(401);
  });

  test("funder override returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "draft", reason: "test" } },
    );
    expect(res.status()).toBe(403);
  });

  test("developer override returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "draft", reason: "test" } },
    );
    expect(res.status()).toBe(403);
  });

  test("contractor override returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "draft", reason: "test" } },
    );
    expect(res.status()).toBe(403);
  });

  test("commercial override returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "draft", reason: "test" } },
    );
    expect(res.status()).toBe(403);
  });

  // ── Stage override — validation ───────────────────────────────────────────

  test("override without status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { reason: "missing status test" } },
    );
    expect(res.status()).toBe(400);
  });

  test("override with invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "invalid_status", reason: "test" } },
    );
    expect(res.status()).toBe(400);
  });

  test("override without reason returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: "draft" } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/reason/i);
  });

  test("override to same status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;
    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: stage.status, reason: "same status test" } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/already/i);
  });

  // ── Stage override — happy path ───────────────────────────────────────────

  test("admin can override a stage status", async ({ page }) => {
    await signIn(page, "admin");
    const stage = await getFirstStage(page);
    if (!stage) return;

    // Pick a different valid status to override to
    const validStatuses = [
      "draft", "sent", "accepted", "in_progress", "awaiting_approval",
      "returned", "disputed", "available_to_release", "funding_gap",
    ];
    const targetStatus = validStatuses.find((s) => s !== stage.status) ?? "returned";

    const res = await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: targetStatus, reason: "E2E test override" } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean; from: string; to: string };
    expect(body.ok).toBe(true);
    expect(body.from).toBe(stage.status);
    expect(body.to).toBe(targetStatus);

    // Restore original status
    await page.request.patch(
      `${BASE}/api/stages/${stage.id}/override`,
      { data: { status: stage.status, reason: "E2E test restore" } },
    );
  });
});
