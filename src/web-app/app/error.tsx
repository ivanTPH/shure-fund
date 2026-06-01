"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error monitoring service here (e.g. Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#f7f8fc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
            <div
              style={{
                width: "64px", height: "64px", borderRadius: "16px",
                backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: "28px",
              }}
            >
              ⚠
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: "#0D1144" }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(13,17,68,0.55)", lineHeight: 1.5 }}>
              An unexpected error occurred. If this keeps happening, contact support.
            </p>
            {error.digest && (
              <p style={{ margin: "0 0 20px", fontSize: "11px", color: "rgba(13,17,68,0.3)", fontFamily: "monospace" }}>
                Reference: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  padding: "10px 20px", borderRadius: "12px", fontSize: "14px",
                  fontWeight: 600, cursor: "pointer", border: "1px solid #0D1144",
                  backgroundColor: "#0D1144", color: "#fff",
                }}
              >
                Try again
              </button>
              <Link
                href="/projects"
                style={{
                  padding: "10px 20px", borderRadius: "12px", fontSize: "14px",
                  fontWeight: 600, border: "1px solid #e4e7f0",
                  backgroundColor: "#fff", color: "rgba(13,17,68,0.7)",
                  textDecoration: "none", display: "inline-block",
                }}
              >
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
