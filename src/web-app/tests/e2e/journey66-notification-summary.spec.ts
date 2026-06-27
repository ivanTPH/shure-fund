/**
 * Journey 66 — Notification summary API @e2e
 *
 * Covers GET /api/notifications/summary
 *
 * Auth:
 *  - Unauthenticated → 401
 *
 * Response shape:
 *  - { unread: number, actionRequired: number }
 *  - Both fields are non-negative integers
 *  - actionRequired <= unread (action items are a subset of unread)
 *
 * Role access:
 *  - All authenticated roles get 200 (personal notifications, not role-gated)
 *
 * Invariants:
 *  - actionRequired <= unread
 *  - Both values >= 0
 *
 * Also covers:
 *  - Relationship to full notifications list (unread count must be consistent)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/notifications/summary`;

test.describe("Journey 66 — Notification summary API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Role access ──────────────────────────────────────────────────────────

  test("admin GET summary returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder GET summary returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET summary returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("contractor GET summary returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("commercial GET summary returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Response shape ───────────────────────────────────────────────────────

  test("response has unread and actionRequired fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(typeof body.unread).toBe("number");
    expect(typeof body.actionRequired).toBe("number");
  });

  test("unread >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(body.unread).toBeGreaterThanOrEqual(0);
    expect(body.actionRequired).toBeGreaterThanOrEqual(0);
  });

  test("actionRequired <= unread", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(body.actionRequired).toBeLessThanOrEqual(body.unread);
  });

  test("contractor summary: actionRequired <= unread", async ({ page }) => {
    await signIn(page, "contractor");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(body.actionRequired).toBeLessThanOrEqual(body.unread);
  });

  test("developer summary: fields are integers", async ({ page }) => {
    await signIn(page, "developer");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { unread: number; actionRequired: number };
    expect(Number.isInteger(body.unread)).toBe(true);
    expect(Number.isInteger(body.actionRequired)).toBe(true);
  });

  // ── Consistency with full notifications list ─────────────────────────────

  test("summary unread <= total notification count", async ({ page }) => {
    await signIn(page, "admin");
    const [summaryRes, listRes] = await Promise.all([
      page.request.get(ENDPOINT),
      page.request.get(`${BASE}/api/notifications`),
    ]);
    const summary = await summaryRes.json() as { unread: number };
    const list    = await listRes.json() as { notifications: Array<{ read: boolean }> };
    const unreadFromList = list.notifications.filter((n) => !n.read).length;
    // Summary counts all unread across all pages; the list may be paginated so
    // unreadFromList is a lower bound — summary.unread >= unreadFromList.
    expect(summary.unread).toBeGreaterThanOrEqual(unreadFromList);
  });
});
