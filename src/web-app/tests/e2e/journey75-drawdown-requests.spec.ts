/**
 * Journey 75 — Project drawdown requests API @e2e
 *
 * Covers:
 *  - GET  /api/projects/[projectId]/drawdown-requests
 *  - POST /api/projects/[projectId]/drawdown-requests
 *  - PATCH /api/projects/[projectId]/drawdown-requests/[reqId]
 *
 * A drawdown request is a formal ask to transfer funds from the
 * Tier 2 proof-of-funds bank account into the Tier 1 trust wallet.
 *
 * GET auth:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Commercial → 403
 *  - Developer/funder/admin → 200
 *
 * POST auth:
 *  - Contractor/commercial/developer → 403
 *  - Funder/admin → 201
 *
 * POST validation:
 *  - Missing amount → 400
 *  - amount <= 0 → 400
 *
 * GET response shape:
 *  { requests: [], pending: [], totalApproved: number }
 *
 * POST response shape:
 *  { request: { id, amount, description, status, created_at, requester } }
 *
 * PATCH actions: approve | reject | withdraw
 *  - Invalid action → 400
 *  - Non-existent reqId → 404
 *  - Already actioned → 409
 *  - Approve/reject: admin or funder only
 *  - Withdraw: original requester or admin
 *
 * Invariants:
 *  - totalApproved = sum(approved requests)
 *  - pending = requests where status = 'pending'
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/drawdown-requests`;

type DrawdownRequest = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  requester: { id: string; full_name: string | null; email: string } | null;
};

type GetBody = {
  requests:     DrawdownRequest[];
  pending:      DrawdownRequest[];
  totalApproved: number;
};

test.describe("Journey 75 — Project drawdown requests API @e2e", () => {
  test.setTimeout(60_000);

  // ── GET auth guards ──────────────────────────────────────────────────────

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

  // ── GET allowed roles ────────────────────────────────────────────────────

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── GET response shape ───────────────────────────────────────────────────

  test("GET response has requests, pending, and totalApproved", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as GetBody;
    expect(Array.isArray(body.requests)).toBe(true);
    expect(Array.isArray(body.pending)).toBe(true);
    expect(typeof body.totalApproved).toBe("number");
  });

  test("pending contains only pending-status requests", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as GetBody;
    for (const r of body.pending) {
      expect(r.status).toBe("pending");
    }
  });

  test("totalApproved >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as GetBody;
    expect(body.totalApproved).toBeGreaterThanOrEqual(0);
  });

  test("totalApproved equals sum of approved request amounts", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as GetBody;
    const approvedSum = body.requests
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + r.amount, 0);
    expect(Math.round(body.totalApproved)).toBe(Math.round(approvedSum));
  });

  test("request fields have correct types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as GetBody;
    if (body.requests.length === 0) return;
    const r = body.requests[0];
    expect(typeof r.id).toBe("string");
    expect(typeof r.amount).toBe("number");
    expect(typeof r.status).toBe("string");
    expect(typeof r.created_at).toBe("string");
  });

  // ── POST auth guards ─────────────────────────────────────────────────────

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(401);
  });

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(403);
  });

  test("commercial POST returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(403);
  });

  test("developer POST returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, { data: { amount: 1000 } });
    expect(res.status()).toBe(403);
  });

  // ── POST validation ───────────────────────────────────────────────────────

  test("POST without amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { description: "test" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/amount/i);
  });

  test("POST with amount=0 returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { amount: 0 } });
    expect(res.status()).toBe(400);
  });

  test("POST with negative amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { amount: -500 } });
    expect(res.status()).toBe(400);
  });

  // ── POST + PATCH happy path ──────────────────────────────────────────────

  test("admin can create and then withdraw a drawdown request", async ({ page }) => {
    await signIn(page, "admin");

    // Create a drawdown request
    const postRes = await page.request.post(ENDPOINT, {
      data: { amount: 500, description: "E2E test drawdown" },
    });
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json() as { request: DrawdownRequest };
    const reqId = postBody.request.id;
    expect(typeof reqId).toBe("string");
    expect(postBody.request.amount).toBe(500);
    expect(postBody.request.status).toBe("pending");

    // Withdraw it (admin can withdraw any request)
    const patchRes = await page.request.patch(`${ENDPOINT}/${reqId}`, {
      data: { action: "withdraw" },
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json() as { request: { status: string } };
    expect(patchBody.request.status).toBe("withdrawn");
  });

  test("funder can create and admin can approve a drawdown request", async ({ page }) => {
    await signIn(page, "funder");

    const postRes = await page.request.post(ENDPOINT, {
      data: { amount: 250, description: "Funder E2E drawdown" },
    });
    expect(postRes.status()).toBe(201);
    const { request } = await postRes.json() as { request: DrawdownRequest };
    const reqId = request.id;

    // Admin approves it
    await signIn(page, "admin");
    const patchRes = await page.request.patch(`${ENDPOINT}/${reqId}`, {
      data: { action: "approve", reviewNotes: "Approved by E2E test" },
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json() as { request: { status: string } };
    expect(patchBody.request.status).toBe("approved");
  });

  // ── PATCH validation ─────────────────────────────────────────────────────

  test("PATCH with invalid action returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: { action: "cancel" } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/action/i);
  });

  test("PATCH on non-existent request returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-999999999999`,
      { data: { action: "approve" } },
    );
    expect(res.status()).toBe(404);
  });

  test("PATCH approve on already-approved request returns 409", async ({ page }) => {
    await signIn(page, "funder");

    // Create a request
    const postRes = await page.request.post(ENDPOINT, { data: { amount: 100 } });
    expect(postRes.status()).toBe(201);
    const { request } = await postRes.json() as { request: DrawdownRequest };

    // Approve it
    await signIn(page, "admin");
    await page.request.patch(`${ENDPOINT}/${request.id}`, { data: { action: "approve" } });

    // Try to approve again → 409
    const res = await page.request.patch(`${ENDPOINT}/${request.id}`, {
      data: { action: "approve" },
    });
    expect(res.status()).toBe(409);
  });
});
