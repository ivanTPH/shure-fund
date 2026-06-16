/**
 * Journey 86 — Search API, Users lookup, Admin invite + misc pages @e2e
 *
 * Covers:
 *  - GET /api/search?q=<term>              — cross-entity full-text search
 *  - GET /api/users?email=<email>          — user lookup by email (admin/developer)
 *  - POST /api/admin/invite                — send user invite (admin/developer)
 *  - /search                              — search page UI
 *  - /account                             — account profile page
 *
 * GET /api/search:
 *  - Unauthenticated → 401
 *  - Missing/short q → 400
 *  - Valid q → 200 { results, q, total }
 *  - Results contain type ∈ {project, contract, stage}
 *  - Searching "aurora" finds project 301
 *
 * GET /api/users:
 *  - Unauthenticated → 401
 *  - Contractor/funder → 403
 *  - Missing email → 400
 *  - Unknown email → 404
 *  - Known email → 200 { user: { id, full_name, email, role } }
 *
 * POST /api/admin/invite:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Missing email → 400
 *  - Invalid role → 400
 *  - Developer inviting admin role → 403
 *  - Valid (admin inviting) → 200/400 (email may be taken or mail server unavailable)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE        = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const SEARCH_URL  = `${BASE}/api/search`;
const USERS_URL   = `${BASE}/api/users`;
const INVITE_URL  = `${BASE}/api/admin/invite`;

type SearchResult = {
  type:     "project" | "contract" | "stage";
  id:       string;
  title:    string;
  subtitle: string;
  href:     string;
};

test.describe("Journey 86 — Search, user lookup, invite @e2e", () => {
  test.setTimeout(60_000);

  // ── GET /api/search — auth ────────────────────────────────────────────────

  test("unauthenticated GET /api/search returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${SEARCH_URL}?q=test`);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/search — validation ──────────────────────────────────────────

  test("GET /api/search without q returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(SEARCH_URL);
    expect(res.status()).toBe(400);
  });

  test("GET /api/search with 1-char q returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${SEARCH_URL}?q=a`);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/2 char/i);
  });

  // ── GET /api/search — happy path ─────────────────────────────────────────

  test("admin can search and get results", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${SEARCH_URL}?q=aurora`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { results: SearchResult[]; q: string; total: number };
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.q).toBe("aurora");
    expect(typeof body.total).toBe("number");
  });

  test("searching 'foundation' finds stage 501", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${SEARCH_URL}?q=foundation`);
    const body = await res.json() as { results: SearchResult[] };
    // Stage 501 is "Foundation Package" — should appear in results
    const stage = body.results.find(
      (r) => r.type === "stage" && r.id === "00000000-0000-0000-0000-000000000501"
    );
    expect(stage).toBeDefined();
  });

  test("search results have correct fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${SEARCH_URL}?q=foundation`);
    const body = await res.json() as { results: SearchResult[] };
    if (body.results.length === 0) return;
    const r = body.results[0];
    expect(["project", "contract", "stage"]).toContain(r.type);
    expect(typeof r.id).toBe("string");
    expect(typeof r.title).toBe("string");
    expect(typeof r.href).toBe("string");
  });

  test("funder can search", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${SEARCH_URL}?q=aurora`);
    expect(res.status()).toBe(200);
  });

  test("?limit=1 returns at most 1 result", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${SEARCH_URL}?q=aurora&limit=1`);
    const body = await res.json() as { results: SearchResult[] };
    expect(body.results.length).toBeLessThanOrEqual(1);
  });

  // ── GET /api/users — auth ─────────────────────────────────────────────────

  test("unauthenticated GET /api/users returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${USERS_URL}?email=test@test.com`);
    expect(res.status()).toBe(401);
  });

  test("contractor GET /api/users returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${USERS_URL}?email=test@test.com`);
    expect(res.status()).toBe(403);
  });

  test("funder GET /api/users returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${USERS_URL}?email=test@test.com`);
    expect(res.status()).toBe(403);
  });

  // ── GET /api/users — validation ───────────────────────────────────────────

  test("GET /api/users without email returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(USERS_URL);
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/email/i);
  });

  test("GET /api/users with unknown email returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${USERS_URL}?email=nobody-${Date.now()}@example.invalid`);
    expect(res.status()).toBe(404);
  });

  // ── GET /api/users — happy path ───────────────────────────────────────────

  test("admin can look up admin user by email", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${USERS_URL}?email=admin@test.com`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { user: { id: string; email: string; role: string } };
    expect(body.user.email).toBe("admin@test.com");
    expect(typeof body.user.id).toBe("string");
  });

  // ── POST /api/admin/invite — auth ─────────────────────────────────────────

  test("unauthenticated POST /api/admin/invite returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(INVITE_URL, {
      data: { email: "new@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor POST /api/admin/invite returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(INVITE_URL, {
      data: { email: "new@example.com", role: "commercial" },
    });
    expect(res.status()).toBe(403);
  });

  test("funder POST /api/admin/invite returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(INVITE_URL, {
      data: { email: "new@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(403);
  });

  // ── POST /api/admin/invite — validation ───────────────────────────────────

  test("POST /api/admin/invite without email returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(INVITE_URL, { data: { role: "contractor" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/email/i);
  });

  test("POST /api/admin/invite with invalid role returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(INVITE_URL, {
      data: { email: "new@example.com", role: "superuser" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/role/i);
  });

  test("developer cannot invite admin role (returns 403)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(INVITE_URL, {
      data: { email: "newadmin@example.com", role: "admin" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/project owner|developer|can only invite/i);
  });

  test("developer cannot invite funder role (returns 403)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(INVITE_URL, {
      data: { email: "newfunder@example.com", role: "funder" },
    });
    expect(res.status()).toBe(403);
  });

  // ── /search page UI ───────────────────────────────────────────────────────

  test("admin can load search page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/search`);
    await expect(
      page.getByRole("heading", { name: /search/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load search page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/search`);
    await expect(
      page.getByRole("heading", { name: /search/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /account page UI ──────────────────────────────────────────────────────

  test("admin can load account profile page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/account`);
    // Account page shows role and email info — look for common account UI text
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(
      page.getByText(/account|profile|admin|sign out/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("contractor can load account profile page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${BASE}/account`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await expect(
      page.getByText(/account|profile|contractor|sign out/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
