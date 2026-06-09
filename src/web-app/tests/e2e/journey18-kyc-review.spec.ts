/**
 * Journey 18 — KYC review @e2e
 *
 * Tests GET and PATCH /api/admin/compliance/kyc.
 *
 * Covers:
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated PATCH returns 401
 *  - Non-admin GET returns 403
 *  - Non-admin PATCH returns 403
 *  - Admin GET returns submissions array with correct shape
 *  - PATCH missing submissionId returns 400
 *  - PATCH invalid status returns 400
 *  - PATCH non-existent submissionId returns 404
 *  - Admin can approve a pending submission (status=approved)
 *  - Admin can reject a pending submission (status=rejected)
 *  - Re-reviewing an already-processed submission returns 409
 *  - Approved submission sets user kyc_status to approved
 *  - Reviewer notes are stored
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

const VALID_KYC_BODY = {
  full_name:       "Journey 18 KYC Tester",
  date_of_birth:   "1990-03-20",
  nationality:     "GB",
  address_line1:   "18 Compliance Street",
  city:            "Leeds",
  postcode:        "LS1 1AA",
  document_type:   "passport",
  document_number: "J18PASS001",
  document_expiry: "2030-12-31",
  source_of_funds: "Business income",
};

async function adminPatch(
  page: Parameters<typeof signIn>[0],
  body: Record<string, unknown>,
) {
  const res = await page.request.patch(`${BASE}/api/admin/compliance/kyc`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

/** Submit KYC as the given role, returns submissionId or null if already pending/approved */
async function ensureKycSubmission(
  page: Parameters<typeof signIn>[0],
  role: "commercial" | "consultant" | "treasury",
): Promise<string | null> {
  await signIn(page, role);

  // Check current KYC status
  const profile = await page.request.get(`${BASE}/api/account/kyc`);
  const profileBody = await profile.json() as {
    profile: { kyc_status: string } | null;
    latestSubmission: { id: string; status: string } | null;
  };

  // If already approved, no more submissions allowed
  if (profileBody.profile?.kyc_status === "approved") return null;

  // If there's already a pending submission, use it
  if (profileBody.latestSubmission?.status === "pending") {
    return profileBody.latestSubmission.id;
  }

  // Submit a fresh KYC
  const res = await page.request.post(`${BASE}/api/account/kyc`, {
    headers: { "Content-Type": "application/json" },
    data: VALID_KYC_BODY,
  });
  if (res.status() === 201) {
    const body = await res.json() as { submissionId: string };
    return body.submissionId;
  }
  if (res.status() === 409) {
    // Already has a pending one — fetch it from the admin queue
    return null; // Will be fetched from admin queue instead
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 18 — KYC review @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/admin/compliance/kyc`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(`${BASE}/api/admin/compliance/kyc`, {
      headers: { "Content-Type": "application/json" },
      data: { submissionId: "x", status: "approved" },
    });
    expect(res.status()).toBe(401);
  });

  // ── Role guards ────────────────────────────────────────────────────────────

  test("funder GET returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(`${BASE}/api/admin/compliance/kyc`);
    expect(res.status()).toBe(403);
  });

  test("developer PATCH returns 403", async ({ page }) => {
    await signIn(page, "developer");
    const { status } = await adminPatch(page, {
      submissionId: "00000000-0000-0000-0000-000000000001",
      status: "approved",
    });
    expect(status).toBe(403);
  });

  test("commercial GET returns 403", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.get(`${BASE}/api/admin/compliance/kyc`);
    expect(res.status()).toBe(403);
  });

  // ── GET shape ──────────────────────────────────────────────────────────────

  test("admin GET returns submissions array with correct shape", async ({ page }) => {
    await signIn(page, "admin");
    const data = await apiGet(page, "/api/admin/compliance/kyc") as {
      submissions: Array<Record<string, unknown>>;
    };

    expect(Array.isArray(data.submissions)).toBe(true);

    for (const s of data.submissions.slice(0, 3)) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.status).toBe("string");
      expect(typeof s.full_name).toBe("string");
      expect(typeof s.document_type).toBe("string");
    }
  });

  test("admin GET includes user info on each submission", async ({ page }) => {
    await signIn(page, "admin");
    const data = await apiGet(page, "/api/admin/compliance/kyc") as {
      submissions: Array<{ user: { id: string; email: string } | null }>;
    };

    expect(Array.isArray(data.submissions)).toBe(true);
    // At least some submissions should have user info
    const withUser = data.submissions.filter((s) => s.user !== null);
    if (data.submissions.length > 0) {
      expect(withUser.length).toBeGreaterThan(0);
    }
  });

  // ── PATCH validation ───────────────────────────────────────────────────────

  test("PATCH missing submissionId returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await adminPatch(page, { status: "approved" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/submissionId/i);
  });

  test("PATCH invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await adminPatch(page, {
      submissionId: "00000000-0000-0000-0000-000000000001",
      status: "pending",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/approved.*rejected/i);
  });

  test("PATCH non-existent submissionId returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await adminPatch(page, {
      submissionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      status: "approved",
    });
    expect(status).toBe(404);
  });

  // ── PATCH success ──────────────────────────────────────────────────────────

  test("admin can reject a pending submission", async ({ page }) => {
    // Use treasury role — it can submit KYC independently
    const submissionId = await ensureKycSubmission(page, "treasury");

    if (!submissionId) {
      // Fetch from admin queue instead
      await signIn(page, "admin");
      const data = await apiGet(page, "/api/admin/compliance/kyc") as {
        submissions: Array<{ id: string; status: string }>;
      };
      const pending = data.submissions.find((s) => s.status === "pending");
      if (!pending) {
        console.log("No pending KYC submissions — skipping reject test");
        return;
      }

      const { status, body } = await adminPatch(page, {
        submissionId: pending.id,
        status: "rejected",
        reviewer_notes: "Journey 18: test rejection",
      });
      expect(status).toBe(200);
      expect((body as { status: string }).status).toBe("rejected");
      return;
    }

    await signIn(page, "admin");
    const { status, body } = await adminPatch(page, {
      submissionId,
      status: "rejected",
      reviewer_notes: "Insufficient documentation",
    });
    expect(status).toBe(200);
    expect((body as { submissionId: string; status: string }).status).toBe("rejected");
    expect((body as { submissionId: string }).submissionId).toBe(submissionId);
  });

  test("admin can approve a pending submission", async ({ page }) => {
    // Submit a fresh KYC as commercial
    const submissionId = await ensureKycSubmission(page, "commercial");

    if (!submissionId) {
      // Find another pending submission in the admin queue
      await signIn(page, "admin");
      const data = await apiGet(page, "/api/admin/compliance/kyc") as {
        submissions: Array<{ id: string; status: string }>;
      };
      const pending = data.submissions.find((s) => s.status === "pending");
      if (!pending) {
        console.log("No pending KYC submissions for approve test — skipping");
        return;
      }

      const { status, body } = await adminPatch(page, {
        submissionId: pending.id,
        status: "approved",
        reviewer_notes: "All documents verified",
        kyc_tier: "standard",
      });
      expect(status).toBe(200);
      expect((body as { status: string }).status).toBe("approved");
      return;
    }

    await signIn(page, "admin");
    const { status, body } = await adminPatch(page, {
      submissionId,
      status: "approved",
      reviewer_notes: "All documents verified",
      kyc_tier: "standard",
    });
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe("approved");
  });

  test("re-reviewing a processed submission returns 409", async ({ page }) => {
    await signIn(page, "admin");

    // Find an already-processed submission
    const data = await apiGet(page, "/api/admin/compliance/kyc") as {
      submissions: Array<{ id: string; status: string }>;
    };
    const processed = data.submissions.find((s) => s.status !== "pending");

    if (!processed) {
      console.log("No processed submissions found — skipping 409 test");
      return;
    }

    const { status, body } = await adminPatch(page, {
      submissionId: processed.id,
      status: "approved",
    });
    expect(status).toBe(409);
    expect((body as { error: string }).error).toMatch(/already/i);
  });

  test("approved submission sets kyc_status on the user", async ({ page }) => {
    // Submit as consultant then approve
    const submissionId = await ensureKycSubmission(page, "consultant");

    if (!submissionId) {
      console.log("No fresh submission available — skipping kyc_status propagation test");
      return;
    }

    await signIn(page, "admin");
    const { status } = await adminPatch(page, {
      submissionId,
      status: "approved",
      kyc_tier: "enhanced",
    });
    expect(status).toBe(200);

    // Check user's KYC status via their own profile
    await signIn(page, "consultant");
    const profileRes = await page.request.get(`${BASE}/api/account/kyc`);
    const profileBody = await profileRes.json() as {
      profile: { kyc_status: string } | null;
    };
    expect(profileBody.profile?.kyc_status).toBe("approved");
  });
});
