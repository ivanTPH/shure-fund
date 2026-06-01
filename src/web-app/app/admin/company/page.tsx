"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";

export default function AdminCompanyPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setName(d.settings.name ?? "");
          setEmail(d.settings.email ?? "");
          setPhone(d.settings.phone ?? "");
          setAddress(d.settings.address ?? "");
        }
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const r = await fetch("/api/admin/company", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, phone, address }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Could not save settings."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error — could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { label: "Company name",       value: name,    set: setName,    placeholder: "Shure.Fund Ltd",                type: "text"  },
    { label: "Contact email",      value: email,   set: setEmail,   placeholder: "info@company.com",              type: "email" },
    { label: "Phone",              value: phone,   set: setPhone,   placeholder: "+44 20 0000 0000",              type: "tel"   },
    { label: "Registered address", value: address, set: setAddress, placeholder: "1 Finance Street, London EC1A", type: "text"  },
  ] as const;

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8">
        <Link href="/" className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← Dashboard
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Company settings</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Configure your organisation details used across reports and notifications.
          </p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
            {FIELDS.map(({ label, value, set, placeholder, type }) => (
              <div key={label}>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
                  {label}
                </label>
                <input
                  type={type}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              </div>
            ))}

            {error && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}

            {saved && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)" }}>
                <p className="text-sm" style={{ color: "#059669" }}>Settings saved.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
