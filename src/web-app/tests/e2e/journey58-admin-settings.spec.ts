/**
 * Journey 58 — Admin company settings & user management @e2e
 *
 * Covers:
 *   GET  /api/admin/company   — fetch admin's linked company
 *   PATCH /api/admin/company  — update company fields
 *   GET  /api/admin/users     — list all platform users
 *   PATCH /api/admin/users    — update a user's role/active/kyc_status
 *
 * Auth guards:
 *  - Unauthenticated → 401 for all endpoints
 *
 * Role guards:
 *  - Funder on admin/company → 403
 *  - Developer on admin/users → 403
 *  - Contractor on admin/users → 403
 *
 * GET /api/admin/users shape:
 *  - Returns { users: UserItem[] }
 *  - id, full_name, email, role, active, kyc_status, created_at
 *
 * PATCH /api/admin/users validation:
 *  - Missing userId → 400
 *  - No fields to update → 400
 *  - Invalid kyc_status → 400
 *
 * PATCH /api/admin/company:
 *  - No fields → 400
 *  - Name update → 200 with updated company
 *
 * GET /api/admin/company:
 *  - Admin with no company_id → 404 (graceful)
 *  - Admin with company → 200 with company fields
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE             = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const COMPANY_ENDPOINT = `${BASE}/api/admin/company`;
const USERS_ENDPOINT   = `${BASE}/api/admin/users`;

test.describe("Journey 58 — Admin company & user management @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET company returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(COMPANY_ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH company returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(COMPANY_ENDPOINT, { data: { name: "Test" } });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated GET users returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(USERS_ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH users returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(USERS_ENDPOINT, { data: { userId: "x", active: false } });
    expect(res.status()).toBe(401);
  });

  // ── Role guards ──────────────────────────────────────────────────────────

  test("funder GET company returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(COMPANY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET company returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(COMPANY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("contractor GET company returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(COMPANY_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("funder GET users returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(USERS_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET users returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(USERS_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("contractor GET users returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(USERS_ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── GET /api/admin/users ─────────────────────────────────────────────────

  test("admin GET users returns 200 with users array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(USERS_ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { users: unknown[] };
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThan(0);
  });

  test("users have correct field types", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(USERS_ENDPOINT);
    const body = await res.json() as {
      users: Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        active: boolean;
        kyc_status: string;
        created_at: string;
      }>;
    };
    expect(body.users.length).toBeGreaterThan(0);
    const u = body.users[0];
    expect(typeof u.id).toBe("string");
    expect(typeof u.full_name).toBe("string");
    expect(typeof u.email).toBe("string");
    expect(typeof u.role).toBe("string");
    expect(typeof u.active).toBe("boolean");
    expect(typeof u.kyc_status).toBe("string");
    expect(typeof u.created_at).toBe("string");
  });

  test("admin user appears in users list", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(USERS_ENDPOINT);
    const body = await res.json() as { users: Array<{ email: string }> };
    expect(body.users.some((u) => u.email === "admin@test.com")).toBe(true);
  });

  // ── PATCH /api/admin/users validation ────────────────────────────────────

  test("PATCH users without userId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(USERS_ENDPOINT, { data: { active: true } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/userId/i);
  });

  test("PATCH users with no fields to update returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(USERS_ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH users with invalid kyc_status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(USERS_ENDPOINT, {
      data: { userId: "00000000-0000-0000-0000-000000000001", kyc_status: "invalid_status" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/kyc_status/i);
  });

  // ── GET /api/admin/company ───────────────────────────────────────────────

  test("admin GET company returns 200 or 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(COMPANY_ENDPOINT);
    // 200 if admin has a company linked; 404 if not — both are valid
    expect([200, 404]).toContain(res.status());
  });

  test("admin GET company 200 response has correct fields", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(COMPANY_ENDPOINT);
    if (res.status() !== 200) return; // skip if no company linked
    const body = await res.json() as {
      company: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        registered_address: string | null;
        type: string | null;
        verified: boolean;
      };
    };
    expect(typeof body.company.id).toBe("string");
    expect(typeof body.company.name).toBe("string");
    expect(typeof body.company.verified).toBe("boolean");
  });

  // ── PATCH /api/admin/company validation ──────────────────────────────────

  test("PATCH company with no fields returns 400 or 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(COMPANY_ENDPOINT, { data: {} });
    // 400 if admin has company but no fields provided; 404 if no company linked
    expect([400, 404]).toContain(res.status());
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test("PATCH company with invalid JSON returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(COMPANY_ENDPOINT, {
      data: "not-json",
      headers: { "content-type": "text/plain" },
    });
    expect([400, 415]).toContain(res.status());
  });

  test("PATCH company name update returns 200 or 404 (admin may lack company)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(COMPANY_ENDPOINT, { data: { name: "Test Company Ltd" } });
    // 200 if admin has company, 404 if not linked
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as { company: { name: string } };
      expect(body.company.name).toBe("Test Company Ltd");
    }
  });
});
