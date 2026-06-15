/**
 * Journey 61 — Admin invite @e2e
 *
 * Covers POST /api/admin/invite — sends a Supabase email invitation.
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *
 * Role guards:
 *  - Funder → 403
 *  - Contractor → 403
 *  - Commercial → 403
 *  - Admin → passes role check
 *  - Developer → passes role check (with restrictions)
 *
 * Request validation:
 *  - Missing email → 400
 *  - Empty email → 400
 *  - Invalid role → 400
 *
 * Developer role restrictions:
 *  - Developer can invite: contractor, commercial, consultant
 *  - Developer cannot invite: funder → 403
 *  - Developer cannot invite: developer → 403
 *  - Developer cannot invite: admin → 403
 *
 * Admin privileges:
 *  - Admin may invite any valid role
 *  - Validation still applied (missing email → 400)
 *
 * Note: Actual Supabase invite calls are not exercised in E2E to avoid
 * creating real user accounts. We test all the guard and validation paths
 * that return before the invite is sent. If RESEND_API_KEY is not set,
 * the actual invite may fail with a Supabase error (not our app's error).
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/admin/invite`;

test.describe("Journey 61 — Admin invite API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(401);
  });

  // ── Role guards ──────────────────────────────────────────────────────────

  test("funder POST returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(403);
  });

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(403);
  });

  test("commercial POST returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(403);
  });

  // ── Request validation ───────────────────────────────────────────────────

  test("admin POST with missing email returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { role: "contractor" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/email/i);
  });

  test("admin POST with empty email returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { email: "", role: "contractor" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/email/i);
  });

  test("admin POST with invalid role returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "invalid_role" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/role/i);
  });

  test("developer POST with invalid role returns 400", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "invalid_role" },
    });
    expect(res.status()).toBe(400);
  });

  // ── Developer role restrictions ──────────────────────────────────────────

  test("developer cannot invite funder → 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "funder" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/project owner|can only invite/i);
  });

  test("developer cannot invite developer → 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "developer" },
    });
    expect(res.status()).toBe(403);
  });

  test("developer cannot invite admin → 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "test@example.com", role: "admin" },
    });
    expect(res.status()).toBe(403);
  });

  // ── Developer allowed invitations (validation passes, Supabase may reject) ──

  test("developer inviting contractor reaches invite step (not 400 or role-403)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newcontractor-e2e@example.com", role: "contractor" },
    });
    // 200 (invite sent) or 400 (Supabase error e.g. already invited) — not a role/validation 403
    expect(res.status()).not.toBe(403);
  });

  test("developer inviting commercial reaches invite step", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newcomm-e2e@example.com", role: "commercial" },
    });
    expect(res.status()).not.toBe(403);
  });

  test("developer inviting consultant reaches invite step", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newconsultant-e2e@example.com", role: "consultant" },
    });
    expect(res.status()).not.toBe(403);
  });

  // ── Admin allowed invitations ────────────────────────────────────────────

  test("admin inviting funder reaches invite step (not role-403)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newfunder-e2e@example.com", role: "funder" },
    });
    expect(res.status()).not.toBe(403);
  });

  test("admin inviting admin reaches invite step", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newadmin-e2e@example.com", role: "admin" },
    });
    expect(res.status()).not.toBe(403);
  });

  // ── Valid roles are not rejected with 400 ───────────────────────────────

  test("admin inviting consultant passes validation", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { email: "newconsultant2-e2e@example.com", role: "consultant" },
    });
    expect(res.status()).not.toBe(400);
  });
});
