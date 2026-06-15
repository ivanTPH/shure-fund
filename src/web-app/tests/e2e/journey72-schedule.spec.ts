/**
 * Journey 72 — Payment schedule API & page @e2e
 *
 * Covers:
 *  - GET /api/projects/[projectId]/schedule
 *  - /projects/[id]/schedule page
 *
 * Auth:
 *  - Unauthenticated → 401
 *  - Contractor → 403
 *  - Commercial/funder/developer/admin → 200
 *
 * Response shape:
 *  - { stages: ScheduledStage[], undated: UndatedStage[], windows: { next30, next60, next90 } }
 *  - windows: { value: number, count: number }
 *  - Each staged: { id, contractId, name, value, status, contractorName, startDate, endDate,
 *                   daysUntilDue, isOverdue }
 *  - Each undated: { id, contractId, name, value, status, contractorName, startDate, endDate }
 *
 * Invariants:
 *  - windows.next30.count <= windows.next60.count <= windows.next90.count
 *  - windows.next30.value <= windows.next60.value <= windows.next90.value
 *  - isOverdue stages have endDate in the past and status != released
 *  - all window values >= 0
 *
 * Seeded data: project 301 has contracts and stages
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/schedule`;
const PAGE_URL   = `${BASE}/projects/${PROJECT_ID}/schedule`;

type Window = { value: number; count: number };

type ScheduleBody = {
  stages:  unknown[];
  undated: unknown[];
  windows: { next30: Window; next60: Window; next90: Window };
};

test.describe("Journey 72 — Payment schedule API & page @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
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

  test("commercial GET returns 200", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Response shape ───────────────────────────────────────────────────────

  test("response has stages, undated, and windows", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as ScheduleBody;
    expect(Array.isArray(body.stages)).toBe(true);
    expect(Array.isArray(body.undated)).toBe(true);
    expect(typeof body.windows).toBe("object");
    expect(typeof body.windows.next30).toBe("object");
    expect(typeof body.windows.next60).toBe("object");
    expect(typeof body.windows.next90).toBe("object");
  });

  test("window objects have value and count", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as ScheduleBody;
    for (const w of [body.windows.next30, body.windows.next60, body.windows.next90]) {
      expect(typeof w.value).toBe("number");
      expect(typeof w.count).toBe("number");
    }
  });

  test("window values are cumulative: next30 <= next60 <= next90", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as ScheduleBody;
    const { next30, next60, next90 } = body.windows;
    expect(next30.value).toBeLessThanOrEqual(next60.value);
    expect(next60.value).toBeLessThanOrEqual(next90.value);
  });

  test("window counts are cumulative: next30 <= next60 <= next90", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as ScheduleBody;
    const { next30, next60, next90 } = body.windows;
    expect(next30.count).toBeLessThanOrEqual(next60.count);
    expect(next60.count).toBeLessThanOrEqual(next90.count);
  });

  test("all window numeric values are non-negative", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as ScheduleBody;
    for (const w of [body.windows.next30, body.windows.next60, body.windows.next90]) {
      expect(w.value).toBeGreaterThanOrEqual(0);
      expect(w.count).toBeGreaterThanOrEqual(0);
    }
  });

  test("dated stages have required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: Array<{
        id: string; contractId: string; name: string; value: number;
        status: string; contractorName: string; daysUntilDue: number | null; isOverdue: boolean;
      }>;
    };
    if (body.stages.length === 0) return;
    const s = body.stages[0];
    expect(typeof s.id).toBe("string");
    expect(typeof s.name).toBe("string");
    expect(typeof s.value).toBe("number");
    expect(typeof s.status).toBe("string");
    expect(typeof s.contractorName).toBe("string");
    expect(typeof s.isOverdue).toBe("boolean");
  });

  test("overdue stages have status != released", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as {
      stages: Array<{ isOverdue: boolean; status: string }>;
    };
    for (const s of body.stages) {
      if (s.isOverdue) {
        expect(s.status).not.toBe("released");
      }
    }
  });

  // ── Schedule page ────────────────────────────────────────────────────────

  test("admin can load schedule page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /schedule/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("schedule page shows back to project link", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    // Back link shows project name (← <project name>), match by href
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("schedule page shows funding windows", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(
      page.getByRole("heading", { name: /schedule/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/30.day|60.day|90.day|next 30|window/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
