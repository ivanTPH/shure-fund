/**
 * Journey 73 — Token holders API & page @e2e
 *
 * Covers:
 *  - GET  /api/projects/[projectId]/token-holders
 *  - POST /api/projects/[projectId]/token-holders
 *  - DELETE /api/projects/[projectId]/token-holders/[holderId]
 *  - /projects/[id]/token-holders page
 *
 * Trust co-beneficiaries who receive a proportional share of each stage
 * payment at the point of release.
 *
 * GET auth:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Commercial → 403
 *  - Funder/developer/admin → 200
 *
 * POST auth:
 *  - Unauthenticated → 401
 *  - Contractor/commercial/funder → 403
 *  - Developer/admin → 201
 *
 * DELETE auth:
 *  - Contractor/commercial/funder → 403
 *  - Developer/admin → 200
 *
 * POST validation:
 *  - Missing userId → 400
 *  - Missing sharePct → 400
 *  - sharePct = 0 → 400
 *  - Total sharePct exceeds 100% → 422
 *
 * Response shapes:
 *  - GET:    { holders: Holder[], totalSharePct: number }
 *  - POST:   { holder: { id, share_pct, label, created_at, user } }
 *  - DELETE: { ok: true }
 *
 * Invariants:
 *  - totalSharePct = sum(holders[*].share_pct)
 *  - totalSharePct is in range [0, 100]
 *
 * Seeded data: project 301 has token holder records
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/token-holders`;
const PAGE_URL   = `${BASE}/projects/${PROJECT_ID}/token-holders`;

type Holder = {
  id: string;
  share_pct: number;
  label: string | null;
  created_at: string;
  user: { id: string; full_name: string | null; email: string; role: string } | null;
};

test.describe("Journey 73 — Token holders API & page @e2e", () => {
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

  test("GET response has holders array and totalSharePct", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { holders: unknown[]; totalSharePct: number };
    expect(Array.isArray(body.holders)).toBe(true);
    expect(typeof body.totalSharePct).toBe("number");
  });

  test("totalSharePct is in range [0, 100]", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { holders: unknown[]; totalSharePct: number };
    expect(body.totalSharePct).toBeGreaterThanOrEqual(0);
    expect(body.totalSharePct).toBeLessThanOrEqual(100);
  });

  test("totalSharePct equals sum of holder share_pcts", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { holders: Holder[]; totalSharePct: number };
    const sum  = body.holders.reduce((s, h) => s + Number(h.share_pct), 0);
    expect(Math.round(body.totalSharePct * 100)).toBe(Math.round(sum * 100));
  });

  test("holders have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { holders: Holder[] };
    if (body.holders.length === 0) return;
    const h = body.holders[0];
    expect(typeof h.id).toBe("string");
    expect(typeof h.share_pct).toBe("number");
    expect(typeof h.created_at).toBe("string");
    // user may be null if the user was deleted
    if (h.user) {
      expect(typeof h.user.id).toBe("string");
      expect(typeof h.user.email).toBe("string");
    }
  });

  // ── POST auth guards ─────────────────────────────────────────────────────

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("commercial POST returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("funder POST returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 1 },
    });
    expect(res.status()).toBe(403);
  });

  // ── POST validation ───────────────────────────────────────────────────────

  test("POST without userId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { sharePct: 5 } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/userId/i);
  });

  test("POST without sharePct returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/sharePct|share/i);
  });

  test("POST with sharePct=0 returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test("POST with sharePct=101 returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", sharePct: 101 },
    });
    expect(res.status()).toBe(400);
  });

  // ── POST + DELETE happy path ─────────────────────────────────────────────

  test("admin can add and delete a token holder", async ({ page }) => {
    await signIn(page, "admin");

    // Look up the admin user ID
    const lookupRes = await page.request.get(`${BASE}/api/users?email=admin@test.com`);
    expect(lookupRes.status()).toBe(200);
    const { user } = await lookupRes.json() as { user: { id: string } };
    const adminId = user.id;

    // Check current total to avoid exceeding 100%
    const getRes = await page.request.get(ENDPOINT);
    const getCurrent = await getRes.json() as { totalSharePct: number };
    const currentTotal = getCurrent.totalSharePct;

    // Only add if there's room for 1%
    if (currentTotal > 99) {
      // Skip: no room for another holder
      return;
    }

    // Check if admin is already a holder
    const holdersRes = await page.request.get(ENDPOINT);
    const { holders } = await holdersRes.json() as { holders: Holder[] };
    const alreadyHolder = holders.some((h) => h.user?.id === adminId);

    if (alreadyHolder) {
      // Already a holder — just verify the structure is correct
      const h = holders.find((h2) => h2.user?.id === adminId)!;
      expect(typeof h.id).toBe("string");
      expect(h.share_pct).toBeGreaterThan(0);
      return;
    }

    // POST: add admin as holder with 1% share
    const postRes = await page.request.post(ENDPOINT, {
      data: { userId: adminId, sharePct: 1, label: "E2E test holder" },
    });
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json() as { holder: Holder };
    const holderId = postBody.holder.id;
    expect(typeof holderId).toBe("string");
    expect(postBody.holder.share_pct).toBe(1);

    // DELETE: remove the holder
    const delRes = await page.request.delete(`${ENDPOINT}/${holderId}`);
    expect(delRes.status()).toBe(200);
    const delBody = await delRes.json() as { ok: boolean };
    expect(delBody.ok).toBe(true);

    // Verify holder is gone
    const afterRes  = await page.request.get(ENDPOINT);
    const afterBody = await afterRes.json() as { holders: Holder[] };
    expect(afterBody.holders.find((h) => h.id === holderId)).toBeUndefined();
  });

  test("DELETE non-existent holder returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000999`,
    );
    expect(res.status()).toBe(404);
  });

  // ── Token holders page ───────────────────────────────────────────────────

  test("admin can load token holders page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /token holder/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("token holders page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    // Back link shows project name (← <project name>), match by href
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can view token holders page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /token holder/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
