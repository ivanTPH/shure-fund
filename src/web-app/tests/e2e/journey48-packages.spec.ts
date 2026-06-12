/**
 * Journey 48 — Work packages API @e2e
 *
 * Covers:
 *   GET  /api/stages/[stageId]/packages  — list packages
 *   POST /api/stages/[stageId]/packages  — create package
 *   PATCH /api/stages/[stageId]/packages/[packageId] — update package
 *
 * Auth guards:
 *  - Unauthenticated → 401
 *  - Funder POST → 403 (read-only role)
 *
 * POST validation:
 *  - Missing name → 400
 *  - Missing value → 400
 *  - Zero value → 400
 *
 * POST success:
 *  - Returns 201 with { package: { id, name, value, status } }
 *  - status defaults to "draft"
 *
 * PATCH:
 *  - Empty body → 400
 *  - Invalid status → 400
 *  - Valid status update → 200
 *
 * Seeded data:
 *  - Stage 501 (Aurora Civic Centre) used for GET
 *
 * Note: POST/PATCH tests create their own package to avoid seed collisions.
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const STAGE_ID = "00000000-0000-0000-0000-000000000501"; // seeded stage

let createdPackageId = "";

test.describe("Journey 48 — Work packages @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/stages/${STAGE_ID}/packages`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { name: "Test", value: 1000 },
    });
    expect(res.status()).toBe(401);
  });

  test("funder POST returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { name: "Test", value: 1000 },
    });
    expect(res.status()).toBe(403);
  });

  // ── GET ──────────────────────────────────────────────────────────────────

  test("admin GET returns packages array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${BASE}/api/stages/${STAGE_ID}/packages`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { packages: unknown[] };
    expect(Array.isArray(body.packages)).toBe(true);
  });

  test("developer GET succeeds", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(`${BASE}/api/stages/${STAGE_ID}/packages`);
    expect(res.status()).toBe(200);
  });

  // ── POST validation ──────────────────────────────────────────────────────

  test("POST without name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { value: 5000 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/name/i);
  });

  test("POST without value returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { name: "Groundworks" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/value/i);
  });

  test("POST with zero value returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { name: "Groundworks", value: 0 },
    });
    expect(res.status()).toBe(400);
  });

  // ── POST success ─────────────────────────────────────────────────────────

  test("POST creates package and returns 201", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(`${BASE}/api/stages/${STAGE_ID}/packages`, {
      data: { name: "E2E Test Package", value: 12500 },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { package: { id: string; name: string; value: number; status: string } };
    expect(body.package.id).toBeTruthy();
    expect(body.package.name).toBe("E2E Test Package");
    expect(body.package.value).toBe(12500);
    expect(body.package.status).toBe("draft");
    createdPackageId = body.package.id;
  });

  test("created package appears in GET list", async ({ page }) => {
    if (!createdPackageId) test.skip();
    await signIn(page, "admin");
    const res  = await page.request.get(`${BASE}/api/stages/${STAGE_ID}/packages`);
    const body = await res.json() as { packages: Array<{ id: string }> };
    expect(body.packages.some((p) => p.id === createdPackageId)).toBe(true);
  });

  // ── PATCH ────────────────────────────────────────────────────────────────

  test("PATCH with empty body returns 400", async ({ page }) => {
    if (!createdPackageId) test.skip();
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/stages/${STAGE_ID}/packages/${createdPackageId}`,
      { data: {} },
    );
    expect(res.status()).toBe(400);
  });

  test("PATCH with invalid status returns 400", async ({ page }) => {
    if (!createdPackageId) test.skip();
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/stages/${STAGE_ID}/packages/${createdPackageId}`,
      { data: { status: "not_a_valid_status" } },
    );
    expect(res.status()).toBe(400);
  });

  test("PATCH updates status to active", async ({ page }) => {
    if (!createdPackageId) test.skip();
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/stages/${STAGE_ID}/packages/${createdPackageId}`,
      { data: { status: "active" } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { package: { id: string; status: string } };
    expect(body.package.status).toBe("active");
  });

  test("PATCH on non-existent package returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${BASE}/api/stages/${STAGE_ID}/packages/00000000-0000-0000-0000-000000000000`,
      { data: { status: "active" } },
    );
    expect(res.status()).toBe(404);
  });
});
