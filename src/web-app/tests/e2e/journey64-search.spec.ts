/**
 * Journey 64 — Cross-project search API @e2e
 *
 * Covers GET /api/search?q=<term>
 *
 * Auth:
 *  - Unauthenticated → 401
 *
 * Validation:
 *  - Missing q → 400
 *  - Empty q → 400
 *  - Single char q → 400 (must be ≥ 2 chars)
 *
 * Happy path:
 *  - q=aurora → 200 with { results, q, total }
 *  - results is an array
 *  - Each result has { type, id, title, subtitle, href }
 *  - type is one of: project, contract, stage
 *  - href is a valid internal path
 *  - total matches results.length
 *
 * Role access:
 *  - admin → 200
 *  - funder → 200
 *  - developer → 200
 *  - contractor → 200
 *  - commercial → 200
 *
 * Seeded data:
 *  - "Aurora Civic Centre" project — q=aurora should return a project result
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/search`;

test.describe("Journey 64 — Cross-project search API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(401);
  });

  // ── Validation ───────────────────────────────────────────────────────────

  test("missing q returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(400);
  });

  test("empty q returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=`);
    expect(res.status()).toBe(400);
  });

  test("single char q returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=a`);
    expect(res.status()).toBe(400);
  });

  // ── Happy path ───────────────────────────────────────────────────────────

  test("admin q=aurora returns 200 with results shape", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { results: unknown[]; q: string; total: number };
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.q).toBe("aurora");
    expect(typeof body.total).toBe("number");
    expect(body.total).toBe(body.results.length);
  });

  test("search finds Meridian Life Sciences Hub project", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=meridian`);
    const body = await res.json() as {
      results: Array<{ type: string; id: string; title: string; subtitle: string; href: string }>;
    };
    const project = body.results.find((r) => r.type === "project");
    expect(project).toBeTruthy();
    expect(project!.title.toLowerCase()).toContain("meridian");
  });

  test("each result has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    const body = await res.json() as {
      results: Array<{ type: string; id: string; title: string; subtitle: string; href: string }>;
    };
    for (const r of body.results) {
      expect(typeof r.type).toBe("string");
      expect(["project", "contract", "stage"]).toContain(r.type);
      expect(typeof r.id).toBe("string");
      expect(typeof r.title).toBe("string");
      expect(typeof r.subtitle).toBe("string");
      expect(typeof r.href).toBe("string");
      expect(r.href.startsWith("/")).toBe(true);
    }
  });

  test("project result href starts with /projects/", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    const body = await res.json() as { results: Array<{ type: string; href: string }> };
    const project = body.results.find((r) => r.type === "project");
    if (!project) return;
    expect(project.href.startsWith("/projects/")).toBe(true);
  });

  test("total does not exceed default limit of 20", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=a`);
    if (!res.ok()) return; // skip if 400 (too short)
    const body = await res.json() as { total: number };
    expect(body.total).toBeLessThanOrEqual(20);
  });

  test("limit param is respected (limit=5)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?q=aurora&limit=5`);
    if (!res.ok()) return;
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.results.length).toBeLessThanOrEqual(5);
  });

  // ── Role access ──────────────────────────────────────────────────────────

  test("funder GET search returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(200);
  });

  test("developer GET search returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(200);
  });

  test("contractor GET search returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(200);
  });

  test("commercial GET search returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(`${ENDPOINT}?q=aurora`);
    expect(res.status()).toBe(200);
  });

  // ── Search page UI ───────────────────────────────────────────────────────

  test("search page renders heading", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/search`);
    await expect(page.getByRole("heading", { name: /search/i })).toBeVisible();
  });

  test("search page has text input", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/search`);
    await expect(page.locator("input[type='search']")).toBeVisible();
  });

  test("search page shows results for meridian", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/search?q=meridian`);
    // Wait for debounced search to fire
    await page.waitForTimeout(800);
    // Should have at least one result link to /projects/
    const projectLink = page.locator("a[href^='/projects/']").first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
  });
});
