"use client";

import { useState } from "react";

export default function ClarificationInput({
  recipientLabel,
  sectionLabel,
  onSend,
}: {
  recipientLabel?: string;
  sectionLabel?: string;
  onSend: (message: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-2xl border border-[#E6E8EC] bg-white p-4">
      <label className="block text-xs uppercase tracking-[0.16em] text-[#667085]">Clarification</label>
      {recipientLabel || sectionLabel ? (
        <p className="mt-2 text-sm text-[#667085]">
          {recipientLabel ? `Recipient: ${recipientLabel}` : null}
          {recipientLabel && sectionLabel ? " · " : null}
          {sectionLabel ? `Section: ${sectionLabel}` : null}
        </p>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add note (e.g. request certificate...)"
        className="mt-3 min-h-24 w-full rounded-2xl border border-[#E6E8EC] bg-[#F7F8FA] px-4 py-3 text-sm text-[#0B0F1A] outline-none placeholder:text-[#98A2B3]"
      />
      <button
        type="button"
        onClick={() => onSend(value.trim())}
        className="mt-3 w-full rounded-2xl bg-[#102345] px-4 py-3 text-sm font-semibold text-white"
      >
        Send clarification request
      </button>
    </div>
  );
}
