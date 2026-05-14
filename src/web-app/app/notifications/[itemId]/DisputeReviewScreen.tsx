import Link from "next/link";

import type { ActionFeedItem } from "@/lib/actionFeedData";

import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import ReviewActionBar from "../../components/prototype/ReviewActionBar";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function DisputeReviewScreen({
  item,
}: {
  item: ActionFeedItem;
}) {
  return (
    <MobileShell title="Dispute review" subtitle="Review the blocked package and understand why value is currently frozen." backHref="/notifications">
      <ActionCard eyebrow="Dispute task" title={item.title} detail={item.projectName}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Disputed amount</p>
            <p className="mt-1 text-sm font-semibold text-white">{currency(item.disputedAmount ?? item.value)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Frozen value</p>
            <p className="mt-1 text-sm font-semibold text-amber-200">{currency(item.disputedAmount ?? item.value)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Dispute summary</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">{item.disputeSummary ?? item.summary}</p>
        </div>
      </ActionCard>

      <ActionCard eyebrow="Supporting files" title="Supporting files placeholder" detail="Inspection logs, variation notes, and commercial correspondence for this dispute will appear here." />
      <ActionCard eyebrow="Frozen value" title="Value is held pending clarification" detail="This package cannot progress to release until the disputed scope and held value are resolved." />

      <ReviewActionBar
        primary={
          <Link
            href={`/projects/${item.projectId}/contracts/${item.contractId}/dispute`}
            className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
          >
            View dispute details
          </Link>
        }
        secondary={
          <Link
            href={`/projects/${item.projectId}/contracts/${item.contractId}?source=action-feed&task=${item.id}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            View full contract
          </Link>
        }
      />
    </MobileShell>
  );
}
