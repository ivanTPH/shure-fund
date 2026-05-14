import type { EvidenceGroup as EvidenceGroupType, EvidenceItem } from "@/lib/prototypeData";

import SectionHeader from "./SectionHeader";
import EvidenceItemRow from "./EvidenceItemRow";

export default function EvidenceGroup({
  group,
  items,
}: {
  group: EvidenceGroupType;
  items: EvidenceItem[];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader eyebrow="Evidence" title={group} />
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <EvidenceItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-400">
          No {group.toLowerCase()} submitted yet.
        </div>
      )}
    </section>
  );
}
