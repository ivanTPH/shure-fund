"use client";

import { useState, type ReactNode } from "react";

export default function DisclosureSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 text-sm font-semibold text-[#0B0F1A]">{title}</div>
        <span className="text-sm font-semibold text-[#667085]">{open ? "−" : "+"}</span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#E5E7EB] px-4 py-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
