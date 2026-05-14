/**
 * Evidence API
 *
 * GET  /api/evidence?stageId=<uuid>
 *   Returns all evidence records for a stage, with fresh signed URLs.
 *
 * POST /api/evidence  (multipart/form-data)
 *   Fields: file (File), stageId (string), packageId? (string)
 *   Uploads the file to Supabase Storage at evidence/{stageId}/{timestamp}-{filename}
 *   Creates an evidence DB record.
 *   Returns the created evidence item with a signed URL.
 *
 * No DELETE endpoint — evidence is immutable once submitted.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "evidence";
const SIGNED_URL_TTL = 3600; // 1 hour

// ---------------------------------------------------------------------------
// GET — list evidence for a stage
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stageId = request.nextUrl.searchParams.get("stageId");
  if (!stageId) return NextResponse.json({ error: "Missing stageId" }, { status: 400 });

  const service = createServiceClient();

  const { data, error } = await service
    .from("evidence")
    .select(`
      id, stage_id, package_id, file_url, file_type, name, file_size,
      uploaded_at, status, notes,
      uploader:users!uploaded_by ( id, full_name, role )
    `)
    .eq("stage_id", stageId)
    .order("uploaded_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate fresh signed URLs for each record
  const evidence = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await service.storage
        .from(BUCKET)
        .createSignedUrl(row.file_url, SIGNED_URL_TTL);

      return {
        id: row.id,
        stageId: row.stage_id,
        packageId: row.package_id,
        name: row.name ?? row.file_url.split("/").pop() ?? "file",
        fileType: row.file_type,
        fileSize: row.file_size ?? null,
        signedUrl: signed?.signedUrl ?? null,
        uploadedAt: row.uploaded_at,
        status: row.status,
        notes: row.notes,
        uploadedBy: Array.isArray(row.uploader) ? row.uploader[0] : row.uploader,
      };
    }),
  );

  return NextResponse.json({ evidence });
}

// ---------------------------------------------------------------------------
// POST — upload a new evidence file
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  const stageId = form.get("stageId") as string | null;
  const packageId = form.get("packageId") as string | null;

  if (!file || !stageId) {
    return NextResponse.json({ error: "Missing file or stageId" }, { status: 400 });
  }

  // 3. Validate file type
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPG, PNG, and XLSX files are accepted." },
      { status: 400 },
    );
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 50 MB." }, { status: 400 });
  }

  const service = createServiceClient();

  // 4. Ensure the uploader has a profile row (FK constraint on evidence.uploaded_by)
  const meta = user.user_metadata ?? {};
  await service.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: meta.full_name ?? user.email?.split("@")[0] ?? "Unknown",
      role: meta.role ?? "contractor",
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  // 5. Upload to Supabase Storage
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${stageId}/${timestamp}-${safeName}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // 6. Create evidence DB record
  const { data: record, error: insertError } = await service
    .from("evidence")
    .insert({
      stage_id: stageId,
      package_id: packageId ?? null,
      file_url: storagePath,
      file_type: file.type,
      name: file.name,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select(`
      id, stage_id, package_id, file_url, file_type, name, file_size,
      uploaded_at, status,
      uploader:users!uploaded_by ( id, full_name, role )
    `)
    .single();

  if (insertError || !record) {
    // Clean up the uploaded file if DB insert failed
    await service.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: `Database error: ${insertError?.message}` },
      { status: 500 },
    );
  }

  // 7. Generate signed URL for the response
  const { data: signed } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  return NextResponse.json({
    evidence: {
      id: record.id,
      stageId: record.stage_id,
      packageId: record.package_id,
      name: record.name ?? file.name,
      fileType: record.file_type,
      fileSize: record.file_size,
      signedUrl: signed?.signedUrl ?? null,
      uploadedAt: record.uploaded_at,
      status: record.status,
      uploadedBy: Array.isArray(record.uploader) ? record.uploader[0] : record.uploader,
    },
  });
}
