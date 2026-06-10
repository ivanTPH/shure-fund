/**
 * Journey 30 — Token holder registry @e2e
 *
 * Covers GET /api/projects/[id]/token-holders and POST + DELETE:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Contractor GET → 403
 *  - Commercial GET → 403
 *
 * Read access:
 *  - Funder GET → 200
 *  - Admin GET → 200 with correct shape (holders[], totalSharePct)
 *
 * POST validation:
 *  - Missing userId → 400
 *  - Missing sharePct → 400
 *  - sharePct = 0 → 400
 *  - sharePct > 100 → 400
 *  - Non-existent user → 404
 *  - Funder POST → 403
 *
 * POST success:
 *  - Admin adds holder → 201, holder in response
 *  - Duplicate add → 409
 *  - Adding over 100% total → 422
 *
 * DELETE:
 *  - Funder DELETE → 403
 *  - Admin DELETE non-existent → 404
 *  - Admin DELETE success → 200, ok: true
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

const ENDPOINT     = `${BASE}/api/projects/${PROJECT_ID}/token-holders`;
const FAKE_USER_ID = "00000000-0000-0000-0000-000000000999";

// Shared across tests in this describe block (workers: 1, sequential)
let createdHolderId = "";
let testUserId      = "";

test.describe("Journey 30 — Token holder registry @e2e", () => {
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

  // ── Read access ────────────────────────────────────────────────────────────

  test("funder can GET token holders (200)", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { holders: unknown[]; totalSharePct: number };
    expect(Array.isArray(body.holders)).toBe(true);
    expect(typeof body.totalSharePct).toBe("number");
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("POST without userId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { sharePct: 10 } });
    expect(res.status()).toBe(400);
  });

  test("POST without sharePct returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { userId: FAKE_USER_ID } });
    expect(res.status()).toBe(400);
  });

  test("POST with sharePct = 0 returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { userId: FAKE_USER_ID, sharePct: 0 } });
    expect(res.status()).toBe(400);
  });

  test("POST with sharePct > 100 returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { userId: FAKE_USER_ID, sharePct: 101 } });
    expect(res.status()).toBe(400);
  });

  test("POST with non-existent userId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { userId: FAKE_USER_ID, sharePct: 5 } });
    expect(res.status()).toBe(404);
  });

  test("funder POST returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(ENDPOINT, { data: { userId: FAKE_USER_ID, sharePct: 10 } });
    expect(res.status()).toBe(403);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("admin can add a token holder (201)", async ({ page }) => {
    await signIn(page, "admin");

    // Find a project member not already a holder
    const [holdersRes, membersRes] = await Promise.all([
      page.request.get(ENDPOINT),
      page.request.get(`${BASE}/api/projects/${PROJECT_ID}/members`),
    ]);
    const holdersData = await holdersRes.json() as { holders: Array<{ user: { id: string } }> };
    const membersData = await membersRes.json() as { members: Array<{ member: { id: string } | null }> };

    const holderUserIds = new Set(holdersData.holders.map((h) => h.user?.id).filter(Boolean));
    const available = membersData.members.find((m) => m.member && !holderUserIds.has(m.member.id));

    if (!available?.member) {
      // All members are already holders — skip gracefully
      test.skip();
      return;
    }
    testUserId = available.member.id;

    const res = await page.request.post(ENDPOINT, {
      data: { userId: testUserId, sharePct: 5, label: "E2E test holder" },
    });
    expect(res.status()).toBe(201);

    const body = await res.json() as { holder: { id: string; share_pct: number; label: string | null } };
    expect(body.holder).toBeDefined();
    expect(body.holder.share_pct).toBe(5);
    expect(body.holder.label).toBe("E2E test holder");
    createdHolderId = body.holder.id;
  });

  test("duplicate add returns 409", async ({ page }) => {
    if (!testUserId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { userId: testUserId, sharePct: 5 } });
    expect(res.status()).toBe(409);
  });

  test("adding over 100% total returns 422", async ({ page }) => {
    await signIn(page, "admin");
    // Find a different member or use a freshly-registered UUID that doesn't exist — 404 fires first.
    // Easier: push the total over 100 by requesting sharePct=200 with a valid-looking user.
    // The 422 check fires after the user-exists check, so we need a real userId but huge sharePct.
    // Use testUserId (already a holder → 409) OR pick a fresh member.
    // The cleanest path: try to add 99 + existing. Use 100 directly.
    const [holdersRes, membersRes] = await Promise.all([
      page.request.get(ENDPOINT),
      page.request.get(`${BASE}/api/projects/${PROJECT_ID}/members`),
    ]);
    const holdersData = await holdersRes.json() as { holders: Array<{ user: { id: string } }>; totalSharePct: number };
    const membersData = await membersRes.json() as { members: Array<{ member: { id: string } | null }> };

    const holderUserIds = new Set(holdersData.holders.map((h) => h.user?.id).filter(Boolean));
    const candidate = membersData.members.find((m) => m.member && !holderUserIds.has(m.member.id));

    if (!candidate?.member) { test.skip(); return; }

    // Request more than remaining capacity to trigger 422
    const remaining = 100 - holdersData.totalSharePct;
    const res = await page.request.post(ENDPOINT, {
      data: { userId: candidate.member.id, sharePct: remaining + 1 },
    });
    expect(res.status()).toBe(422);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  test("funder DELETE returns 403", async ({ page }) => {
    if (!createdHolderId) { test.skip(); return; }
    await signIn(page, "funder");
    const res = await page.request.delete(`${ENDPOINT}/${createdHolderId}`);
    expect(res.status()).toBe(403);
  });

  test("admin DELETE non-existent holderId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(`${ENDPOINT}/00000000-0000-0000-0000-000000000001`);
    expect(res.status()).toBe(404);
  });

  test("admin DELETE success returns ok: true", async ({ page }) => {
    if (!createdHolderId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.delete(`${ENDPOINT}/${createdHolderId}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify gone
    const listRes  = await page.request.get(ENDPOINT);
    const listData = await listRes.json() as { holders: Array<{ id: string }> };
    expect(listData.holders.some((h) => h.id === createdHolderId)).toBe(false);
  });
});
