"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../../components/prototype/ActionCard";
import DecisionActionBar from "../../../../../../components/prototype/DecisionActionBar";
import { getApprovalReleaseRecord } from "@/lib/approvalReleaseData";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ReleaseConfirmationScreen({
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
      <MobileShell title="Release confirmation" subtitle="Release confirmation not found in the current prototype." backHref="/funds">
        <ActionCard title="Prototype note" detail="Return to the funds flow and reopen a live release confirmation." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Release confirmation" subtitle="A calm confirmation that the approved payment has been released." backHref={`/projects/${projectId}/contracts/${contractId}/release`}>
      <ActionCard eyebrow="Released amount" title={currency(record.releasedAmount ?? record.releasableAmount)} detail="The approved amount has now moved through the release step in the prototype flow.">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Project</p>
            <p className="mt-1 text-sm font-semibold text-white">{project.name}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Contract</p>
            <p className="mt-1 text-sm font-semibold text-white">{contract.title}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Released by</p>
            <p className="mt-1 text-sm font-semibold text-white">{record.releasedBy ?? "Leah Mercer"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Timestamp</p>
            <p className="mt-1 text-sm font-semibold text-white">{record.releaseTimestamp ?? "11 Apr 2026, 14:10"}</p>
          </div>
        </div>
      </ActionCard>

      <DecisionActionBar
        primary={
          <Link
            href={`/projects/${projectId}/contracts/${contractId}`}
            className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
          >
            Return to contract
          </Link>
        }
        secondary={
          <Link
            href="/funds"
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            View funds
          </Link>
        }
      />
    </MobileShell>
  );
}
