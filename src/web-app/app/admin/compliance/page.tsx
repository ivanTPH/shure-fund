"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceReview {
  id: string;
  created_at: string;
  resolved_at: string | null;
  rule_id: string;
  rule_label: string;
  risk_level: "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "escalated";
  entity_type: string;
  entity_id: string;
  context: Record<string, unknown> | null;
  reviewer_notes: string | null;
  triggered_by_user: { id: string; full_name: string; email: string; role: string } | null;
  reviewer_user: { id: string; full_name: string } | null;
}

interface KycSubmission {
  id: string;
  created_at: string;
  reviewed_at: string | null;
  status: "pending" | "approved" | "rejected";
  full_name: string;
  date_of_birth: string | null;
  nationality: string;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  document_type: string;
  document_number: string | null;
  document_expiry: string | null;
  source_of_funds: string;
  reviewer_notes: string | null;
  document_front_url:   string | null;
  document_back_url:    string | null;
  proof_of_address_url: string | null;
  user: { id: string; full_name: string; email: string; role: string; kyc_status: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  medium:   { bg: "rgba(217,119,6,0.08)",  color: "#d97706",  label: "Medium" },
  high:     { bg: "rgba(220,38,38,0.08)",   color: "#dc2626",  label: "High" },
  critical: { bg: "rgba(220,38,38,0.15)",   color: "#b91c1c",  label: "Critical" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(37,99,235,0.08)",   color: "#2563eb",  label: "Pending" },
  approved:  { bg: "rgba(5,150,105,0.08)",   color: "#059669",  label: "Approved" },
  rejected:  { bg: "rgba(220,38,38,0.08)",   color: "#dc2626",  label: "Rejected" },
  escalated: { bg: "rgba(124,58,237,0.08)",  color: "#7c3aed",  label: "Escalated" },
};

function Pill({ config }: { config: { bg: string; color: string; label: string } }) {
  return (
    <span style={{
      display: "inline-block",
      backgroundColor: config.bg, color: config.color,
      borderRadius: "9999px", padding: "2px 10px",
      fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {config.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Review action modal
// ---------------------------------------------------------------------------

function ReviewModal({
  review, onClose, onSaved,
}: {
  review: ComplianceReview | KycSubmission;
  type: "aml" | "kyc";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [action, setAction]  = useState<string>("");
  const [notes,  setNotes]   = useState("");
  const [saving, setSaving]  = useState(false);
  const [error,  setError]   = useState<string | null>(null);

  const isKyc = "full_name" in review;

  async function submit() {
    if (!action) { setError("Select an action."); return; }
    setSaving(true);
    setError(null);
    try {
      let res: Response;
      if (isKyc) {
        res = await fetch("/api/admin/compliance/kyc", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: review.id, status: action, reviewer_notes: notes }),
        });
      } else {
        res = await fetch(`/api/admin/compliance/${review.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action, reviewer_notes: notes }),
        });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Action failed."); setSaving(false); return; }
      onSaved();
      onClose();
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50, padding: "16px",
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: "#fff", borderRadius: "20px", padding: "24px",
    width: "100%", maxWidth: "480px",
    border: "1px solid var(--surface-border, #e4e7f0)",
  };

  const amlActions = [
    { value: "approved",  label: "Approve — allow action to proceed" },
    { value: "rejected",  label: "Reject — block action permanently" },
    { value: "escalated", label: "Escalate — pass to senior compliance" },
  ];
  const kycActions = [
    { value: "approved", label: "Approve — identity verified" },
    { value: "rejected", label: "Reject — identity not verified" },
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1" style={{ color: "#0D1144" }}>
          {isKyc ? "Review KYC submission" : "Review compliance flag"}
        </h3>
        {isKyc ? (
          <p className="text-sm mb-4" style={{ color: "rgba(13,17,68,0.5)" }}>
            {(review as KycSubmission).full_name} — {(review as KycSubmission).document_type.replace("_", " ")}
          </p>
        ) : (
          <p className="text-sm mb-4" style={{ color: "rgba(13,17,68,0.5)" }}>
            {(review as ComplianceReview).rule_label}
          </p>
        )}

        {/* Context / details */}
        {!isKyc && (review as ComplianceReview).context && (
          <div style={{ backgroundColor: "rgba(13,17,68,0.03)", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>Context</p>
            <pre style={{ fontSize: "11px", color: "rgba(13,17,68,0.7)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {JSON.stringify((review as ComplianceReview).context, null, 2)}
            </pre>
          </div>
        )}

        {isKyc && (() => {
          const k = review as KycSubmission;
          const address = [k.address_line1, k.city, k.postcode, k.country].filter(Boolean).join(", ");
          const rows = [
            { label: "Date of birth",    value: k.date_of_birth ?? "—" },
            { label: "Nationality",      value: k.nationality },
            { label: "Address",          value: address || "—" },
            { label: "Document type",    value: k.document_type.replace(/_/g, " ") },
            { label: "Document number",  value: k.document_number ?? "—" },
            { label: "Document expiry",  value: k.document_expiry ?? "—" },
            { label: "Source of funds",  value: k.source_of_funds },
          ];
          const docLinks = [
            { label: "ID front",        url: k.document_front_url },
            { label: "ID back",         url: k.document_back_url },
            { label: "Proof of address", url: k.proof_of_address_url },
          ].filter((d) => d.url);

          return (
            <>
              <div style={{ marginBottom: "16px", borderRadius: "12px", border: "1px solid var(--surface-border, #e4e7f0)", overflow: "hidden" }}>
                {rows.map(({ label, value }, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex", gap: "12px", padding: "8px 12px",
                      backgroundColor: i % 2 === 0 ? "#f7f8fc" : "#fff",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "rgba(13,17,68,0.45)", minWidth: "130px", flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: "12px", color: "#0D1144", wordBreak: "break-word" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Document download links */}
              {docLinks.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(13,17,68,0.45)", marginBottom: "8px" }}>
                    Uploaded documents
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {docLinks.map(({ label, url }) => (
                      <a
                        key={label}
                        href={url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          backgroundColor: "rgba(37,99,235,0.07)", color: "#2563eb",
                          border: "1px solid rgba(37,99,235,0.2)", textDecoration: "none",
                        }}
                      >
                        📄 {label}
                      </a>
                    ))}
                  </div>
                  <p style={{ marginTop: "6px", fontSize: "11px", color: "rgba(13,17,68,0.35)" }}>
                    Links expire in 1 hour. Reload the page if they stop working.
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <p style={{ fontSize: "12px", color: "#d97706" }}>No documents uploaded — applicant used the manual process.</p>
                </div>
              )}
            </>
          );
        })()}

        {/* Action select */}
        <div style={{ marginBottom: "12px" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "rgba(13,17,68,0.55)" }}>Decision</p>
          {(isKyc ? kycActions : amlActions).map((a) => (
            <label key={a.value} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", cursor: "pointer" }}>
              <input type="radio" name="action" value={a.value} checked={action === a.value} onChange={() => setAction(a.value)} />
              <span style={{ fontSize: "13px", color: "#0D1144" }}>{a.label}</span>
            </label>
          ))}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(13,17,68,0.55)" }}>
            Reviewer notes {action === "rejected" && <span style={{ color: "#dc2626" }}>*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Document your decision rationale..."
            style={{
              width: "100%", marginTop: "6px", padding: "10px 12px",
              border: "1px solid var(--surface-border, #e4e7f0)",
              borderRadius: "12px", fontSize: "13px", resize: "vertical", outline: "none",
            }}
          />
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "10px" }}>{error}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{ backgroundColor: "#fff", color: "rgba(13,17,68,0.6)", border: "1px solid var(--surface-border, #e4e7f0)", borderRadius: "12px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !action}
            style={{ backgroundColor: "#0D1144", color: "#fff", border: "none", borderRadius: "12px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: saving || !action ? "not-allowed" : "pointer", opacity: saving || !action ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CompliancePage() {
  const [tab,             setTab]             = useState<"aml" | "kyc">("aml");
  const [amlReviews,      setAmlReviews]      = useState<ComplianceReview[]>([]);
  const [kycSubmissions,  setKycSubmissions]  = useState<KycSubmission[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [statusFilter,    setStatusFilter]    = useState<string>("pending");
  const [kycFilter,       setKycFilter]       = useState<string>("pending");
  const [selected,        setSelected]        = useState<(ComplianceReview | KycSubmission) | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [amlRes, kycRes] = await Promise.all([
        fetch(`/api/admin/compliance?status=${statusFilter}`),
        fetch("/api/admin/compliance/kyc"),
      ]);
      if (!amlRes.ok) { setError("Failed to load compliance reviews."); setLoading(false); return; }
      const { reviews }     = await amlRes.json();
      const { submissions } = await kycRes.json();
      setAmlReviews(reviews ?? []);
      setKycSubmissions(submissions ?? []);
    } catch {
      setError("Network error loading compliance data.");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingAml = amlReviews.filter((r) => r.status === "pending").length;
  const pendingKyc = kycSubmissions.filter((s) => s.status === "pending").length;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    border: "1px solid var(--surface-border, #e4e7f0)",
    borderRadius: "20px",
  };

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                Compliance queue
              </h1>
              <p className="text-sm mt-1" style={{ color: "rgba(13,17,68,0.5)" }}>
                AML flags and KYC reviews awaiting decision.
              </p>
            </div>
            <Link
              href="/account"
              style={{ fontSize: "13px", color: "rgba(13,17,68,0.5)", textDecoration: "none" }}
            >
              ← Account
            </Link>
          </div>

          {/* Summary pills */}
          <div style={{ display: "flex", gap: "12px" }}>
            {pendingAml > 0 && (
              <div style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "12px", padding: "10px 16px" }}>
                <p style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700, textTransform: "uppercase" }}>AML flags</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "#dc2626" }}>{pendingAml}</p>
              </div>
            )}
            {pendingKyc > 0 && (
              <div style={{ backgroundColor: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: "12px", padding: "10px 16px" }}>
                <p style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>KYC pending</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "#2563eb" }}>{pendingKyc}</p>
              </div>
            )}
            {pendingAml === 0 && pendingKyc === 0 && (
              <div style={{ backgroundColor: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.15)", borderRadius: "12px", padding: "10px 16px" }}>
                <p style={{ fontSize: "13px", color: "#059669", fontWeight: 600 }}>All clear — no pending reviews.</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", borderRadius: "14px", padding: "4px" }}>
            {(["aml", "kyc"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "10px", border: "none",
                  backgroundColor: tab === t ? "#0D1144" : "transparent",
                  color: tab === t ? "#fff" : "rgba(13,17,68,0.5)",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
              >
                {t === "aml" ? `AML Flags${pendingAml > 0 ? ` (${pendingAml})` : ""}` : `KYC Reviews${pendingKyc > 0 ? ` (${pendingKyc})` : ""}`}
              </button>
            ))}
          </div>

          {/* AML filter */}
          {tab === "aml" && (
            <div style={{ display: "flex", gap: "8px" }}>
              {["pending", "approved", "rejected", "escalated", "all"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: "5px 12px", borderRadius: "9999px", border: "1px solid",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    backgroundColor: statusFilter === s ? "#0D1144" : "#fff",
                    color: statusFilter === s ? "#fff" : "rgba(13,17,68,0.5)",
                    borderColor: statusFilter === s ? "#0D1144" : "var(--surface-border, #e4e7f0)",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div style={cardStyle}>
              <p style={{ padding: "40px", textAlign: "center", color: "rgba(13,17,68,0.4)", fontSize: "14px" }}>Loading…</p>
            </div>
          )}

          {error && (
            <div style={{ ...cardStyle, padding: "16px", backgroundColor: "rgba(220,38,38,0.04)", borderColor: "rgba(220,38,38,0.2)" }}>
              <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>
            </div>
          )}

          {/* AML Reviews table */}
          {!loading && tab === "aml" && (
            <div style={cardStyle}>
              {amlReviews.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center" }}>
                  <p style={{ color: "rgba(13,17,68,0.4)", fontSize: "14px" }}>No {statusFilter} AML reviews.</p>
                </div>
              ) : (
                <div>
                  {amlReviews.map((review, i) => (
                    <div
                      key={review.id}
                      style={{
                        padding: "16px 20px",
                        borderBottom: i < amlReviews.length - 1 ? "1px solid var(--surface-border, #e4e7f0)" : "none",
                        cursor: review.status === "pending" ? "pointer" : "default",
                      }}
                      onClick={() => review.status === "pending" && setSelected(review)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <Pill config={RISK_STYLE[review.risk_level] ?? RISK_STYLE.medium} />
                            <Pill config={STATUS_STYLE[review.status] ?? STATUS_STYLE.pending} />
                          </div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: "#0D1144", marginBottom: "2px" }}>
                            {review.rule_label}
                          </p>
                          <p style={{ fontSize: "12px", color: "rgba(13,17,68,0.45)" }}>
                            {review.triggered_by_user
                              ? `${review.triggered_by_user.full_name} (${review.triggered_by_user.role})`
                              : "Unknown user"} · {fmtDate(review.created_at)}
                          </p>
                        </div>
                        {review.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(review); }}
                            style={{
                              backgroundColor: "#0D1144", color: "#fff",
                              border: "none", borderRadius: "10px",
                              padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                              cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KYC filter */}
          {tab === "kyc" && (
            <div style={{ display: "flex", gap: "8px" }}>
              {["pending", "approved", "rejected", "all"].map((s) => (
                <button
                  key={s}
                  onClick={() => setKycFilter(s)}
                  style={{
                    padding: "5px 12px", borderRadius: "9999px", border: "1px solid",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    backgroundColor: kycFilter === s ? "#0D1144" : "#fff",
                    color: kycFilter === s ? "#fff" : "rgba(13,17,68,0.5)",
                    borderColor: kycFilter === s ? "#0D1144" : "var(--surface-border, #e4e7f0)",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* KYC submissions */}
          {!loading && tab === "kyc" && (() => {
            const filtered = kycFilter === "all"
              ? kycSubmissions
              : kycSubmissions.filter((s) => s.status === kycFilter);
            return (
            <div style={cardStyle}>
              {filtered.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center" }}>
                  <p style={{ color: "rgba(13,17,68,0.4)", fontSize: "14px" }}>No {kycFilter} KYC submissions.</p>
                </div>
              ) : (
                <div>
                  {filtered.map((sub, i) => (
                    <div
                      key={sub.id}
                      style={{
                        padding: "16px 20px",
                        borderBottom: i < kycSubmissions.length - 1 ? "1px solid var(--surface-border, #e4e7f0)" : "none",
                        cursor: sub.status === "pending" ? "pointer" : "default",
                      }}
                      onClick={() => sub.status === "pending" && setSelected(sub)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <Pill config={STATUS_STYLE[sub.status] ?? STATUS_STYLE.pending} />
                            <span style={{ fontSize: "11px", color: "rgba(13,17,68,0.4)", textTransform: "uppercase", fontWeight: 600 }}>
                              {sub.document_type.replace("_", " ")}
                            </span>
                          </div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: "#0D1144", marginBottom: "2px" }}>
                            {sub.full_name}
                          </p>
                          <p style={{ fontSize: "12px", color: "rgba(13,17,68,0.45)" }}>
                            {sub.user?.email ?? "—"} · Submitted {fmtDate(sub.created_at)}
                          </p>
                        </div>
                        {sub.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(sub); }}
                            style={{
                              backgroundColor: "#0D1144", color: "#fff",
                              border: "none", borderRadius: "10px",
                              padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                              cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        </div>
      </div>

      {selected && (
        <ReviewModal
          review={selected}
          type={"full_name" in selected ? "kyc" : "aml"}
          onClose={() => setSelected(null)}
          onSaved={loadData}
        />
      )}
    </AppShell>
  );
}
