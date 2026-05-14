"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import AppChromeHeader from "./AppChromeHeader";

const tabs = [
  { label: "Notifications", href: "/notifications" },
  { label: "My work", href: "/" },
  { label: "Account", href: "/account" },
  { label: "Funds", href: "/funds" },
];

export default function MobileShell({
  title,
  subtitle,
  backHref,
  action,
  headerContent,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
  headerContent?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mobile-app-viewport text-[#0B0F1A]">
      <main className="mobile-app-frame flex flex-col">
        {headerContent ? (
          <header className="mb-4">{headerContent}</header>
        ) : (
          <header className="mb-5 space-y-4">
            <AppChromeHeader backHref={backHref} />
            {(title || subtitle || action) ? (
              <div className="px-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {title ? <h1 className="text-[1.85rem] font-semibold tracking-tight text-[#0B0F1A]">{title}</h1> : null}
                    {subtitle ? <p className="mt-2 max-w-[34ch] text-sm leading-6 text-[#667085]">{subtitle}</p> : null}
                  </div>
                  {action ? <div className="shrink-0">{action}</div> : null}
                </div>
              </div>
            ) : null}
          </header>
        )}

        <div className="flex-1 space-y-4">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E8EC] bg-[#FAFBFC]/95 backdrop-blur">
        <div className="mobile-app-bottom-nav">
          <div className="grid grid-cols-4 gap-1 rounded-[26px] border border-[#E6E8EC] bg-white p-1.5 shadow-[0_18px_40px_rgba(11,15,26,0.08)]">
            {tabs.map((tab) => {
              const active = pathname === tab.href || (tab.href === "/" && pathname.startsWith("/projects"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-[20px] px-2 py-2 text-center ${
                    active ? "bg-[#F2F7F6] text-[#102345]" : "text-[#667085]"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <BottomNavIcon label={tab.label} active={active} />
                    <span className={`text-[11px] font-semibold ${active ? "text-[#102345]" : "text-[#667085]"}`}>{tab.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

function BottomNavIcon({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  if (label === "Notifications") {
    return (
      <div className="relative h-7 w-7">
        <Image src="/brand/icons/Notifications.svg" alt="" fill className="object-contain" />
        <span className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${active ? "bg-[#71F3CB]" : "bg-[#A9F0DF]"}`} />
      </div>
    );
  }

  if (label === "My work") {
    return <Image src="/brand/icons/Contracts.svg" alt="" width={24} height={25} className={`h-6 w-6 object-contain ${active ? "" : "opacity-85"}`} />;
  }

  if (label === "Account") {
    return <Image src="/brand/icons/Account.svg" alt="" width={22} height={25} className={`h-6 w-6 object-contain ${active ? "" : "opacity-85"}`} />;
  }

  return <Image src="/brand/icons/Funds.svg" alt="" width={28} height={28} className={`h-7 w-7 object-contain ${active ? "" : "opacity-85"}`} />;
}
