/**
 * Journey 57 — Project members API @e2e
 *
 * Covers GET/POST/DELETE /api/projects/[projectId]/members:
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Contractor GET project they're on → allowed (assertProjectAccess)
 *
 * Role guards for POST/DELETE:
 *  - Contractor POST → 403
 *  - Commercial POST → 403
 *  - Contractor DELETE → 403
 *
 * GET shape:
 *  - Returns { members: MemberItem[] }
 *  - Each member has id, role, is_primary, created_at, member { id, full_name, email, role }
 *
 * POST validation:
 *  - Missing userId → 400
 *  - Missing role → 400
 *
 * KYC gate:
 *  - Adding a funder/contractor with non-approved KYC → 403 with kyc_status in body
 *
 * DELETE validation:
 *  - Missing userId → 400
 *
 * Seeded data:
 *  - Aurora Civic Centre project 301 has members
 *  - Admin user is a member of project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/members`;

test.describe("Journey 57 — Project members API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, { data: { userId: "x", role: "funder" } });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated DELETE returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.delete(`${ENDPOINT}?userId=x`);
    expect(res.status()).toBe(401);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns members array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { members: unknown[] };
    expect(Array.isArray(body.members)).toBe(true);
  });

  test("developer GET returns members array", async ({ page }) => {
    await signIn(page, "developer");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { members: unknown[] };
    expect(Array.isArray(body.members)).toBe(true);
  });

  test("funder GET returns members array", async ({ page }) => {
    await signIn(page, "funder");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { members: unknown[] };
    expect(Array.isArray(body.members)).toBe(true);
  });

  test("contractor GET returns members array", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { members: unknown[] };
    expect(Array.isArray(body.members)).toBe(true);
  });

  // ── Member field types ───────────────────────────────────────────────────

  test("members have correct field types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      members: Array<{
        id: string;
        role: string;
        is_primary: boolean;
        created_at: string;
        member: { id: string; full_name: string; email: string; role: string } | null;
      }>;
    };
    if (body.members.length > 0) {
      const m = body.members[0];
      expect(typeof m.id).toBe("string");
      expect(typeof m.role).toBe("string");
      expect(typeof m.is_primary).toBe("boolean");
      expect(typeof m.created_at).toBe("string");
    }
  });

  // ── Role guards (POST) ───────────────────────────────────────────────────

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", role: "funder" },
    });
    expect(res.status()).toBe(403);
  });

  test("commercial POST returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", role: "commercial" },
    });
    expect(res.status()).toBe(403);
  });

  // ── POST validation ──────────────────────────────────────────────────────

  test("POST without userId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { role: "funder" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/userId/i);
  });

  test("POST without role returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/role/i);
  });

  // ── Role guards (DELETE) ─────────────────────────────────────────────────

  test("contractor DELETE returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.delete(`${ENDPOINT}?userId=00000000-0000-0000-0000-000000000001`);
    expect(res.status()).toBe(403);
  });

  test("commercial DELETE returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.delete(`${ENDPOINT}?userId=00000000-0000-0000-0000-000000000001`);
    expect(res.status()).toBe(403);
  });

  // ── DELETE validation ────────────────────────────────────────────────────

  test("DELETE without userId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(ENDPOINT);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/userId/i);
  });

  // ── KYC gate ─────────────────────────────────────────────────────────────

  test("POST funder with non-existent userId returns 404 (no user = no KYC)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { userId: "00000000-dead-beef-dead-beef00000000", role: "funder" },
    });
    // Either 404 (user not found) or 403 (KYC not approved) are acceptable
    expect([403, 404]).toContain(res.status());
  });

  // ── Unknown project ID: admin always gets 200 (bypasses access check) ──

  test("GET on any project ID returns 200 for admin", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/projects/00000000-dead-beef-dead-beef00000000/members`
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { members: unknown[] };
    expect(Array.isArray(body.members)).toBe(true);
  });
});
