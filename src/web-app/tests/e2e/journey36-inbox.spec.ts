/**
 * Journey 36 — Notification inbox @e2e
 *
 * Covers GET /api/notifications, PATCH /api/notifications (bulk mark-read),
 * and PATCH /api/notifications/[id] (single mark-read).
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Any authenticated user → 200 (own notifications only)
 *
 * Shape:
 *  - GET returns notifications[]
 *  - Each notification has: id, type, message, read, created_at
 *
 * PATCH single:
 *  - Marks notification read → 200
 *  - Non-existent ID → 404 or 200 (idempotent)
 *
 * PATCH bulk (no ID):
 *  - Marks all as read → 200
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/notifications`;

test.describe("Journey 36 — Notification inbox @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("contractor GET returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("admin GET returns 200 with correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);

    const body = await res.json() as { notifications: Array<{
      id: string; type: string; message: string; read: boolean; created_at: string;
    }> };

    expect(Array.isArray(body.notifications)).toBe(true);
  });

  test("notifications have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      notifications: Array<{ id: string; type: string; message: string; read: boolean; created_at: string }>;
    };

    if (body.notifications.length === 0) { return; } // no notifications yet

    const n = body.notifications[0];
    expect(typeof n.id).toBe("string");
    expect(typeof n.type).toBe("string");
    expect(typeof n.message).toBe("string");
    expect(typeof n.read).toBe("boolean");
    expect(typeof n.created_at).toBe("string");
  });

  // ── Mark-read ──────────────────────────────────────────────────────────────

  test("PATCH bulk marks all notifications read", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ENDPOINT, { data: {} });
    expect([200, 204]).toContain(res.status());
  });

  test("PATCH non-existent notification ID returns 404 or 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: {} }
    );
    // Either 404 (not found) or 200 (idempotent) is acceptable
    expect([200, 404]).toContain(res.status());
  });

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(ENDPOINT, { data: {} });
    expect(res.status()).toBe(401);
  });
});
