"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../components/prototype/ActionCard";
import DecisionActionBar from "../../../../../components/prototype/DecisionActionBar";
import FundingStateBanner from "../../../../../components/prototype/FundingStateBanner";
import ReleaseSummaryCard from "../../../../../components/prototype/ReleaseSummaryCard";
import { getApprovalReleaseRecord } from "@/lib/approvalReleaseData";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ReleaseDecisionScreen({
  projectId,
  contractId,
}: {
  projectId: string;
  contractId: string;
}) {
  const { getProject, getContract } = usePrototype();
  const project = getProject(projectId);
  const contract = getContract(projectId, contractId);
  const record = getApprovalReleaseRecord(contractId);

  if (!project || !contract || !record) {
    return (
      <MobileShell title="Release decision" subtitle="Release context not found in the current prototype." backHref="/funds">
        <ActionCard title="Prototype note" detail="Return to Funds or the contract flow and reopen a live release decision." />
      </MobileShell>
    );
  }

  const explanation = record.releaseEligible
    ? "The approval chain is complete and the current releasable amount can now be released."
    : record.heldAmount > 0
      ? "Release cannot proceed in full because part of the approved value is held."
      : "Release cannot proceed yet because the approval chain is not complete.";

  return (
    <MobileShell title="Release decision" subtitle={`${contract.title} · ${project.name}`} backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <ActionCard eyebrow="Release summary" title={contract.title} detail={project.name}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Approved amount</p>
            <p className="mt-1 text-sm font-semibold text-white">{currency(contract.approvedValue || record.releasableAmount)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Funding state</p>
            <p className="mt-1 text-sm font-semibold text-white">{record.fundingState}</p>
          </div>
        </div>
      </ActionCard>

      <FundingStateBanner
        title={record.releaseEligible ? "Available to release" : record.fundingState}
        detail={explanation}
        tone={record.releaseEligible ? "positive" : "warning"}
      />

      <ReleaseSummaryCard record={record} title="Funding readiness" />

      <DecisionActionBar
        primary={
          record.releaseEligible ? (
            <Link
              href={`/projects/${projectId}/contracts/${contractId}/release/confirmation`}
              className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
            >
              Release payment
            </Link>
          ) : (
            <Link
              href="/funds"
              className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
            >
              View funding issue
            </Link>
          )
        }
        secondary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Back to contract
          </Link>
        }
      />
    </MobileShell>
  );
}
