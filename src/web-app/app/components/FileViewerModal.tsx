"use client";

import { useEffect } from "react";

type Props = {
  url: string;
  name: string;
  onClose: () => void;
};

function fileKind(url: string, name: string): "image" | "pdf" | "other" {
  const lower = (name || url).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return "image";
  if (/\.pdf(\?|$)/.test(lower)) return "pdf";
  // Fallback: check URL path
  if (url.includes(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp)/.test(url)) return "image";
  return "other";
}

export default function FileViewerModal({ url, name, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const kind = fileKind(url, name);
  const displayName = name || url.split("/").pop() || "File";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header bar */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ backgroundColor: "rgba(13,17,68,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="flex-1 min-w-0 truncate text-sm font-medium text-white">{displayName}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:text-blue-300"
          style={{ border: "1px solid rgba(96,165,250,0.25)", backgroundColor: "rgba(96,165,250,0.08)" }}
        >
          Open full screen ↗
        </a>
        <button
          onClick={onClose}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 items-center justify-center p-4">
        {kind === "image" && (
          <img
            src={url}
            alt={displayName}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
        )}

        {kind === "pdf" && (
          <iframe
            src={url}
            title={displayName}
            className="h-full w-full rounded-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)", minHeight: "70vh" }}
          />
        )}

        {kind === "other" && (
          <div className="text-center space-y-4">
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              FILE
            </div>
            <p className="text-sm text-neutral-300">{displayName}</p>
            <p className="text-xs text-neutral-500">This file type cannot be previewed in-app.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition"
              style={{ backgroundColor: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)" }}
            >
              Download file ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
