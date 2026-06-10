/**
 * Journey 28 — Portfolio view & Tier 2 proof-of-funds @e2e
 *
 * Covers:
 *
 * Proof-of-funds API (GET/POST /api/projects/[id]/proof-of-funds):
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated POST returns 401
 *  - Contractor cannot GET (403)
 *  - Contractor cannot POST (403)
 *  - Commercial cannot POST (403) — not funder or admin
 *  - Missing amount returns 400
 *  - Zero amount returns 400
 *  - Missing validFrom returns 400
 *  - Missing validUntil returns 400
 *  - validUntil not after validFrom returns 400
 *  - Funder can declare proof of funds (201)
 *  - Admin can declare proof of funds (201)
 *  - GET returns declaration in active list
 *
 * Withdrawal (PATCH /api/projects/[id]/proof-of-funds/[pofId]):
 *  - Unauthenticated PATCH returns 401
 *  - Contractor cannot withdraw (403)
 *  - Non-existent PoF returns 404
 *  - Funder can withdraw own declaration (200)
 *  - Withdrawn declaration status is 'withdrawn'
 *  - Withdrawing an already-withdrawn declaration returns 422
 *
 * Portfolio API (GET /api/projects):
 *  - Returns project list with status field
 *  - Authenticated funder can list projects
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

// ── Helpers ────────────────────────────────────────────────────────────────

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function declarePof(
  page: Parameters<typeof signIn>[0],
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    amount:     50000,
    validFrom:  futureDate(0),
    validUntil: futureDate(30),
    bankName:   "Test Bank",
  };
  const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/proof-of-funds`, {
    headers: { "Content-Type": "application/json" },
    data:    { ...defaults, ...overrides },
  });
  return { status: res.status(), body: await res.json() };
}

async function getPof(page: Parameters<typeof signIn>[0]) {
  const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/proof-of-funds`);
  return { status: res.status(), body: res.ok() ? await res.json() : await res.json() };
}

async function withdrawPof(
  page: Parameters<typeof signIn>[0],
  pofId: string,
) {
  const res = await page.request.patch(
    `${BASE}/api/projects/${PROJECT_ID}/proof-of-funds/${pofId}`,
    { headers: { "Content-Type": "application/json" }, data: {} },
  );
  return { status: res.status(), body: await res.json() };
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Journey 28 — Portfolio view & Tier 2 proof-of-funds @e2e", () => {
  test.setTimeout(60_000);

  // ── GET auth + role guards ─────────────────────────────────────────────────

  test("unauthenticated GET proof-of-funds returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/proof-of-funds`);
    expect(res.status()).toBe(401);
  });

  test("contractor cannot GET proof-of-funds (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await getPof(page);
    expect(status).toBe(403);
  });

  // ── POST auth + role guards ────────────────────────────────────────────────

  test("unauthenticated POST proof-of-funds returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/proof-of-funds`, {
      headers: { "Content-Type": "application/json" },
      data:    { amount: 50000, validFrom: futureDate(0), validUntil: futureDate(30) },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor cannot POST proof-of-funds (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await declarePof(page);
    expect(status).toBe(403);
  });

  test("commercial cannot POST proof-of-funds (403)", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await declarePof(page);
    expect(status).toBe(403);
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("missing amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await declarePof(page, { amount: undefined });
    expect(status).toBe(400);
  });

  test("zero amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await declarePof(page, { amount: 0 });
    expect(status).toBe(400);
  });

  test("missing validFrom returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await declarePof(page, { validFrom: undefined });
    expect(status).toBe(400);
  });

  test("missing validUntil returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await declarePof(page, { validUntil: undefined });
    expect(status).toBe(400);
  });

  test("validUntil not after validFrom returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const sameDay = futureDate(5);
    const { status, body } = await declarePof(page, { validFrom: sameDay, validUntil: sameDay });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/after/i);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("funder can declare proof of funds (201)", async ({ page }) => {
    await signIn(page, "funder");
    const { status, body } = await declarePof(page, { amount: 75000, bankName: "Harbour Capital Bank" });
    expect(status).toBe(201);
    const b = body as { declaration: { id: string; amount: number; status: string } };
    expect(b.declaration.id).toBeTruthy();
    expect(b.declaration.amount).toBe(75000);
    expect(b.declaration.status).toBe("active");
  });

  test("admin can declare proof of funds (201)", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await declarePof(page, { amount: 120000, bankName: "Admin Bank" });
    expect(status).toBe(201);
    expect((body as { declaration: { status: string } }).declaration.status).toBe("active");
  });

  // ── GET returns declarations ───────────────────────────────────────────────

  test("GET returns active declarations with totalActive", async ({ page }) => {
    await signIn(page, "admin");
    // Declare one first to ensure there's at least one
    await declarePof(page, { amount: 25000 });

    const { status, body } = await getPof(page);
    expect(status).toBe(200);
    const b = body as { declarations: unknown[]; active: unknown[]; totalActive: number };
    expect(Array.isArray(b.declarations)).toBe(true);
    expect(b.totalActive).toBeGreaterThan(0);
    expect(b.active.length).toBeGreaterThan(0);
  });

  test("developer can GET proof-of-funds (read-only)", async ({ page }) => {
    await signIn(page, "developer");
    const { status, body } = await getPof(page);
    expect(status).toBe(200);
    expect(Array.isArray((body as { declarations: unknown[] }).declarations)).toBe(true);
  });

  // ── Withdrawal: auth + role guards ────────────────────────────────────────

  test("unauthenticated PATCH withdrawal returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(
      `${BASE}/api/projects/${PROJECT_ID}/proof-of-funds/00000000-0000-0000-0000-000000000000`,
      { headers: { "Content-Type": "application/json" }, data: {} },
    );
    expect(res.status()).toBe(401);
  });

  test("contractor cannot withdraw (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.patch(
      `${BASE}/api/projects/${PROJECT_ID}/proof-of-funds/00000000-0000-0000-0000-000000000000`,
      { headers: { "Content-Type": "application/json" }, data: {} },
    );
    expect(res.status()).toBe(403);
  });

  test("non-existent PoF returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await withdrawPof(page, "00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  // ── Withdrawal: success + idempotency ─────────────────────────────────────

  test("funder can withdraw own declaration and status becomes withdrawn", async ({ page }) => {
    await signIn(page, "funder");
    // Declare first
    const { body: declBody } = await declarePof(page, { amount: 30000 });
    const pofId = (declBody as { declaration: { id: string } }).declaration.id;

    const { status, body } = await withdrawPof(page, pofId);
    expect(status).toBe(200);
    const b = body as { declaration: { status: string }; amlFlagged: boolean };
    expect(b.declaration.status).toBe("withdrawn");
    // Early withdrawal within valid period triggers AML flag
    expect(typeof b.amlFlagged).toBe("boolean");
  });

  test("withdrawing an already-withdrawn declaration returns 422", async ({ page }) => {
    await signIn(page, "funder");
    const { body: declBody } = await declarePof(page, { amount: 10000 });
    const pofId = (declBody as { declaration: { id: string } }).declaration.id;

    await withdrawPof(page, pofId); // first withdrawal
    const { status, body } = await withdrawPof(page, pofId); // second
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/withdrawn|active/i);
  });

  // ── Portfolio (GET /api/projects) ──────────────────────────────────────────

  test("GET /api/projects returns project list", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { projects: Array<{ id: string; status: string }> };
    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.projects.length).toBeGreaterThan(0);
    // Each project has a status field
    expect(body.projects[0].status).toBeTruthy();
  });

  test("funder can list projects", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { projects: unknown[] };
    expect(Array.isArray(body.projects)).toBe(true);
  });
});
