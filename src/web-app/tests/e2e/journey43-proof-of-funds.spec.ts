/**
 * Journey 43 — Proof of Funds API @e2e
 *
 * Covers GET and POST /api/projects/[id]/proof-of-funds
 *        PATCH /api/projects/[id]/proof-of-funds/[pofId]
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Unauthenticated POST → 401
 *  - Contractor GET → 403
 *  - Contractor POST → 403
 *
 * GET shape:
 *  - Returns { declarations, active, history, totalActive }
 *  - totalActive is a number
 *
 * POST validation:
 *  - Missing amount → 400
 *  - Missing validFrom → 400
 *  - Missing validUntil → 400
 *  - validUntil before validFrom → 400
 *  - amount ≤ 0 → 400
 *
 * POST success:
 *  - 201 with declaration: { id, amount, status: "active", valid_from, valid_until }
 *
 * PATCH (withdraw):
 *  - Non-existent pofId → 404
 *  - 200 with { declaration: { status: "withdrawn" }, amlFlagged }
 *  - Re-withdrawal of withdrawn → 422
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const ENDPOINT   = `${BASE}/api/projects/${PROJECT_ID}/proof-of-funds`;

let createdPofId = "";

test.describe("Journey 43 — Proof of Funds @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ─────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 100000, validFrom: "2026-06-01", validUntil: "2026-06-30" },
    });
    expect(res.status()).toBe(401);
  });

  test("contractor GET returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("contractor POST returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 100000, validFrom: "2026-06-01", validUntil: "2026-06-30" },
    });
    expect(res.status()).toBe(403);
  });

  // ── GET shape ────────────────────────────────────────────────────────────

  test("admin GET returns correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      declarations: unknown[];
      active: unknown[];
      history: unknown[];
      totalActive: number;
    };
    expect(Array.isArray(body.declarations)).toBe(true);
    expect(Array.isArray(body.active)).toBe(true);
    expect(Array.isArray(body.history)).toBe(true);
    expect(typeof body.totalActive).toBe("number");
  });

  test("funder GET also succeeds", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── POST validation ──────────────────────────────────────────────────────

  test("POST missing amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { validFrom: "2026-06-01", validUntil: "2026-06-30" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST zero amount returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 0, validFrom: "2026-06-01", validUntil: "2026-06-30" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST missing validFrom returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 100000, validUntil: "2026-06-30" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST missing validUntil returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 100000, validFrom: "2026-06-01" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST validUntil before validFrom returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: { amount: 100000, validFrom: "2026-06-30", validUntil: "2026-06-01" },
    });
    expect(res.status()).toBe(400);
  });

  // ── POST success ─────────────────────────────────────────────────────────

  test("admin POST valid declaration returns 201 with id", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, {
      data: {
        amount:         250000,
        validFrom:      "2026-07-01",
        validUntil:     "2026-07-31",
        bankName:       "Barclays",
        bankReference:  "E2E-TEST-001",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { declaration: { id: string; status: string; amount: number } };
    expect(typeof body.declaration.id).toBe("string");
    expect(body.declaration.status).toBe("active");
    expect(Number(body.declaration.amount)).toBe(250000);
    createdPofId = body.declaration.id;
  });

  test("GET after POST shows new declaration in active list", async ({ page }) => {
    if (!createdPofId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { active: Array<{ id: string }> };
    const found = body.active.some((d) => d.id === createdPofId);
    expect(found).toBe(true);
  });

  // ── PATCH (withdraw) ─────────────────────────────────────────────────────

  test("PATCH non-existent pofId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: {} },
    );
    expect(res.status()).toBe(404);
  });

  test("admin PATCH withdraw succeeds with 200 and amlFlagged field", async ({ page }) => {
    if (!createdPofId) { test.skip(); return; }
    await signIn(page, "admin");
    const res  = await page.request.patch(`${ENDPOINT}/${createdPofId}`, {
      data: { withdrawalReason: "E2E test withdrawal" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { declaration: { status: string }; amlFlagged: boolean };
    expect(body.declaration.status).toBe("withdrawn");
    expect(typeof body.amlFlagged).toBe("boolean");
  });

  test("PATCH already-withdrawn declaration returns 422", async ({ page }) => {
    if (!createdPofId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.patch(`${ENDPOINT}/${createdPofId}`, { data: {} });
    expect(res.status()).toBe(422);
  });
});
