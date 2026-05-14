import type { EvidenceItem } from "@/lib/prototypeData";
import { mapUserToContact } from "@/lib/contactIdentity";

import ClickableAvatar from "./ClickableAvatar";

export default function EvidenceItemRow({
  item,
}: {
  item: EvidenceItem;
}) {
  const contact = mapUserToContact(item.uploadedBy, item.role);

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--brand-aqua)]">{item.type}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.status === "Reviewed" ? "bg-teal-500/15 text-teal-50" : "bg-white/8 text-neutral-300"}`}>
          {item.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-neutral-300">
        <ClickableAvatar contact={contact}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF0FF] text-xs font-semibold text-[#102345]">
              {contact.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
            </span>
            <p>{item.uploadedBy} · {item.role}</p>
          </div>
        </ClickableAvatar>
        <p className="text-neutral-500">{item.timestamp}</p>
      </div>
    </div>
  );
}
