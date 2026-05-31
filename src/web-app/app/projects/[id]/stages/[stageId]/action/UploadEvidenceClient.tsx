"use client";

/**
 * Mobile-first evidence upload for contractors.
 *
 * - "Take photo" button opens the rear camera on mobile.
 * - "Choose file" for PDF / XLSX / images from the file system.
 * - Offline queue: if there's no signal, the file is base64-encoded and saved
 *   to localStorage.  When signal returns the queue is processed automatically.
 * - Max offline file size: 3 MB (localStorage quota guard).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceType =
  | "site_photo"
  | "certificate"
  | "progress_note"
  | "marked_up_drawing"
  | "delivery_note"
  | "other";

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  site_photo:        "Site photo",
  certificate:       "Certificate",
  progress_note:     "Progress note",
  marked_up_drawing: "Marked-up drawing",
  delivery_note:     "Delivery note",
  other:             "Other",
};

type QueuedItem = {
  id: string;
  stageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  evidenceType: EvidenceType;
  note: string;
  dataUrl: string;
  queuedAt: string;
};

// ---------------------------------------------------------------------------
// Offline queue helpers (localStorage)
// ---------------------------------------------------------------------------

const QUEUE_KEY = "shure_evidence_queue";
const OFFLINE_SIZE_LIMIT = 3 * 1024 * 1024; // 3 MB — localStorage guard

function readQueue(): QueuedItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // localStorage quota exceeded — nothing we can do silently
  }
}

function addToQueue(item: QueuedItem) {
  writeQueue([...readQueue(), item]);
}

function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, name: string, type: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type });
}

// ---------------------------------------------------------------------------
// Upload a single item via the evidence API
// ---------------------------------------------------------------------------

async function postEvidence(params: {
  stageId: string;
  file: File;
  evidenceType: EvidenceType;
  note: string;
}) {
  const { stageId, file, evidenceType, note } = params;
  const noteWithType = note.trim()
    ? `[${EVIDENCE_LABELS[evidenceType]}] ${note.trim()}`
    : `[${EVIDENCE_LABELS[evidenceType]}]`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("stageId", stageId);
  fd.append("note", noteWithType);

  const res = await fetch("/api/evidence", { method: "POST", body: fd });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "Upload failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UploadEvidenceClient({
  projectId,
  stageId,
  stageName,
}: {
  projectId: string;
  stageId: string;
  stageName?: string;
}) {
  const router = useRouter();

  // Form state
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("site_photo");
  const [note, setNote]                 = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; label: string; previewUrl: string | null }[]>([]);

  // Online / offline
  const [isOnline, setIsOnline]               = useState(true);
  const [queue, setQueue]                     = useState<QueuedItem[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Online / offline events + queue bootstrap
  // ---------------------------------------------------------------------------

  const processQueue = useCallback(async () => {
    const pending = readQueue();
    if (!pending.length || processingQueue) return;
    setProcessingQueue(true);

    for (const item of pending) {
      try {
        const file = await dataUrlToFile(item.dataUrl, item.fileName, item.fileType);
        await postEvidence({
          stageId: item.stageId,
          file,
          evidenceType: item.evidenceType,
          note: item.note,
        });
        removeFromQueue(item.id);
        setQueue((prev) => prev.filter((q) => q.id !== item.id));
      } catch {
        break; // Leave remainder in queue; retry on next online event
      }
    }
    setProcessingQueue(false);
  }, [processingQueue]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueue(readQueue());

    function onOnline() {
      setIsOnline(true);
      processQueue();
    }
    function onOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // File selection
  // ---------------------------------------------------------------------------

  function handleFileSelected(file: File) {
    setError(null);
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { setError("Pick a file first."); return; }

    setError(null);
    setUploading(true);

    // Offline path — save to queue
    if (!navigator.onLine) {
      if (selectedFile.size > OFFLINE_SIZE_LIMIT) {
        setError(
          `File is ${formatBytes(selectedFile.size)} — too large to save offline (max 3 MB). ` +
          "Get a signal and try again."
        );
        setUploading(false);
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(selectedFile);
        const item: QueuedItem = {
          id: crypto.randomUUID(),
          stageId,
          fileName:     selectedFile.name,
          fileSize:     selectedFile.size,
          fileType:     selectedFile.type,
          evidenceType,
          note,
          dataUrl,
          queuedAt: new Date().toISOString(),
        };
        addToQueue(item);
        setQueue((prev) => [...prev, item]);
        // Reset form for next file
        setSelectedFile(null);
        setPreviewUrl(null);
        setNote("");
        if (cameraRef.current) cameraRef.current.value = "";
        if (fileRef.current)   fileRef.current.value   = "";
      } catch {
        setError("Could not save to offline queue. Check available storage.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // Online path — upload directly
    try {
      await postEvidence({ stageId, file: selectedFile, evidenceType, note });
      setUploadedFiles((prev) => [...prev, {
        name: selectedFile.name,
        type: selectedFile.type,
        label: EVIDENCE_LABELS[evidenceType],
        previewUrl: selectedFile.type.startsWith("image/") ? previewUrl : null,
      }]);
      // Reset form for next file without navigating away
      setSelectedFile(null);
      setPreviewUrl(null);
      setNote("");
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current)   fileRef.current.value   = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const hasQueue = queue.length > 0;

  return (
    <AppShell>
      <div className="min-h-screen">

        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: "#fff", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}
        >
          <Link
            href={`/projects/${projectId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "var(--brand-navy, #0D1144)" }}
            aria-label="Back to project"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Upload evidence</p>
            {stageName && <p className="text-xs truncate" style={{ color: "rgba(13,17,68,0.45)" }}>{stageName}</p>}
          </div>
          {uploadedFiles.length > 0 && (
            <Link
              href={`/projects/${projectId}`}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
              style={{ border: "1px solid rgba(5,150,105,0.3)", backgroundColor: "rgba(5,150,105,0.08)", color: "#059669" }}
            >
              Done ({uploadedFiles.length} uploaded)
            </Link>
          )}
          {/* Signal indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isOnline ? "#059669" : "#dc2626" }}
            />
            <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.45)" }}>
              {isOnline ? "Online" : "No signal"}
            </span>
          </div>
        </div>

        {/* Offline queue banner */}
        {hasQueue && (
          <div
            className="mx-4 mt-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.25)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: "#d97706" }}>
                  {processingQueue
                    ? "Sending queued files…"
                    : `${queue.length} file${queue.length !== 1 ? "s" : ""} queued — waiting for signal`}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                  {isOnline && !processingQueue
                    ? "Signal restored — tap to send now"
                    : isOnline && processingQueue
                    ? "Uploading now…"
                    : "Will send automatically when back online"}
                </p>
              </div>
              {isOnline && !processingQueue && (
                <button
                  onClick={processQueue}
                  className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                  style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", color: "#d97706" }}
                >
                  Send now
                </button>
              )}
            </div>
            {/* Queue list */}
            <ul className="mt-2 space-y-1">
              {queue.map((q) => (
                <li key={q.id} className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.3)" }}>—</span>
                  <p className="flex-1 min-w-0 truncate text-xs" style={{ color: "rgba(13,17,68,0.7)" }}>{q.fileName}</p>
                  <span className="shrink-0 text-[10px]" style={{ color: "#d97706" }}>{EVIDENCE_LABELS[q.evidenceType]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="mx-4 mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1" style={{ color: "rgba(13,17,68,0.45)" }}>
              Added this session
            </p>
            {uploadedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(5,150,105,0.25)", backgroundColor: "rgba(5,150,105,0.05)" }}
              >
                {/* Thumbnail or file type block */}
                {f.previewUrl ? (
                  <img
                    src={f.previewUrl}
                    alt={f.name}
                    className="h-14 w-14 shrink-0 object-cover"
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: f.type === "application/pdf" ? "#dc2626" : f.type.includes("sheet") ? "#16a34a" : "#374151" }}
                  >
                    {f.type === "application/pdf" ? "PDF" : f.type.includes("sheet") ? "XLS" : "FILE"}
                  </div>
                )}
                <div className="min-w-0 flex-1 py-2 pr-3">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{f.name}</p>
                  <p className="text-[11px]" style={{ color: "#059669" }}>✓ {f.label} — uploaded</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-lg px-4 py-6 space-y-6"
        >

          {/* Evidence type grid */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Type of evidence
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(EVIDENCE_LABELS) as EvidenceType[]).map((type) => {
                const active = evidenceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEvidenceType(type)}
                    className="rounded-2xl px-3 py-2.5 text-left text-xs font-semibold transition active:scale-[0.97]"
                    style={
                      active
                        ? { backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.35)", color: "#2563eb" }
                        : { backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.5)" }
                    }
                  >
                    {EVIDENCE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              {uploadedFiles.length > 0 ? "Add another document" : "Attach file"}
            </p>

            {/* Hidden inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileInput}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx"
              className="hidden"
              onChange={onFileInput}
            />

            {selectedFile ? (
              /* Preview card */
              <div
                className="overflow-hidden rounded-2xl"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Selected file preview"
                    className="w-full max-h-64 object-cover"
                  />
                )}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ backgroundColor: "rgba(13,17,68,0.02)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{selectedFile.name}</p>
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); if (cameraRef.current) cameraRef.current.value = ""; if (fileRef.current) fileRef.current.value = ""; }}
                    className="shrink-0 text-xs transition hover:opacity-70"
                    style={{ color: "rgba(13,17,68,0.4)" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              /* Pick buttons — camera first (more prominent on mobile) */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-sm font-bold transition active:scale-[0.98]"
                  style={{ backgroundColor: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.25)", color: "#2563eb" }}
                >
                  <span className="text-xl">📷</span>
                  Take photo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition active:scale-[0.98]"
                  style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)" }}
                >
                  <span>📎</span>
                  Choose from files (PDF, XLSX, JPG)
                </button>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="ev-note" className="mb-2 block text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Note{" "}
              <span className="normal-case tracking-normal" style={{ color: "rgba(13,17,68,0.35)" }}>(optional)</span>
            </label>
            <textarea
              id="ev-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`What does this show? e.g. "First fix joists complete — inspector visited 14 May"`}
              rows={3}
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm focus:outline-none"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          {/* Offline notice when a file is selected */}
          {!isOnline && selectedFile && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#d97706" }}>No signal — will save to upload queue</p>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                {selectedFile.size > OFFLINE_SIZE_LIMIT
                  ? `This file (${formatBytes(selectedFile.size)}) is too large to save offline (max 3 MB). Get a signal to upload.`
                  : "Your file will be sent automatically when you're back online."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedFile || uploading || (!isOnline && !!selectedFile && selectedFile.size > OFFLINE_SIZE_LIMIT)}
            className="w-full rounded-2xl py-4 text-sm font-bold text-white transition disabled:opacity-40 active:scale-[0.98]"
            style={{
              backgroundColor: !isOnline ? "#d97706" : "var(--brand-navy, #0D1144)",
            }}
          >
            {uploading
              ? "Uploading…"
              : !isOnline
              ? "Save to upload queue"
              : uploadedFiles.length > 0
              ? "Add another document"
              : "Submit evidence"}
          </button>

          <Link
            href={`/projects/${projectId}`}
            className="block py-2 text-center text-sm transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.45)" }}
          >
            {uploadedFiles.length > 0 ? "Done — back to project" : "Cancel"}
          </Link>
        </form>
      </div>
    </AppShell>
  );
}
