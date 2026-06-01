import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "24px",
        backgroundColor: "#f7f8fc",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        <p style={{ margin: "0 0 8px", fontSize: "64px", fontWeight: 800, color: "#0D1144", opacity: 0.1 }}>
          404
        </p>
        <h1 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: "#0D1144" }}>
          Page not found
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(13,17,68,0.5)", lineHeight: 1.5 }}>
          This page doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link
          href="/projects"
          style={{
            display: "inline-block", padding: "12px 24px",
            borderRadius: "12px", backgroundColor: "#0D1144",
            color: "#fff", fontSize: "14px", fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to projects
        </Link>
      </div>
    </div>
  );
}
