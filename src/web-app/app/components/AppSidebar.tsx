"use client";

import React from "react";
import Link from "next/link";
import { BellDot, ClipboardCheck, CreditCard, FolderKanban, Home, Landmark, ReceiptText, ScrollText, Settings, Wallet } from "lucide-react";

export type AppShellView =
  | "home"
  | "projects"
  | "contracts"
  | "funding"
  | "reviews"
  | "approvals"
  | "payments"
  | "audit"
  | "settings";

type SidebarItem = {
  value: AppShellView;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const items: SidebarItem[] = [
  { value: "home", label: "Home", Icon: Home },
  { value: "projects", label: "Projects", Icon: FolderKanban },
  { value: "contracts", label: "Contracts", Icon: ReceiptText },
  { value: "funding", label: "Funding", Icon: Landmark },
  { value: "reviews", label: "Reviews", Icon: BellDot },
  { value: "approvals", label: "Approvals", Icon: ClipboardCheck },
  { value: "payments", label: "Payments", Icon: Wallet },
  { value: "audit", label: "Audit Log", Icon: ScrollText },
  { value: "settings", label: "Settings", Icon: Settings },
];

export function getAppShellHref(view: AppShellView) {
  switch (view) {
    case "home":
      return "/";
    case "projects":
      return "/projects";
    case "contracts":
      return "/contracts";
    case "funding":
      return "/funding";
    case "reviews":
      return "/reviews";
    case "approvals":
      return "/approvals";
    case "payments":
      return "/payments";
    case "audit":
      return "/audit-log";
    case "settings":
      return "/settings";
    default:
      return "/";
  }
}

type AppSidebarProps = {
  activeView: AppShellView;
  onChange?: (view: AppShellView) => void;
};

export default function AppSidebar({ activeView, onChange }: AppSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-neutral-800/80 bg-neutral-950/95 px-3 py-4">
      <div className="px-3 pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">Shure.Fund</div>
        <div className="mt-2 text-xl font-semibold text-neutral-50">Operating System</div>
        <div className="mt-1 text-sm text-neutral-500">Funding, approvals, and payment release in one place.</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ value, label, Icon }) => {
          const active = activeView === value;
          return (
            <Link
              key={value}
              href={getAppShellHref(value)}
              onClick={() => onChange?.(value)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ease-out ${
                active
                  ? "bg-blue-950/50 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.22)]"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
              }`}
            >
              <Icon size={18} className={active ? "text-blue-300" : "text-neutral-500"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-3 text-xs text-neutral-500">
        Every action is logged and saved to the record.
      </div>
    </aside>
  );
}
