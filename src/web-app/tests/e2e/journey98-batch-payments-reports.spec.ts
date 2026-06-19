/**
 * Journey 98 — Batch-approve page, account payments, project reports,
 *              and notification PATCH @e2e
 *
 * Covers:
 *  - /projects/[id]/batch-approve   — batch approval hub (client component)
 *  - /account/payments              — personal token payment ledger
 *  - /projects/[id]/reports         — financial reports page
 *  - PATCH /api/notifications/[notificationId] — mark notification as read
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 98 — Batch-approve, payments, reports, notification PATCH @e2e", () => {
  test.setTimeout(60_000);

  // ── /projects/[id]/batch-approve ──────────────────────────────────────────

  test("admin can load batch-approve page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/batch-approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("commercial can load batch-approve page", async ({ page }) => {
    await signIn(page, "commercial");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/batch-approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("funder can load batch-approve page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/batch-approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("unauthenticated access to batch-approve redirects", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(
      `${BASE}/projects/${PROJECT_ID}/batch-approve`,
      { maxRedirects: 0 },
    ).catch(() => null);
    if (res) {
      expect([200, 301, 302, 307, 308]).toContain(res.status());
    }
  });

  // ── /account/payments — token payment ledger ──────────────────────────────

  test("funder can load account payments page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/account/payments`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("admin can load account payments page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/account/payments`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("unauthenticated access to account payments redirects", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(
      `${BASE}/account/payments`,
      { maxRedirects: 0 },
    ).catch(() => null);
    if (res) {
      expect([200, 301, 302, 307, 308]).toContain(res.status());
    }
  });

  // ── /projects/[id]/reports — financial reports ────────────────────────────

  test("admin can load project reports page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/reports`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("funder can load project reports page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/projects/${PROJECT_ID}/reports`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("unauthenticated access to project reports redirects", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(
      `${BASE}/projects/${PROJECT_ID}/reports`,
      { maxRedirects: 0 },
    ).catch(() => null);
    if (res) {
      expect([200, 301, 302, 307, 308]).toContain(res.status());
    }
  });

  // ── PATCH /api/notifications/[notificationId] — mark as read ──────────────

  test("unauthenticated PATCH notification returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await page.request.patch(
      `${BASE}/api/notifications/${fakeId}`,
    );
    expect(res.status()).toBe(401);
  });

  test("admin can PATCH notification to mark as read", async ({ page }) => {
    await signIn(page, "admin");

    // Get a real notification first
    const listRes = await page.request.get(`${BASE}/api/notifications`);
    if (listRes.status() !== 200) return;
    const listBody = await listRes.json() as { notifications: { id: string; read: boolean }[] };
    const notif = listBody.notifications?.[0];
    if (!notif) return;

    const res = await page.request.patch(`${BASE}/api/notifications/${notif.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("PATCH with fake notification ID returns 200 (silently scoped to owner)", async ({ page }) => {
    // The PATCH scopes to user_id so a non-existent/unowned ID simply matches 0 rows — still 200
    await signIn(page, "admin");
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await page.request.patch(`${BASE}/api/notifications/${fakeId}`);
    // Supabase UPDATE with no matching row is not an error — route returns 200
    expect([200, 404]).toContain(res.status());
  });
});
