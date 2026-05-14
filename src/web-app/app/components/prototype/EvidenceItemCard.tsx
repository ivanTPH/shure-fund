import type { EvidenceItem } from "@/lib/prototypeData";
import { mapUserToContact } from "@/lib/contactIdentity";

import ClickableAvatar from "./ClickableAvatar";

export default function EvidenceItemCard({
  item,
}: {
  item: EvidenceItem;
}) {
  const contact = mapUserToContact(item.uploadedBy, item.role);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--brand-aqua)]">{item.type}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">{item.timestamp}</p>
          <p className={`mt-2 text-[11px] font-semibold ${item.status === "Reviewed" ? "text-teal-50" : "text-neutral-300"}`}>{item.status}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-neutral-300">
        <ClickableAvatar contact={contact}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF0FF] text-xs font-semibold text-[#102345]">
              {contact.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
            </span>
            <p>{item.uploadedBy}</p>
          </div>
        </ClickableAvatar>
        <p className="text-neutral-500">{item.role}</p>
      </div>
    </div>
  );
}
