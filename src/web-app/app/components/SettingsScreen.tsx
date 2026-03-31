"use client";

import React from "react";
import type { Role } from "@/lib/systemState";

type SettingsScreenProps = {
  currentRoleLabel: string;
  selectedRole: Role;
  roleOptions: Array<{ value: Role; label: string }>;
  onChangeRole: (role: Role) => void;
  onOpenContracts: () => void;
  onOpenAudit: () => void;
};

export default function SettingsScreen({
  currentRoleLabel,
  selectedRole,
  roleOptions,
  onChangeRole,
  onOpenContracts,
  onOpenAudit,
}: SettingsScreenProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Role and workspace</h2>
        <p className="mt-1 text-sm text-slate-500">Choose how you want to view the workflow and what should appear first.</p>
        <div className="mt-5 max-w-md">
          <label className="text-sm text-slate-600">
            Current role
            <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={selectedRole} onChange={(e) => onChangeRole(e.target.value as Role)}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Current context</div>
        <div className="mt-3 text-lg font-semibold text-slate-950">{currentRoleLabel}</div>
        <p className="mt-2 text-sm text-slate-500">Use these shortcuts when you need to change setup details or check the record.</p>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={onOpenContracts}>
            Open contracts
          </button>
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={onOpenAudit}>
            Open audit log
          </button>
        </div>
      </div>
    </section>
  );
}
