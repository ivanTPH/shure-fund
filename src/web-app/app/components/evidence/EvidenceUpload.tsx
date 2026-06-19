"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import FileViewerModal from "../FileViewerModal";
import { useToast } from "../ToastContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceItem = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number | null;
  signedUrl: string | null;
  uploadedAt: string;
  status: string;
  uploadedBy: { id: string; full_name: string; role: string } | null;
};

type Props = {
  stageId: string;
  /** When false the upload area is hidden (e.g. stage is past in_progress) */
  canUpload?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fileIcon(fileType: string): string {
  if (fileType === "application/pdf") return "PDF";
  if (fileType.startsWith("image/")) return "IMG";
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "XLS";
  return "FILE";
}

function fileIconColor(fileType: string): string {
  if (fileType === "application/pdf") return "#dc2626";
  if (fileType.startsWith("image/")) return "#0ea5e9";
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "#16a34a";
  return "#6b7280";
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.xlsx";
const MAX_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Sub-component: single evidence row
// ---------------------------------------------------------------------------

function EvidenceRow({ item, onView }: { item: EvidenceItem; onView: (url: string, name: string) => void }) {
  const iconColor = fileIconColor(item.fileType);
  const uploaderName = item.uploadedBy?.full_name ?? "Unknown";

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
    >
      {/* File type badge */}
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
        style={{ backgroundColor: iconColor }}
      >
        {fileIcon(item.fileType)}
      </div>

      <div className="min-w-0 flex-1">
        {/* Filename — clickable if signed URL available */}
        {item.signedUrl ? (
          <button
            onClick={() => onView(item.signedUrl!, item.name)}
            className="block truncate text-left text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--brand-navy, #0D1144)" }}
          >
            {item.name}
          </button>
        ) : (
          <p className="truncate text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{item.name}</p>
        )}

        <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
          {formatBytes(item.fileSize)} · {uploaderName} · {formatDate(item.uploadedAt)}
        </p>
      </div>

      {/* Status pill */}
      <span
        className="mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          backgroundColor: item.status === "accepted"
            ? "rgba(5,150,105,0.1)"
            : item.status === "rejected"
            ? "rgba(220,38,38,0.1)"
            : "rgba(13,17,68,0.06)",
          color: item.status === "accepted"
            ? "#059669"
            : item.status === "rejected"
            ? "#dc2626"
            : "rgba(13,17,68,0.5)",
        }}
      >
        {item.status === "requires_more" ? "More needed" : item.status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EvidenceUpload({ stageId, canUpload = true }: Props) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get current user role to gate upload UI
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setUserRole(user?.user_metadata?.role ?? null);
      });
  }, []);

  // Fetch evidence list
  const fetchEvidence = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/evidence?stageId=${stageId}`);
      const data = await res.json();
      setItems(data.evidence ?? []);
    } catch {
      // silently fail list load — upload can still work
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [stageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine if this user role is allowed to upload
  const uploadAllowed =
    canUpload && (userRole === "contractor" || userRole === "admin");

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PDF, JPG, PNG, and XLSX files are accepted.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 50 MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("stageId", stageId);

      const res = await fetch("/api/evidence", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }

      setItems((prev) => [...prev, data.evidence]);
      toast(`${file.name} uploaded`, "success");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-uploaded after an error
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <>
    <div className="space-y-3">
      {/* Upload area — only shown when upload is permitted for this role + stage */}
      {uploadAllowed && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={onFileInputChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={uploading}
            className="w-full rounded-2xl px-4 py-5 text-center transition-colors disabled:cursor-not-allowed"
            style={{
              border: `2px dashed ${dragOver ? "#0D1144" : "var(--surface-border, #e4e7f0)"}`,
              backgroundColor: dragOver ? "rgba(13,17,68,0.04)" : "rgba(13,17,68,0.02)",
            }}
          >
            {uploading ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>Uploading…</p>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>
                  {dragOver ? "Drop to upload" : "Upload evidence"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                  PDF, JPG, PNG, XLSX · max 50 MB
                </p>
              </>
            )}
          </button>

          {error && (
            <p
              className="mt-2 rounded-xl px-3 py-2 text-xs"
              style={{
                backgroundColor: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "#dc2626",
              }}
            >
              {error}
            </p>
          )}
        </div>
      )}

      {/* Evidence list */}
      {loadingList ? (
        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Loading evidence…</p>
      ) : items.length === 0 ? (
        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
          No evidence uploaded yet.
          {uploadAllowed
            ? " Upload files above to support this stage."
            : " Evidence must be uploaded before this stage can progress."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <EvidenceRow key={item.id} item={item} onView={(url, name) => setViewerFile({ url, name })} />
          ))}
        </div>
      )}
    </div>

    {viewerFile && (
      <FileViewerModal
        url={viewerFile.url}
        name={viewerFile.name}
        onClose={() => setViewerFile(null)}
      />
    )}
    </>
  );
}
