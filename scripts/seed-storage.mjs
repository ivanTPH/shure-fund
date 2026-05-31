/**
 * seed-storage.mjs
 *
 * Uploads placeholder PDF files to Supabase Storage so that evidence "View"
 * buttons work in the demo without 404 errors.
 *
 * Run AFTER `npx supabase db reset`:
 *   node scripts/seed-storage.mjs
 *
 * Requirements: @supabase/supabase-js installed (already in web-app/node_modules).
 */

// Uses native fetch (Node 18+) — no npm dependencies needed
const SUPABASE_URL     = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const BUCKET           = "evidence";

async function uploadToStorage(storagePath, content, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  contentType,
      "x-upsert":      "true",
    },
    body: content,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Minimal valid PDF generator
// Builds a 1-page PDF that displays a label using Helvetica.
// Byte offsets are computed at runtime — no hardcoded magic numbers.
// ---------------------------------------------------------------------------
function makePdf(label) {
  const safe = label.replace(/[()\\]/g, "\\$&").slice(0, 60);
  const streamContent = `BT /F1 14 Tf 50 720 Td (${safe}) Tj ET`;
  const streamLen     = Buffer.byteLength(streamContent, "utf8");

  const obj1 = "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
  const obj2 = "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
  const obj3 =
    "3 0 obj\n" +
    "<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n" +
    "  /Contents 4 0 R\n" +
    "  /Resources <</Font <</F1 5 0 R>>>>>>\n" +
    "endobj\n";
  const obj4 =
    `4 0 obj\n<</Length ${streamLen}>>\nstream\n` +
    streamContent +
    `\nendstream\nendobj\n`;
  const obj5 =
    "5 0 obj\n" +
    "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\n" +
    "endobj\n";

  const header = "%PDF-1.4\n";
  const objs   = [obj1, obj2, obj3, obj4, obj5];

  // Compute byte offset of each object
  const offsets = [];
  let pos = Buffer.byteLength(header, "utf8");
  for (const o of objs) {
    offsets.push(pos);
    pos += Buffer.byteLength(o, "utf8");
  }
  const xrefPos = pos;

  // xref section — each entry must be exactly 20 bytes: 10d SP 5d SP c SP LF
  const fmtOffset = (n) => String(n).padStart(10, "0");
  const xref = [
    "xref",
    "0 6",
    `0000000000 65535 f \n`,
    `${fmtOffset(offsets[0])} 00000 n \n`,
    `${fmtOffset(offsets[1])} 00000 n \n`,
    `${fmtOffset(offsets[2])} 00000 n \n`,
    `${fmtOffset(offsets[3])} 00000 n \n`,
    `${fmtOffset(offsets[4])} 00000 n \n`,
    "trailer\n<</Size 6 /Root 1 0 R>>\n",
    `startxref\n${xrefPos}\n%%EOF\n`,
  ].join("");

  return Buffer.from(header + objs.join("") + xref, "utf8");
}

// ---------------------------------------------------------------------------
// Files to seed — must match the file_url values in seed.sql
// ---------------------------------------------------------------------------
const SEED_FILES = [
  // Foundation stage (501)
  { stageId: "00000000-0000-0000-0000-000000000501", name: "foundation-inspection-photos.pdf", label: "Foundation Inspection Photos" },
  { stageId: "00000000-0000-0000-0000-000000000501", name: "foundation-pour-checklist.pdf",    label: "Concrete Pour Checklist" },
  // Frame stage (502)
  { stageId: "00000000-0000-0000-0000-000000000502", name: "steel-delivery-pack.pdf",          label: "Steel Delivery Pack" },
  { stageId: "00000000-0000-0000-0000-000000000502", name: "frame-erection-checklist.pdf",     label: "Frame Erection Checklist" },
  // Envelope stage (503)
  { stageId: "00000000-0000-0000-0000-000000000503", name: "facade-mockup-approval.pdf",       label: "Facade Mock-up Approval" },
  // Meridian shell (504)
  { stageId: "00000000-0000-0000-0000-000000000504", name: "shell-inspection-pack.pdf",        label: "Shell Inspection Pack" },
  { stageId: "00000000-0000-0000-0000-000000000504", name: "shell-quality-checklist.pdf",      label: "Shell Quality Checklist" },
  // Meridian MEP (505)
  { stageId: "00000000-0000-0000-0000-000000000505", name: "mep-test-pack.pdf",                label: "MEP Test Pack" },
  { stageId: "00000000-0000-0000-0000-000000000505", name: "mep-quality-checklist.pdf",        label: "MEP Quality Checklist" },
  // Harbour demolition (506)
  { stageId: "00000000-0000-0000-0000-000000000506", name: "demolition-completion-pack.pdf",   label: "Demolition Completion Pack" },
  { stageId: "00000000-0000-0000-0000-000000000506", name: "waste-segregation-checklist.pdf",  label: "Waste Segregation Checklist" },
  // Harbour facade (507)
  { stageId: "00000000-0000-0000-0000-000000000507", name: "facade-stabilisation-pack.pdf",    label: "Facade Stabilisation Pack" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let ok = 0;
let fail = 0;

for (const f of SEED_FILES) {
  const path = `${f.stageId}/${f.name}`;
  const content = makePdf(f.label);

  try {
    await uploadToStorage(path, content, "application/pdf");
    console.log(`✓  ${path}`);
    ok++;
  } catch (err) {
    console.error(`✗  ${path}  →  ${err.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} uploaded, ${fail} failed.`);
