/**
 * Journey 34 — Drawdown requests @e2e
 *
 * Covers GET/POST /api/projects/[id]/drawdown-requests and
 *        PATCH   /api/projects/[id]/drawdown-requests/[reqId]:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Contractor GET → 403
 *  - Commercial GET → 403
 *  - Funder GET → 200
 *  - Admin GET → 200
 *
 * POST validation:
 *  - Missing amount → 400
 *  - amount = 0 → 400
 *  - Contractor POST → 403
 *  - Developer POST → 403
 *
 * POST success:
 *  - Funder creates request → 201
 *  - Admin creates request → 201
 *  - Response has request.id, amount, status = "pending"
 *
 * PATCH (review):
 *  - Missing action → 400
 *  - Invalid action → 400
 *  - Non-existent reqId → 404
 *  - Admin approve → 200, status = "approved"
 *  - Re-approve (already approved) → 409
 *  - Admin reject pending → 200, status = "rejected"
 *  - Admin withdraw → 200, status = "withdrawn"
 *
 * Shape:
 *  - GET response has requests[], pending[], totalApproved
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/drawdown-requests`;

let approveReqId  = "";
let rejectReqId   = "";
let withdrawReqId = "";

test.describe("Journey 34 — Drawdown requests @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("commercial GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { requests: unknown[]; pending: unknown[]; totalApproved: number };
    expect(Array.isArray(body.requests)).toBe(true);
    expect(Array.isArray(body.pending)).toBe(true);
    expect(typeof body.totalApproved).toBe("number");
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("POST without amount returns 400", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(ENDPOINT, { data: { description: "test" } });
    expect(res.status()).toBe(400);
  });

  test("POST with amount = 0 returns 400", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(ENDPOINT, { data: { amount: 0 } });
    expect(res.status()).toBe(400);
  });

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(403);
  });

  test("developer POST returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(403);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("funder can create drawdown request (201)", async ({ page }) => {
    await signIn(page, "funder");
    const res  = await page.request.post(ENDPOINT, {
      data: { amount: 25000, description: "E2E funder drawdown" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { request: { id: string; amount: number; status: string } };
    expect(body.request.id).toBeTruthy();
    expect(body.request.amount).toBe(25000);
    expect(body.request.status).toBe("pending");
    withdrawReqId = body.request.id;
  });

  test("admin can create drawdown request (201)", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.post(ENDPOINT, {
      data: { amount: 50000, description: "E2E admin drawdown — to approve" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { request: { id: string } };
    approveReqId = body.request.id;
  });

  test("admin creates second pending request for reject test", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.post(ENDPOINT, {
      data: { amount: 10000, description: "E2E admin drawdown — to reject" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { request: { id: string } };
    rejectReqId = body.request.id;
  });

  // ── PATCH validation ───────────────────────────────────────────────────────

  test("PATCH without action returns 400", async ({ page }) => {
    if (!approveReqId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.patch(`${ENDPOINT}/${approveReqId}`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("PATCH with invalid action returns 400", async ({ page }) => {
    if (!approveReqId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.patch(`${ENDPOINT}/${approveReqId}`, { data: { action: "banana" } });
    expect(res.status()).toBe(400);
  });

  test("PATCH non-existent reqId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(`${ENDPOINT}/00000000-0000-0000-0000-000000000001`, {
      data: { action: "approve" },
    });
    expect(res.status()).toBe(404);
  });

  // ── PATCH success ──────────────────────────────────────────────────────────

  test("admin can approve a pending request", async ({ page }) => {
    if (!approveReqId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.patch(`${ENDPOINT}/${approveReqId}`, {
      data: { action: "approve", reviewNotes: "Approved — all checks passed" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { request: { status: string } };
    expect(body.request.status).toBe("approved");
  });

  test("re-approving an approved request returns 409", async ({ page }) => {
    if (!approveReqId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.patch(`${ENDPOINT}/${approveReqId}`, { data: { action: "approve" } });
    expect(res.status()).toBe(409);
  });

  test("admin can reject a pending request", async ({ page }) => {
    if (!rejectReqId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.patch(`${ENDPOINT}/${rejectReqId}`, {
      data: { action: "reject", reviewNotes: "Insufficient PoF balance" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { request: { status: string; review_notes: string | null } };
    expect(body.request.status).toBe("rejected");
  });

  test("requester can withdraw their own pending request", async ({ page }) => {
    if (!withdrawReqId) { test.skip(); return; }
    await signIn(page, "funder");
    const res  = await page.request.patch(`${ENDPOINT}/${withdrawReqId}`, { data: { action: "withdraw" } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { request: { status: string } };
    expect(body.request.status).toBe("withdrawn");
  });

  // ── GET shape after operations ─────────────────────────────────────────────

  test("GET totalApproved reflects approved requests", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      requests: Array<{ status: string; amount: number }>;
      totalApproved: number;
    };
    const expectedApproved = body.requests
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + Number(r.amount), 0);
    expect(body.totalApproved).toBeCloseTo(expectedApproved, 0);
  });
});
