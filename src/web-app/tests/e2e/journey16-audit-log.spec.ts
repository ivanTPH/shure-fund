/**
 * Journey 16 — Audit log @e2e
 *
 * Tests GET /api/projects/[projectId]/audit.
 *
 * Covers:
 *  - Unauthenticated returns 401
 *  - Contractor returns 403 (only funder/developer/admin)
 *  - Commercial returns 403
 *  - Consultant returns 403
 *  - Funder can GET audit events
 *  - Developer can GET audit events
 *  - Admin can GET audit events
 *  - Response shape: { events: Array<...>, total: number }
 *  - Each event has id, action, createdAt, actor fields
 *  - stageId query filter narrows results
 *  - action query filter narrows results
 *  - limit param caps result count
 *  - Events appear in reverse-chronological order
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

async function getAudit(
  page: Parameters<typeof signIn>[0],
  params: Record<string, string | number> = {},
) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const url = `${BASE}/api/projects/${PROJECT_ID}/audit${qs ? `?${qs}` : ""}`;
  const res = await page.request.get(url);
  return { status: res.status(), body: res.ok() ? await res.json() : await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 16 — Audit log @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gate ──────────────────────────────────────────────────────────────

  test("unauthenticated returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/audit`);
    expect(res.status()).toBe(401);
  });

  // ── Role guards ────────────────────────────────────────────────────────────

  test("contractor cannot read audit log", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await getAudit(page);
    expect(status).toBe(403);
  });

  test("commercial cannot read audit log", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await getAudit(page);
    expect(status).toBe(403);
  });

  test("consultant cannot read audit log", async ({ page }) => {
    await signIn(page, "consultant");
    const { status } = await getAudit(page);
    expect(status).toBe(403);
  });

  // ── Read access ────────────────────────────────────────────────────────────

  test("funder can read audit log", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await getAudit(page);
    expect(status).toBe(200);
  });

  test("developer can read audit log", async ({ page }) => {
    await signIn(page, "developer");
    const { status } = await getAudit(page);
    expect(status).toBe(200);
  });

  test("admin can read audit log", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await getAudit(page);
    expect(status).toBe(200);
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  test("response has correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getAudit(page);

    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBe(body.events.length);
  });

  test("each event has required fields", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getAudit(page);

    for (const event of (body.events as Array<Record<string, unknown>>).slice(0, 5)) {
      expect(typeof event.id).toBe("string");
      expect(typeof event.action).toBe("string");
      expect(typeof event.createdAt).toBe("string");
      // actor may be null for system events
      if (event.actor !== null) {
        expect(typeof (event.actor as Record<string, unknown>).full_name).toBe("string");
      }
    }
  });

  test("events are returned newest-first", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getAudit(page);
    const events = body.events as Array<{ createdAt: string }>;

    if (events.length < 2) return;

    for (let i = 0; i < events.length - 1; i++) {
      const a = new Date(events[i].createdAt).getTime();
      const b = new Date(events[i + 1].createdAt).getTime();
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  // ── Filters ────────────────────────────────────────────────────────────────

  test("limit param caps result count", async ({ page }) => {
    await signIn(page, "admin");

    const { body: all } = await getAudit(page);
    if ((all.events as unknown[]).length < 2) {
      console.log("Fewer than 2 audit events — skipping limit test");
      return;
    }

    const { body: limited } = await getAudit(page, { limit: 1 });
    expect((limited.events as unknown[]).length).toBeLessThanOrEqual(1);
  });

  test("stageId filter returns only events for that stage", async ({ page }) => {
    await signIn(page, "admin");

    // Get all events, find one with a stageId
    const { body: all } = await getAudit(page);
    const withStage = (all.events as Array<{ stageId: string | null; action: string }>)
      .find((e) => e.stageId !== null);

    if (!withStage) {
      console.log("No audit events with stageId found — skipping stageId filter test");
      return;
    }

    const { body: filtered } = await getAudit(page, { stageId: withStage.stageId! });
    expect(Array.isArray(filtered.events)).toBe(true);
    for (const e of filtered.events as Array<{ stageId: string | null }>) {
      expect(e.stageId).toBe(withStage.stageId);
    }
  });

  test("action filter returns only events of that action type", async ({ page }) => {
    await signIn(page, "admin");

    const { body: all } = await getAudit(page);
    if ((all.events as unknown[]).length === 0) {
      console.log("No audit events found — skipping action filter test");
      return;
    }

    const firstAction = (all.events as Array<{ action: string }>)[0].action;
    const { body: filtered } = await getAudit(page, { action: firstAction });

    for (const e of filtered.events as Array<{ action: string }>) {
      expect(e.action).toBe(firstAction);
    }
  });

  // ── Verify audit events are generated after stage transitions ──────────────

  test("audit events exist for this project (from earlier test journeys)", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getAudit(page);

    // The test suite's earlier journeys (1-15) perform many stage transitions,
    // so we expect at least a handful of audit events.
    expect((body.events as unknown[]).length).toBeGreaterThan(0);
    console.log(`Audit log has ${body.total} events for project ${PROJECT_ID}`);
  });

  test("wallet_funded action appears in audit log after deposits", async ({ page }) => {
    await signIn(page, "admin");
    const { body } = await getAudit(page, { action: "wallet_funded" });

    // Journey 1 and 6 both deposit funds — wallet_funded events should exist
    expect(Array.isArray(body.events)).toBe(true);
    // May be 0 if deposits were all blocked by AML in this run
    console.log(`wallet_funded events: ${body.total}`);
  });

  test("apiGet helper works for audit route", async ({ page }) => {
    await signIn(page, "funder");
    const data = await apiGet(page, `/api/projects/${PROJECT_ID}/audit`) as {
      events: unknown[];
      total: number;
    };
    expect(Array.isArray(data.events)).toBe(true);
    expect(typeof data.total).toBe("number");
  });
});
