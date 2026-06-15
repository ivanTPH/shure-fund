/**
 * Journey 67 — Project audit trail API @e2e
 *
 * Covers GET /api/projects/[projectId]/audit
 *
 * Auth:
 *  - Unauthenticated → 401
 *
 * Role guards:
 *  - Contractor → 403
 *  - Commercial → 403
 *  - Funder → 200
 *  - Developer → 200
 *  - Admin → 200
 *
 * Response shape:
 *  - { events: [], total: number }
 *  - Each event has: id, action, createdAt (+ optional stageId, stageName, fromState, toState, actor)
 *  - total matches events.length
 *
 * Query params:
 *  - ?stageId=<uuid> — filters events to that stage
 *  - ?action=<action> — filters events to that action type
 *  - ?limit=<n> — caps result count (max 500)
 *  - ?format=csv — returns CSV text/csv with audit data
 *
 * Invariants:
 *  - total === events.length
 *  - All events have string id and createdAt
 *  - Non-existent project → 200 with empty events (assertProjectAccess auto-members)
 *
 * Seeded data:
 *  - Project 301 has audit events from migrations 007
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/audit`;

test.describe("Journey 67 — Project audit trail API @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Role guards ──────────────────────────────────────────────────────────

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("commercial GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  // ── Allowed roles ────────────────────────────────────────────────────────

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder GET returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Response shape ───────────────────────────────────────────────────────

  test("response has events array and total", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { events: unknown[]; total: number };
    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("total matches events.length", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { events: unknown[]; total: number };
    expect(body.total).toBe(body.events.length);
  });

  test("events have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      events: Array<{
        id: string;
        action: string;
        createdAt: string;
        stageId: string | null;
        fromState: string | null;
        toState: string | null;
      }>;
    };
    if (body.events.length === 0) return;
    const e = body.events[0];
    expect(typeof e.id).toBe("string");
    expect(typeof e.action).toBe("string");
    expect(typeof e.createdAt).toBe("string");
    // stageId, fromState, toState may be null
    expect(e.stageId === null || typeof e.stageId === "string").toBe(true);
  });

  test("project 301 has audit events", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { total: number };
    expect(body.total).toBeGreaterThan(0);
  });

  // ── Ordering ─────────────────────────────────────────────────────────────

  test("events are ordered newest first", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { events: Array<{ createdAt: string }> };
    if (body.events.length < 2) return;
    const first  = new Date(body.events[0].createdAt).getTime();
    const second = new Date(body.events[1].createdAt).getTime();
    expect(first).toBeGreaterThanOrEqual(second);
  });

  // ── Limit param ──────────────────────────────────────────────────────────

  test("limit=1 returns at most 1 event", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?limit=1`);
    const body = await res.json() as { events: unknown[]; total: number };
    expect(body.events.length).toBeLessThanOrEqual(1);
    expect(body.total).toBeLessThanOrEqual(1);
  });

  test("limit=5 returns at most 5 events", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?limit=5`);
    const body = await res.json() as { events: unknown[] };
    expect(body.events.length).toBeLessThanOrEqual(5);
  });

  // ── Action filter ────────────────────────────────────────────────────────

  test("action filter returns only matching events", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?action=stage_status_changed`);
    const body = await res.json() as { events: Array<{ action: string }> };
    for (const e of body.events) {
      expect(e.action).toBe("stage_status_changed");
    }
  });

  // ── CSV export ───────────────────────────────────────────────────────────

  test("format=csv returns CSV content-type", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${ENDPOINT}?format=csv`);
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("text/csv");
  });

  test("format=csv response contains Date header row", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?format=csv`);
    const text = await res.text();
    expect(text).toContain("Date");
    expect(text).toContain("Action");
  });
});
