/**
 * Journey 79 — Admin compliance (AML) review queue @e2e
 *
 * Covers:
 *  - GET  /api/admin/compliance        — list compliance reviews
 *  - PATCH /api/admin/compliance/[reviewId] — approve/reject/escalate
 *
 * GET auth:
 *  - Unauthenticated → 401
 *  - Non-admin (funder, developer, contractor, commercial) → 403
 *  - Admin → 200
 *
 * GET query params:
 *  - ?status=pending  (default)
 *  - ?status=approved
 *  - ?status=all
 *  - ?limit=<n>  (max 100)
 *
 * GET response: { reviews: ComplianceReview[] }
 *  Each review: { id, created_at, rule_id, rule_label, risk_level, status,
 *                 entity_type, entity_id, context, triggered_by_user, reviewer_user }
 *
 * PATCH auth:
 *  - Unauthenticated → 401
 *  - Non-admin → 403
 *
 * PATCH body: { status: "approved" | "rejected" | "escalated", reviewerNotes?: string }
 *  - Invalid status → 400
 *  - Non-existent reviewId → 404
 *  - Valid action → 200 { reviewId, status }
 *
 * Invariants:
 *  - All returned reviews match the requested status filter
 *  - risk_level values: low, medium, high
 *  - status values: pending, approved, rejected, escalated
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ENDPOINT = `${BASE}/api/admin/compliance`;

type ComplianceReview = {
  id:            string;
  created_at:    string;
  rule_id:       string;
  rule_label:    string | null;
  risk_level:    string;
  status:        string;
  entity_type:   string | null;
  entity_id:     string | null;
  context:       Record<string, unknown> | null;
  triggered_by_user: { id: string; email: string } | null;
  reviewer_user:     { id: string; email: string } | null;
};

test.describe("Journey 79 — Admin compliance (AML) review queue @e2e", () => {
  test.setTimeout(60_000);

  // ── GET auth guards ──────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("funder GET returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

  test("developer GET returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(403);
  });

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

  // ── GET allowed role ─────────────────────────────────────────────────────

  test("admin GET returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── GET response shape ───────────────────────────────────────────────────

  test("GET response has reviews array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    const body = await res.json() as { reviews: unknown[] };
    expect(Array.isArray(body.reviews)).toBe(true);
  });

  test("default status filter returns only pending reviews", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT); // default: ?status=pending
    const body = await res.json() as { reviews: ComplianceReview[] };
    for (const r of body.reviews) {
      expect(r.status).toBe("pending");
    }
  });

  test("?status=all returns reviews of any status", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=all`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { reviews: unknown[] };
    expect(Array.isArray(body.reviews)).toBe(true);
  });

  test("?status=approved returns only approved reviews", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=approved`);
    const body = await res.json() as { reviews: ComplianceReview[] };
    for (const r of body.reviews) {
      expect(r.status).toBe("approved");
    }
  });

  test("?limit=1 returns at most 1 review", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=all&limit=1`);
    const body = await res.json() as { reviews: unknown[] };
    expect(body.reviews.length).toBeLessThanOrEqual(1);
  });

  test("review fields have correct types when reviews exist", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(`${ENDPOINT}?status=all`);
    const body = await res.json() as { reviews: ComplianceReview[] };
    if (body.reviews.length === 0) return;
    const r = body.reviews[0];
    expect(typeof r.id).toBe("string");
    expect(typeof r.created_at).toBe("string");
    expect(typeof r.risk_level).toBe("string");
    expect(["low", "medium", "high"]).toContain(r.risk_level);
    expect(typeof r.status).toBe("string");
    expect(["pending", "approved", "rejected", "escalated"]).toContain(r.status);
  });

  // ── PATCH auth guards ────────────────────────────────────────────────────

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: { status: "approved" } },
    );
    expect(res.status()).toBe(401);
  });

  test("funder PATCH returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: { status: "approved" } },
    );
    expect(res.status()).toBe(403);
  });

  // ── PATCH validation ──────────────────────────────────────────────────────

  test("PATCH with invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`,
      { data: { status: "cleared" } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/approved|rejected|escalated/i);
  });

  test("PATCH on non-existent reviewId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(
      `${ENDPOINT}/00000000-0000-0000-0000-999999999999`,
      { data: { status: "approved" } },
    );
    expect(res.status()).toBe(404);
  });

  // ── PATCH happy path — act on a pending review ───────────────────────────

  test("admin can approve a pending compliance review", async ({ page }) => {
    await signIn(page, "admin");

    // Fetch a pending review to act on
    const listRes = await page.request.get(`${ENDPOINT}?status=pending&limit=1`);
    const listBody = await listRes.json() as { reviews: ComplianceReview[] };

    if (listBody.reviews.length === 0) {
      // No pending reviews to act on — skip
      return;
    }

    const reviewId = listBody.reviews[0].id;
    const patchRes = await page.request.patch(`${ENDPOINT}/${reviewId}`, {
      data: { status: "approved", reviewerNotes: "E2E test approval" },
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json() as { reviewId: string; status: string };
    expect(patchBody.reviewId).toBe(reviewId);
    expect(patchBody.status).toBe("approved");
  });

  test("admin can escalate a pending compliance review", async ({ page }) => {
    await signIn(page, "admin");

    const listRes = await page.request.get(`${ENDPOINT}?status=pending&limit=1`);
    const listBody = await listRes.json() as { reviews: ComplianceReview[] };

    if (listBody.reviews.length === 0) return; // No pending reviews

    const reviewId = listBody.reviews[0].id;
    const patchRes = await page.request.patch(`${ENDPOINT}/${reviewId}`, {
      data: { status: "escalated", reviewerNotes: "E2E escalation test" },
    });
    // Either 200 (escalated) or 404 (already actioned from previous test)
    expect([200, 404]).toContain(patchRes.status());
    if (patchRes.status() === 200) {
      const body = await patchRes.json() as { status: string };
      expect(body.status).toBe("escalated");
    }
  });
});
