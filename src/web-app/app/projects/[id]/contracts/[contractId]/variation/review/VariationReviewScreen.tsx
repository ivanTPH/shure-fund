"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../../components/prototype/ActionCard";
import ReviewActionBar from "../../../../../../components/prototype/ReviewActionBar";
import VariationSummaryCard from "../../../../../../components/prototype/VariationSummaryCard";
import { getVariationByContract } from "@/lib/contractExceptionData";

export default function VariationReviewScreen({
  projectId,
  contractId,
}: {
  projectId: string;
  contractId: string;
}) {
  const { getProject, getContract } = usePrototype();
  const project = getProject(projectId);
  const contract = getContract(projectId, contractId);
  const variation = getVariationByContract(projectId, contractId);

  if (!project || !contract || !variation) {
    return (
      <MobileShell title="Variation review" subtitle="Variation not found in the current prototype." backHref={`/projects/${projectId}/contracts/${contractId}`}>
        <ActionCard title="Prototype note" detail="Return to the contract and reopen a live variation to continue the review flow." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Variation review" subtitle="Review value, programme impact, and funding readiness before activation." backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <VariationSummaryCard
        title={variation.title}
        summary={variation.summary}
        valueImpact={variation.valueImpact}
        timeImpact={variation.timeImpact}
        status={variation.status}
      />

      <ActionCard eyebrow="Originating contract" title={contract.title} detail={project.name}>
        <div className="space-y-3">
          <InfoRow label="Reason and support" value={variation.support} />
          <InfoRow label="Funding check" value={variation.fundingCheckSummary} />
        </div>
      </ActionCard>

      <ReviewActionBar
        primary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
          >
            Approve variation
          </Link>
        }
        secondary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Return for amendment
          </Link>
        }
        tertiary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Reject variation
          </Link>
        }
      />
    </MobileShell>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}
