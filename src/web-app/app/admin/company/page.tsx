"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminCompanyPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage as a simple company settings store
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

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href="/" className="text-xs font-medium text-neutral-400 hover:text-white">← Dashboard</Link>

      <h1 className="mt-4 text-2xl font-bold text-white">Company settings</h1>
      <p className="mt-1 text-sm text-neutral-400">Configure your organisation details used across reports and notifications.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        {[
          { label: "Company name", value: name, set: setName, placeholder: "Shure.Fund Ltd" },
          { label: "Contact email", value: email, set: setEmail, placeholder: "info@company.com" },
          { label: "Phone", value: phone, set: setPhone, placeholder: "+44 20 0000 0000" },
          { label: "Registered address", value: address, set: setAddress, placeholder: "1 Finance Street, London EC1A 1AA" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              placeholder={placeholder}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </div>
        ))}

        {error && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
            Settings saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "#0d1144", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
