/**
 * Journey 37 — Project settings @e2e
 *
 * Covers GET /api/projects/[id] and PATCH /api/projects/[id]:
 *
 * Auth guards:
 *  - Unauthenticated PATCH → 401
 *  - Contractor PATCH → 403
 *  - Funder PATCH → 403
 *  - Commercial PATCH → 403
 *  - Developer PATCH → 200
 *  - Admin PATCH → 200
 *
 * GET:
 *  - Any project member → 200
 *  - Returns project: { id, name, address, status, created_at }
 *
 * PATCH validation:
 *  - Empty body → 400
 *  - Empty name → 400
 *  - Invalid status → 400
 *
 * PATCH success:
 *  - Update name → reflected in response
 *  - Update address → reflected in response
 *  - Update status → reflected in response
 *  - Partial update (only name) works
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}`;

test.describe("Journey 37 — Project settings @e2e", () => {
  test.setTimeout(60_000);

  // ── GET ────────────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("admin GET returns project shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: { id: string; name: string; status: string } };
    expect(typeof body.project.id).toBe("string");
    expect(typeof body.project.name).toBe("string");
    expect(typeof body.project.status).toBe("string");
  });

  // ── PATCH auth guards ──────────────────────────────────────────────────────

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(ENDPOINT, { data: { name: "X" } });
    expect(res.status()).toBe(401);
  });

  test("contractor PATCH returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.patch(ENDPOINT, { data: { name: "X" } });
    expect(res.status()).toBe(403);
  });

  test("funder PATCH returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.patch(ENDPOINT, { data: { name: "X" } });
    expect(res.status()).toBe(403);
  });

  test("commercial PATCH returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.patch(ENDPOINT, { data: { name: "X" } });
    expect(res.status()).toBe(403);
  });

  // ── PATCH validation ───────────────────────────────────────────────────────

  test("PATCH with empty body returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ENDPOINT, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("PATCH with empty name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ENDPOINT, { data: { name: "   " } });
    expect(res.status()).toBe(400);
  });

  test("PATCH with invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ENDPOINT, { data: { status: "banana" } });
    expect(res.status()).toBe(400);
  });

  // ── PATCH success ──────────────────────────────────────────────────────────

  test("admin can update project name", async ({ page }) => {
    await signIn(page, "admin");
    const newName = `E2E Test Project ${Date.now()}`;
    const res     = await page.request.patch(ENDPOINT, { data: { name: newName } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: { name: string } };
    expect(body.project.name).toBe(newName);
  });

  test("admin can update project address", async ({ page }) => {
    await signIn(page, "admin");
    const newAddr = `${Date.now()} Test Street, London`;
    const res     = await page.request.patch(ENDPOINT, { data: { address: newAddr } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: { address: string } };
    expect(body.project.address).toBe(newAddr);
  });

  test("admin can update project status to on_hold", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.patch(ENDPOINT, { data: { status: "on_hold" } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: { status: string } };
    expect(body.project.status).toBe("on_hold");

    // Restore to active
    await page.request.patch(ENDPOINT, { data: { status: "active" } });
  });

  test("developer can update project name and address", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.patch(ENDPOINT, {
      data: { name: "Dev Updated Name", address: "Dev Updated Address" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: { name: string; address: string } };
    expect(body.project.name).toBe("Dev Updated Name");
    expect(body.project.address).toBe("Dev Updated Address");
  });

  test("GET reflects updated values", async ({ page }) => {
    await signIn(page, "admin");
    const uniqueName = `Settings Test ${Date.now()}`;
    await page.request.patch(ENDPOINT, { data: { name: uniqueName } });

    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { project: { name: string } };
    expect(body.project.name).toBe(uniqueName);
  });
});
