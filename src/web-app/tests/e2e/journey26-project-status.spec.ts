/**
 * Journey 26 — Project status management & CSV exports @e2e
 *
 * Tests PATCH /api/projects/[id] and CSV export endpoints.
 *
 * Covers:
 *  - Unauthenticated PATCH returns 401
 *  - Contractor/funder/commercial cannot PATCH (403)
 *  - Invalid status returns 400
 *  - Admin can set status to on_hold, completed, cancelled, active
 *  - Developer can update project status
 *  - GET /api/projects/[id]/audit?format=csv returns text/csv
 *  - GET /api/projects/[id]/wallet/transactions?format=csv returns text/csv
 *  - CSV has correct headers
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

async function patchStatus(
  page: Parameters<typeof signIn>[0],
  status: string,
  projectId = PROJECT_ID,
) {
  const res = await page.request.patch(`${BASE}/api/projects/${projectId}`, {
    headers: { "Content-Type": "application/json" },
    data: { status },
  });
  return { status: res.status(), body: await res.json() };
}

test.describe("Journey 26 — Project status management & CSV exports @e2e", () => {
  test.setTimeout(60_000);

  // ── PATCH auth + role guards ───────────────────────────────────────────────

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(`${BASE}/api/projects/${PROJECT_ID}`, {
      headers: { "Content-Type": "application/json" },
      data: { status: "on_hold" },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor cannot PATCH project status (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await patchStatus(page, "on_hold");
    expect(status).toBe(403);
  });

  test("funder cannot PATCH project status (403)", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await patchStatus(page, "completed");
    expect(status).toBe(403);
  });

  test("commercial cannot PATCH project status (403)", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await patchStatus(page, "on_hold");
    expect(status).toBe(403);
  });

  // ── PATCH validation ───────────────────────────────────────────────────────

  test("invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await patchStatus(page, "archived");
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/active|on_hold|completed|cancelled/i);
  });

  test("missing status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(`${BASE}/api/projects/${PROJECT_ID}`, {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  // ── PATCH success ──────────────────────────────────────────────────────────

  test("admin can set project to on_hold", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await patchStatus(page, "on_hold");
    expect(status).toBe(200);
    expect((body as { project: { status: string } }).project.status).toBe("on_hold");
  });

  test("admin can set project to completed", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await patchStatus(page, "completed");
    expect(status).toBe(200);
    expect((body as { project: { status: string } }).project.status).toBe("completed");
  });

  test("admin can restore project to active", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await patchStatus(page, "active");
    expect(status).toBe(200);
    expect((body as { project: { status: string } }).project.status).toBe("active");
  });

  test("developer can update project status", async ({ page }) => {
    await signIn(page, "developer");
    const { status, body } = await patchStatus(page, "on_hold");
    expect(status).toBe(200);
    expect((body as { project: { status: string } }).project.status).toBe("on_hold");

    // Restore
    await patchStatus(page, "active");
  });

  // ── CSV exports ────────────────────────────────────────────────────────────

  test("audit log CSV returns text/csv with correct headers", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/audit?format=csv`,
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");

    const text = await res.text();
    const firstLine = text.split(/\r?\n/)[0];
    expect(firstLine).toContain("Date");
    expect(firstLine).toContain("Action");
    expect(firstLine).toContain("Actor");
  });

  test("wallet transactions CSV returns text/csv with correct headers", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/wallet/transactions?format=csv`,
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");

    const text = await res.text();
    const firstLine = text.split(/\r?\n/)[0];
    expect(firstLine).toContain("Date");
    expect(firstLine).toContain("Type");
    expect(firstLine).toContain("Reference");
  });

  test("non-admin cannot access audit CSV (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(
      `${BASE}/api/projects/${PROJECT_ID}/audit?format=csv`,
    );
    expect(res.status()).toBe(403);
  });
});
