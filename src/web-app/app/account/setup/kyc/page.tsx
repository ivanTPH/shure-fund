"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "status" | "personal" | "document" | "funds" | "review" | "submitted";

interface FormData {
  // Personal
  full_name:    string;
  date_of_birth: string;
  nationality:  string;
  address_line1: string;
  address_line2: string;
  city:         string;
  postcode:     string;
  country:      string;
  // Document
  document_type:   string;
  document_number: string;
  document_expiry: string;
  // Document uploads (storage paths, set after upload)
  document_front_path:   string;
  document_back_path:    string;
  proof_of_address_path: string;
  // Funds
  source_of_funds:  string;
  source_of_wealth: string;
}

const EMPTY: FormData = {
  full_name: "", date_of_birth: "", nationality: "",
  address_line1: "", address_line2: "", city: "", postcode: "", country: "GB",
  document_type: "passport", document_number: "", document_expiry: "",
  document_front_path: "", document_back_path: "", proof_of_address_path: "",
  source_of_funds: "", source_of_wealth: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({
  label, id, type = "text", value, onChange, required = false, placeholder,
  options,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; placeholder?: string;
  options?: { value: string; label: string }[];
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: "1px solid var(--surface-border, #e4e7f0)",
    borderRadius: "12px", fontSize: "14px",
    color: "var(--brand-navy, #0D1144)",
    backgroundColor: "#fff", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontSize: "13px", fontWeight: 600, color: "rgba(13,17,68,0.65)" }}>
        {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {options ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} required={required}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "personal", label: "Personal" },
    { key: "document", label: "Document" },
    { key: "funds",    label: "Funds" },
    { key: "review",   label: "Review" },
  ];
  const order = ["personal", "document", "funds", "review", "submitted"];
  const current = order.indexOf(step);

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "24px" }}>
      {steps.map((s, i) => {
        const isActive  = s.key === step;
        const isDone    = i < current;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700,
              backgroundColor: isDone ? "#059669" : isActive ? "#0D1144" : "#e4e7f0",
              color: (isDone || isActive) ? "#fff" : "rgba(13,17,68,0.4)",
            }}>
              {isDone ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 400, color: isActive ? "#0D1144" : "rgba(13,17,68,0.45)" }}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div style={{ width: "24px", height: "1px", backgroundColor: "#e4e7f0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KycPage() {
  const router = useRouter();
  const [step,    setStep]    = useState<Step>("status");
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState<"front" | "back" | "address" | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  function set(field: keyof FormData) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  async function uploadDocument(file: File, docType: "front" | "back" | "address") {
    setUploadingDoc(docType);
    setUploadErrors((e) => ({ ...e, [docType]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      const res = await fetch("/api/account/kyc/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrors((e) => ({ ...e, [docType]: data.error ?? "Upload failed." }));
        return;
      }
      const pathField: keyof FormData =
        docType === "front" ? "document_front_path" :
        docType === "back"  ? "document_back_path"  :
                              "proof_of_address_path";
      setForm((f) => ({ ...f, [pathField]: data.path }));
    } catch {
      setUploadErrors((e) => ({ ...e, [docType]: "Network error — please try again." }));
    } finally {
      setUploadingDoc(null);
    }
  }

  // Load existing KYC status
  useEffect(() => {
    fetch("/api/account/kyc")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile?.kyc_status && profile.kyc_status !== "not_started") {
          setExistingStatus(profile.kyc_status);
          setStep("submitted");
        } else {
          setStep("personal");
        }
        setLoading(false);
      })
      .catch(() => { setStep("personal"); setLoading(false); });
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        setSaving(false);
        return;
      }
      setExistingStatus("pending_review");
      setStep("submitted");
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setSaving(false);
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    border: "1px solid var(--surface-border, #e4e7f0)",
    borderRadius: "20px",
    padding: "24px",
  };

  const btnPrimary: React.CSSProperties = {
    backgroundColor: "#0D1144", color: "#fff",
    border: "none", borderRadius: "12px",
    padding: "12px 24px", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", width: "100%",
  };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: "#fff", color: "rgba(13,17,68,0.65)",
    border: "1px solid var(--surface-border, #e4e7f0)",
    borderRadius: "12px", padding: "12px 24px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "100%",
  };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f8fc" }}>
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-lg mx-auto space-y-4">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
              Identity Verification
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(13,17,68,0.5)" }}>
              Required to participate in project funding and token assignments.
            </p>
          </div>

          {/* Submitted / status view */}
          {step === "submitted" && (
            <div style={cardStyle}>
              {existingStatus === "pending_review" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "18px" }}>⏳</span>
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: "#0D1144" }}>Under review</p>
                      <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>Your KYC submission is being reviewed.</p>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: "rgba(13,17,68,0.55)", lineHeight: "1.6" }}>
                    You will be notified when your identity has been verified. This typically takes 1–2 business days.
                  </p>
                </>
              )}
              {existingStatus === "approved" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(5,150,105,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#059669", fontWeight: 700, fontSize: "18px" }}>✓</span>
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: "#059669" }}>Identity verified</p>
                      <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>Your KYC is approved. No further action required.</p>
                    </div>
                  </div>
                </>
              )}
              {existingStatus === "rejected" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "18px" }}>✕</span>
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: "#dc2626" }}>Verification unsuccessful</p>
                      <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>Your submission could not be verified. Contact support for assistance.</p>
                    </div>
                  </div>
                </>
              )}
              <button onClick={() => router.push("/account")} style={{ ...btnSecondary, marginTop: "16px" }}>
                Return to account
              </button>
            </div>
          )}

          {/* Step: Personal details */}
          {step === "personal" && (
            <div style={cardStyle}>
              <StepIndicator step="personal" />
              <h2 className="text-lg font-bold mb-4" style={{ color: "#0D1144" }}>Personal details</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <Field label="Full legal name" id="full_name" value={form.full_name} onChange={set("full_name")} required placeholder="As shown on your ID document" />
                <Field label="Date of birth" id="date_of_birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} required />
                <Field label="Nationality" id="nationality" value={form.nationality} onChange={set("nationality")} required placeholder="e.g. British" />
                <Field label="Address line 1" id="address_line1" value={form.address_line1} onChange={set("address_line1")} required placeholder="House number and street" />
                <Field label="Address line 2" id="address_line2" value={form.address_line2} onChange={set("address_line2")} placeholder="Optional" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="City" id="city" value={form.city} onChange={set("city")} required />
                  <Field label="Postcode" id="postcode" value={form.postcode} onChange={set("postcode")} required placeholder="e.g. SW1A 1AA" />
                </div>
                <Field
                  label="Country"
                  id="country"
                  value={form.country}
                  onChange={set("country")}
                  required
                  options={[
                    { value: "GB", label: "United Kingdom" },
                    { value: "IE", label: "Ireland" },
                    { value: "US", label: "United States" },
                    { value: "AU", label: "Australia" },
                    { value: "CA", label: "Canada" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>
              <button
                onClick={() => {
                  if (!form.full_name || !form.date_of_birth || !form.nationality || !form.address_line1 || !form.city || !form.postcode) {
                    setError("Please complete all required fields.");
                    return;
                  }
                  setError(null);
                  setStep("document");
                }}
                style={{ ...btnPrimary, marginTop: "20px" }}
              >
                Continue
              </button>
              {error && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "10px" }}>{error}</p>}
            </div>
          )}

          {/* Step: Document */}
          {step === "document" && (
            <div style={cardStyle}>
              <StepIndicator step="document" />
              <h2 className="text-lg font-bold mb-4" style={{ color: "#0D1144" }}>Identity document</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <Field
                  label="Document type"
                  id="document_type"
                  value={form.document_type}
                  onChange={set("document_type")}
                  required
                  options={[
                    { value: "passport",        label: "Passport" },
                    { value: "driving_licence", label: "Driving licence" },
                    { value: "national_id",     label: "National ID card" },
                  ]}
                />
                <Field label="Document number" id="document_number" value={form.document_number} onChange={set("document_number")} required placeholder="As shown on your document" />
                <Field label="Expiry date" id="document_expiry" type="date" value={form.document_expiry} onChange={set("document_expiry")} required />

                {/* Document uploads */}
                {(["front", "back", "address"] as const).map((dt) => {
                  const labels: Record<typeof dt, string> = {
                    front:   "Photo ID — front",
                    back:    "Photo ID — back (optional)",
                    address: "Proof of address (optional)",
                  };
                  const hints: Record<typeof dt, string> = {
                    front:   "Front of passport, driving licence or national ID.",
                    back:    "Back of card (if applicable).",
                    address: "Bank statement or utility bill dated within 3 months.",
                  };
                  const pathField: keyof FormData =
                    dt === "front" ? "document_front_path" :
                    dt === "back"  ? "document_back_path"  :
                                     "proof_of_address_path";
                  const uploaded = !!form[pathField];
                  const uploading = uploadingDoc === dt;
                  const err = uploadErrors[dt];

                  return (
                    <div key={dt}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(13,17,68,0.65)", marginBottom: "6px" }}>
                        {labels[dt]}
                        {dt === "front" && <span style={{ color: "#dc2626" }}> *</span>}
                      </p>
                      <p style={{ fontSize: "11px", color: "rgba(13,17,68,0.45)", marginBottom: "8px" }}>{hints[dt]}</p>

                      {uploaded ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "12px", backgroundColor: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)" }}>
                          <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
                          <span style={{ fontSize: "13px", color: "#059669", fontWeight: 600 }}>Uploaded</span>
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, [pathField]: "" }))}
                            style={{ marginLeft: "auto", fontSize: "12px", color: "rgba(13,17,68,0.45)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <label style={{ display: "block", cursor: uploading ? "not-allowed" : "pointer" }}>
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            padding: "12px 14px", borderRadius: "12px",
                            border: "1px dashed var(--surface-border, #e4e7f0)",
                            backgroundColor: "#fafbfc",
                            opacity: uploading ? 0.6 : 1,
                          }}>
                            {uploading ? (
                              <span style={{ fontSize: "13px", color: "rgba(13,17,68,0.5)" }}>Uploading…</span>
                            ) : (
                              <>
                                <span style={{ fontSize: "16px" }}>📎</span>
                                <span style={{ fontSize: "13px", color: "rgba(13,17,68,0.55)" }}>Choose file</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            disabled={uploading}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadDocument(file, dt);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                      {err && <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px" }}>{err}</p>}
                    </div>
                  );
                })}

                <p style={{ fontSize: "11px", color: "rgba(13,17,68,0.4)", lineHeight: "1.6" }}>
                  Files are encrypted and stored securely. Only compliance officers can access them.
                  JPEG, PNG, WebP and PDF accepted — max 10 MB each.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => { setError(null); setStep("personal"); }} style={btnSecondary}>Back</button>
                <button
                  onClick={() => {
                    if (!form.document_number || !form.document_expiry) {
                      setError("Please complete the document number and expiry date.");
                      return;
                    }
                    if (!form.document_front_path) {
                      setError("Please upload the front of your identity document.");
                      return;
                    }
                    setError(null);
                    setStep("funds");
                  }}
                  style={btnPrimary}
                >
                  Continue
                </button>
              </div>
              {error && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "10px" }}>{error}</p>}
            </div>
          )}

          {/* Step: Source of funds */}
          {step === "funds" && (
            <div style={cardStyle}>
              <StepIndicator step="funds" />
              <h2 className="text-lg font-bold mb-2" style={{ color: "#0D1144" }}>Source of funds</h2>
              <p className="text-sm mb-4" style={{ color: "rgba(13,17,68,0.5)" }}>
                UK regulations require us to understand the origin of funds used on this platform.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="source_of_funds" style={{ fontSize: "13px", fontWeight: 600, color: "rgba(13,17,68,0.65)" }}>
                    Source of funds <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    id="source_of_funds"
                    value={form.source_of_funds}
                    onChange={(e) => set("source_of_funds")(e.target.value)}
                    rows={3}
                    placeholder="e.g. Business income from property development company, investment returns, salary"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: "1px solid var(--surface-border, #e4e7f0)",
                      borderRadius: "12px", fontSize: "14px",
                      color: "var(--brand-navy, #0D1144)",
                      resize: "vertical", outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="source_of_wealth" style={{ fontSize: "13px", fontWeight: 600, color: "rgba(13,17,68,0.65)" }}>
                    Source of wealth <span style={{ fontSize: "11px", color: "rgba(13,17,68,0.4)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    id="source_of_wealth"
                    value={form.source_of_wealth}
                    onChange={(e) => set("source_of_wealth")(e.target.value)}
                    rows={2}
                    placeholder="e.g. Accumulated savings, inheritance, sale of property"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: "1px solid var(--surface-border, #e4e7f0)",
                      borderRadius: "12px", fontSize: "14px",
                      color: "var(--brand-navy, #0D1144)",
                      resize: "vertical", outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => { setError(null); setStep("document"); }} style={btnSecondary}>Back</button>
                <button
                  onClick={() => {
                    if (!form.source_of_funds.trim()) {
                      setError("Please describe the source of funds.");
                      return;
                    }
                    setError(null);
                    setStep("review");
                  }}
                  style={btnPrimary}
                >
                  Continue
                </button>
              </div>
              {error && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "10px" }}>{error}</p>}
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div style={cardStyle}>
              <StepIndicator step="review" />
              <h2 className="text-lg font-bold mb-4" style={{ color: "#0D1144" }}>Review and submit</h2>

              {[
                { label: "Full name",        value: form.full_name },
                { label: "Date of birth",    value: form.date_of_birth },
                { label: "Nationality",      value: form.nationality },
                { label: "Address",          value: [form.address_line1, form.address_line2, form.city, form.postcode, form.country].filter(Boolean).join(", ") },
                { label: "Document type",    value: form.document_type.replace(/_/g, " ") },
                { label: "Document number",  value: form.document_number },
                { label: "Document expiry",  value: form.document_expiry },
                { label: "ID uploaded",      value: form.document_front_path ? "✓ Front" + (form.document_back_path ? " + Back" : "") : "Front only" },
                { label: "Proof of address", value: form.proof_of_address_path ? "✓ Uploaded" : "Not provided" },
                { label: "Source of funds",  value: form.source_of_funds },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                  <span style={{ fontSize: "13px", color: "rgba(13,17,68,0.5)", minWidth: "140px" }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "#0D1144", fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
                </div>
              ))}

              {/* Declaration */}
              <div style={{ backgroundColor: "rgba(13,17,68,0.03)", borderRadius: "12px", padding: "14px", marginTop: "16px" }}>
                <p style={{ fontSize: "12px", color: "rgba(13,17,68,0.6)", lineHeight: "1.7" }}>
                  By submitting this form, I confirm that the information provided is accurate and complete. I understand that providing false information is a criminal offence under the Fraud Act 2006.
                </p>
              </div>

              {error && (
                <div style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "12px", padding: "12px", marginTop: "14px" }}>
                  <p style={{ fontSize: "13px", color: "#dc2626" }}>{error}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => { setError(null); setStep("funds"); }} style={btnSecondary} disabled={saving}>Back</button>
                <button onClick={handleSubmit} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }} disabled={saving}>
                  {saving ? "Submitting…" : "Submit for review"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
