"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("[ProjectsError]", error); }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="text-lg font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
          Failed to load projects
        </h2>
        <p className="mt-2 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
          There was a problem fetching your projects. Check your connection and try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            Retry
          </button>
          <Link
            href="/inbox"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ border: "1px solid #e4e7f0", color: "rgba(13,17,68,0.6)", backgroundColor: "#fff" }}
          >
            Go to inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
