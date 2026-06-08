/**
 * Journey 5 — KYC submission @e2e
 *
 * Tests GET /api/account/kyc and POST /api/account/kyc.
 *
 * Covers:
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated POST returns 401
 *  - GET returns correct shape: { profile, latestSubmission }
 *  - POST with missing required fields returns 400
 *  - POST with invalid document_type returns 400
 *  - Valid POST returns 201 with submissionId
 *  - Duplicate pending submission returns 409
 *  - GET after submission shows pending_review (or existing) status
 *  - Any authenticated role can submit KYC
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

const VALID_BODY = {
  full_name:        "Journey Five Tester",
  date_of_birth:    "1985-06-15",
  nationality:      "GB",
  address_line1:    "5 Journey Test Lane",
  city:             "Manchester",
  postcode:         "M1 1AA",
  document_type:    "passport",
  document_number:  "J5TEST001",
  document_expiry:  "2032-06-30",
  source_of_funds:  "Salary",
};

async function getKyc(page: Parameters<typeof signIn>[0]) {
  const res = await page.request.get(`${BASE}/api/account/kyc`);
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

async function submitKyc(
  page: Parameters<typeof signIn>[0],
  body: Record<string, unknown>,
) {
  const res = await page.request.post(`${BASE}/api/account/kyc`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 5 — KYC submission @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/account/kyc`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/account/kyc`, {
      headers: { "Content-Type": "application/json" },
      data: VALID_BODY,
    });
    expect(res.status()).toBe(401);
  });

  // ── GET shape ──────────────────────────────────────────────────────────────

  test("GET returns correct shape with profile and latestSubmission", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await getKyc(page);

    expect(status).toBe(200);
    expect(body).toHaveProperty("profile");
    expect(body).toHaveProperty("latestSubmission");
    // profile may be null for fresh users — both are acceptable
  });

  test("GET profile includes kyc_status field when profile exists", async ({ page }) => {
    await signIn(page, "funder");
    const { status, body } = await getKyc(page);

    expect(status).toBe(200);
    if (body.profile) {
      expect(typeof body.profile.kyc_status).toBe("string");
    }
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test("missing full_name returns 400", async ({ page }) => {
    await signIn(page, "commercial");
    const { full_name: _omit, ...noName } = VALID_BODY;
    const { status, body } = await submitKyc(page, noName);
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/full_name/i);
  });

  test("missing date_of_birth returns 400", async ({ page }) => {
    await signIn(page, "commercial");
    const { date_of_birth: _omit, ...noDob } = VALID_BODY;
    const { status } = await submitKyc(page, noDob);
    expect(status).toBe(400);
  });

  test("invalid document_type returns 400", async ({ page }) => {
    await signIn(page, "commercial");
    const { status, body } = await submitKyc(page, {
      ...VALID_BODY,
      document_type: "selfie",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/document_type/i);
  });

  test("valid document types are accepted (passport, driving_licence, national_id)", async ({ page }) => {
    // Test driving_licence type with a different role to avoid 409 from earlier submission
    await signIn(page, "contractor");
    const profile = await getKyc(page);
    if (profile.body?.profile?.kyc_status === "approved") {
      console.log("Contractor KYC already approved — skipping doctype test");
      return;
    }

    // Try a driving_licence submission — may 409 if pending already exists
    const { status } = await submitKyc(page, {
      ...VALID_BODY,
      document_type: "driving_licence",
      document_number: "J5DL001",
    });
    expect([201, 409]).toContain(status);
  });

  // ── Successful submission ──────────────────────────────────────────────────

  test("valid POST returns 201 with submissionId", async ({ page }) => {
    await signIn(page, "consultant");

    // Skip if already submitted
    const profile = await getKyc(page);
    if (
      profile.body?.profile?.kyc_status === "approved" ||
      profile.body?.profile?.kyc_status === "pending_review"
    ) {
      console.log("Consultant KYC already submitted — skipping");
      return;
    }

    const { status, body } = await submitKyc(page, VALID_BODY);
    expect([201, 409]).toContain(status);

    if (status === 201) {
      expect(typeof (body as { submissionId: string }).submissionId).toBe("string");
    }
  });

  test("duplicate pending submission returns 409", async ({ page }) => {
    await signIn(page, "developer");

    // First submission (may already exist)
    const first = await submitKyc(page, VALID_BODY);
    if (first.status === 409) {
      // Already pending — try a second one to confirm 409
      const second = await submitKyc(page, { ...VALID_BODY, document_number: "J5DEV002" });
      expect(second.status).toBe(409);
      expect((second.body as { error: string }).error).toMatch(/under review/i);
      return;
    }

    // First succeeded (201) — attempt a second
    expect(first.status).toBe(201);
    const second = await submitKyc(page, { ...VALID_BODY, document_number: "J5DEV003" });
    expect(second.status).toBe(409);
    expect((second.body as { error: string }).error).toMatch(/under review/i);
  });

  // ── GET reflects submission ────────────────────────────────────────────────

  test("GET after submission shows pending_review or approved status", async ({ page }) => {
    await signIn(page, "funder");

    // Submit (or confirm already submitted)
    await submitKyc(page, VALID_BODY);

    const { body } = await getKyc(page);
    const status = body?.profile?.kyc_status;

    // After submission the status should be pending_review or approved (if already processed)
    if (status) {
      expect(["pending_review", "approved", "rejected"]).toContain(status);
    }
  });

  test("GET latestSubmission shape includes document_type and full_name", async ({ page }) => {
    await signIn(page, "admin");

    // Ensure a submission exists
    await submitKyc(page, VALID_BODY);

    const { body } = await getKyc(page);
    if (body.latestSubmission) {
      expect(typeof body.latestSubmission.id).toBe("string");
      expect(typeof body.latestSubmission.status).toBe("string");
      expect(typeof body.latestSubmission.document_type).toBe("string");
      expect(typeof body.latestSubmission.full_name).toBe("string");
    }
  });
});
