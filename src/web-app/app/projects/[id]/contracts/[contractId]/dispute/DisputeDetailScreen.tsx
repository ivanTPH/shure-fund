"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../components/prototype/ActionCard";
import ReviewActionBar from "../../../../../components/prototype/ReviewActionBar";
import DisputeBanner from "../../../../../components/prototype/DisputeBanner";
import { getDisputeByContract } from "@/lib/contractExceptionData";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function DisputeDetailScreen({
  projectId,
  contractId,
}: {
  projectId: string;
  contractId: string;
}) {
  const { getProject, getContract } = usePrototype();
  const project = getProject(projectId);
  const contract = getContract(projectId, contractId);
  const dispute = getDisputeByContract(projectId, contractId);

  if (!project || !contract || !dispute) {
    return (
      <MobileShell title="Dispute detail" subtitle="Dispute not found in the current prototype." backHref={`/projects/${projectId}/contracts/${contractId}`}>
        <ActionCard title="Prototype note" detail="Return to the action feed or contract workflow and reopen a live dispute." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Dispute detail" subtitle="Review the affected value and why only part of the package is held." backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <ActionCard eyebrow="Contract context" title={contract.title} detail={project.name}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Disputed amount</p>
            <p className="mt-1 text-sm font-semibold text-white">{currency(dispute.disputedAmount)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Issue summary</p>
            <p className="mt-1 text-sm font-semibold text-white">Scope clarification needed</p>
          </div>
        </div>
      </ActionCard>

      <DisputeBanner amount={dispute.disputedAmount} summary={dispute.issueSummary} />

      <ActionCard eyebrow="Reason" title="Dispute reason" detail={dispute.disputeReason} />
      <ActionCard eyebrow="Supporting files" title="Linked support" detail={dispute.supportingFilesSummary} />
      <ActionCard eyebrow="Frozen value" title="Only the affected value is held" detail={dispute.frozenState} />

      <ReviewActionBar
        primary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
          >
            View related contract
          </Link>
        }
        secondary={
          <Link
            href="/notifications"
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Back to action feed
          </Link>
        }
      />
    </MobileShell>
  );
}
