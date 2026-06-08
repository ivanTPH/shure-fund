/**
 * Journey 14 — KYC document upload @e2e
 *
 * Tests POST /api/account/kyc/documents — the private storage upload endpoint
 * for KYC identity documents (ID front/back + proof of address).
 *
 * Covers:
 *  - Unauthenticated upload returns 401
 *  - Missing file field returns 400
 *  - Invalid docType returns 400
 *  - Invalid MIME type returns 415
 *  - Valid front/back/address uploads return 201 with a storage path
 *  - Returned path follows convention: {userId}/{docType}-{timestamp}.{ext}
 *  - Path can be included in a KYC form submission
 *  - Admin compliance route returns signed URLs for submitted document paths
 *
 * Note: requires the kyc-documents Storage bucket (migration 014).
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

// Minimal valid JPEG (1×1 white pixel)
function makeJpeg(): Buffer {
  return Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc000110800010001" +
    "03012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc40000ffda00030101003f00ffd9",
    "hex",
  );
}

function makePdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF"
  );
}

async function uploadDoc(
  page: Parameters<typeof signIn>[0],
  docType: string,
  file: Buffer,
  mimeType: string,
  filename: string,
) {
  const res = await page.request.post(`${BASE}/api/account/kyc/documents`, {
    multipart: {
      docType,
      file: { name: filename, mimeType, buffer: file },
    },
  });
  return { status: res.status(), body: await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 14 — KYC document upload @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gate ─────────────────────────────────────────────────────────────

  test("unauthenticated upload returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/account/kyc/documents`, {
      multipart: {
        docType: "front",
        file: { name: "id.jpg", mimeType: "image/jpeg", buffer: makeJpeg() },
      },
    });
    expect(res.status()).toBe(401);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  test("missing file field returns 400", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(`${BASE}/api/account/kyc/documents`, {
      multipart: { docType: "front" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/file/i);
  });

  test("invalid docType returns 400", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await uploadDoc(page, "selfie", makeJpeg(), "image/jpeg", "id.jpg");
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/docType/i);
  });

  test("unsupported MIME type returns 415", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await uploadDoc(
      page, "front",
      Buffer.from("fake csv"),
      "text/csv",
      "id.csv",
    );
    expect(status).toBe(415);
  });

  // ── Successful uploads ────────────────────────────────────────────────────

  test("valid JPEG front document upload returns 201 with storage path", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await uploadDoc(page, "front", makeJpeg(), "image/jpeg", "passport-front.jpg");

    expect(status).toBe(201);
    const b = body as { path: string };
    expect(typeof b.path).toBe("string");
    expect(b.path).toContain("front-");
    expect(b.path).toMatch(/\.jpg$/);
    console.log(`Uploaded front doc: ${b.path}`);
  });

  test("valid JPEG back document upload returns 201", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await uploadDoc(page, "back", makeJpeg(), "image/jpeg", "passport-back.jpg");
    expect(status).toBe(201);
    expect((body as { path: string }).path).toContain("back-");
  });

  test("valid PDF proof-of-address upload returns 201", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await uploadDoc(page, "address", makePdf(), "application/pdf", "utility-bill.pdf");
    expect(status).toBe(201);
    const b = body as { path: string };
    expect(b.path).toContain("address-");
    expect(b.path).toMatch(/\.pdf$/);
  });

  test("path follows {userId}/{docType}-{timestamp}.{ext} convention", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await uploadDoc(page, "front", makeJpeg(), "image/jpeg", "id.jpg");
    expect(status).toBe(201);

    const path = (body as { path: string }).path;
    // Should be {uuid}/{docType}-{timestamp}.{ext}
    expect(path).toMatch(/^[0-9a-f-]{36}\/front-\d+\.(jpg|jpeg|png|webp|pdf)$/);
  });

  // ── Any authenticated role can upload ─────────────────────────────────────

  test("funder can upload KYC documents", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await uploadDoc(page, "front", makeJpeg(), "image/jpeg", "id.jpg");
    expect(status).toBe(201);
  });

  test("admin can upload KYC documents", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await uploadDoc(page, "front", makeJpeg(), "image/jpeg", "id.jpg");
    expect(status).toBe(201);
  });

  // ── Path integrates with KYC submission ───────────────────────────────────

  test("uploaded path can be included in a KYC form submission", async ({ page }) => {
    await signIn(page, "funder");

    // Check if already approved — submission would be rejected
    const profile = await apiGet(page, "/api/account/kyc") as {
      profile: { kyc_status: string } | null;
    };
    const kycStatus = profile?.profile?.kyc_status;
    if (kycStatus === "approved") {
      console.log("Funder KYC already approved — skipping submission test");
      return;
    }

    // Upload a front document
    const { status: uploadStatus, body: uploadBody } = await uploadDoc(
      page, "front", makeJpeg(), "image/jpeg", "id-for-submission.jpg",
    );
    expect(uploadStatus).toBe(201);
    const { path } = uploadBody as { path: string };

    // Submit KYC with the document path
    const res = await page.request.post(`${BASE}/api/account/kyc`, {
      headers: { "Content-Type": "application/json" },
      data: {
        full_name: "Journey 14 Test User",
        date_of_birth: "1990-01-15",
        nationality: "GB",
        address_line1: "14 Journey Test Street",
        city: "London",
        postcode: "EC1A 1BB",
        document_type: "passport",
        document_number: "J14TEST123",
        document_expiry: "2030-12-31",
        source_of_funds: "Employment income",
        document_front_path: path,
      },
    });

    // Either 201 (submitted) or 409 (already under review) — both are valid
    expect([201, 409]).toContain(res.status());
  });

  // ── Admin can retrieve signed URLs for submitted documents ─────────────────

  test("admin compliance route returns signed URLs for KYC document paths", async ({ page }) => {
    await signIn(page, "admin");

    const data = await apiGet(page, "/api/admin/compliance/kyc") as {
      submissions: Array<{
        document_front_url: string | null;
        document_back_url: string | null;
        proof_of_address_url: string | null;
      }>;
    };

    expect(Array.isArray(data.submissions)).toBe(true);

    // Find any submission that has document paths
    const withDocs = data.submissions.find(
      (s) => s.document_front_url !== null || s.document_back_url !== null,
    );

    if (!withDocs) {
      console.log("No KYC submissions with document paths found — skipping signed URL check");
      return;
    }

    // Signed URLs should be https:// URLs
    if (withDocs.document_front_url) {
      expect(withDocs.document_front_url).toMatch(/^https?:\/\//);
    }
  });
});
