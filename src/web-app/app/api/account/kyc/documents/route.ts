/**
 * POST /api/account/kyc/documents
 *
 * Upload a KYC identity document to private Supabase Storage.
 * Returns the storage path to be included in the final KYC submission.
 *
 * Request: multipart/form-data
 *   file    — the document image or PDF
 *   docType — "front" | "back" | "address"
 *
 * Response: { path: string }
 *
 * Storage path convention: kyc-documents/{userId}/{docType}-{timestamp}.{ext}
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VALID_DOC_TYPES = new Set(["front", "back", "address"]);

export async function POST(req: NextRequest) {
  // ---- Auth ----
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ---- Parse multipart ----
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body." }, { status: 400 });
  }

  const file    = formData.get("file");
  const docType = formData.get("docType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing field: file" }, { status: 400 });
  }
  if (typeof docType !== "string" || !VALID_DOC_TYPES.has(docType)) {
    return NextResponse.json({ error: "docType must be one of: front, back, address" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and PDF files are accepted." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 413 });
  }

  // ---- Upload to storage ----
  const ext       = file.type === "application/pdf" ? "pdf" : file.name.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const path      = `${user.id}/${docType}-${timestamp}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from("kyc-documents")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[KYC documents] Upload failed:", uploadError.message);
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ path }, { status: 201 });
}
