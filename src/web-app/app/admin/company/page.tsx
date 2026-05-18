"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";

export default function AdminCompanyPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shure_company_settings");
      if (raw) {
        const d = JSON.parse(raw);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
        setAddress(d.address ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      localStorage.setItem("shure_company_settings", JSON.stringify({ name, email, phone, address }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { label: "Company name",      value: name,    set: setName,    placeholder: "Shure.Fund Ltd",               type: "text" },
    { label: "Contact email",     value: email,   set: setEmail,   placeholder: "info@company.com",              type: "email" },
    { label: "Phone",             value: phone,   set: setPhone,   placeholder: "+44 20 0000 0000",              type: "tel" },
    { label: "Registered address",value: address, set: setAddress, placeholder: "1 Finance Street, London EC1A", type: "text" },
  ] as const;

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link href="/" className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Dashboard
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Company settings</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Configure your organisation details used across reports and notifications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          {FIELDS.map(({ label, value, set, placeholder, type }) => (
            <div key={label}>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                {label}
              </label>
              <input
                type={type}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
                placeholder={placeholder}
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}

          {error && (
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {saved && (
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <p className="text-sm text-green-300">Settings saved.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
