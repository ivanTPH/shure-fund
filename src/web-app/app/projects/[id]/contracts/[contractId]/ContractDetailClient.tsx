"use client";

import Link from "next/link";
import { usePrototype } from "../../../../components/PrototypeProvider";
import MobileShell from "../../../../components/prototype/MobileShell";
import ActionCard from "../../../../components/prototype/ActionCard";
import PrimaryCTA from "../../../../components/prototype/PrimaryCTA";
import ContractSummaryCard from "../../../../components/prototype/ContractSummaryCard";
import NextActionPanel from "../../../../components/prototype/NextActionPanel";
import EvidenceGroup from "../../../../components/prototype/EvidenceGroup";
import StickyContractCTA from "../../../../components/prototype/StickyContractCTA";
import { getChecklistReadiness, getContractPrimaryHref, getContractWorkflowState, getEvidenceGroups } from "@/lib/contractWorkflow";
import { getApprovalReleaseRecord } from "@/lib/approvalReleaseData";
import { getDisputeByContract, getVariationByContract } from "@/lib/contractExceptionData";
import VariationSummaryCard from "../../../../components/prototype/VariationSummaryCard";
import DisputeBanner from "../../../../components/prototype/DisputeBanner";

export default function ContractDetailClient({
  projectId,
  contractId,
  source,
  taskId,
}: {
  projectId: string;
  contractId: string;
  source?: string;
  taskId?: string;
}) {
  const { getContract, getProject } = usePrototype();
  const project = getProject(projectId);
  const contract = getContract(projectId, contractId);

  if (!project || !contract) {
    return (
      <MobileShell title="Contract detail" subtitle="Contract not found in the current prototype." backHref="/">
        <ActionCard title="Prototype note" detail="Return to Projects and reopen a live contract card to continue the flow." />
      </MobileShell>
    );
  }

  const workflowState = getContractWorkflowState(contract);
  const evidenceGroups = getEvidenceGroups(contract);
  const checklist = getChecklistReadiness(contract);
  const primaryHref = getContractPrimaryHref(project, contract);
  const releaseRecord = getApprovalReleaseRecord(contract.id);
  const variation = getVariationByContract(project.id, contract.id);
  const dispute = getDisputeByContract(project.id, contract.id);
  const nextActionWhy =
    workflowState === "evidence_required"
      ? "Proof of work is still missing, so the package cannot move into sign-off yet."
      : workflowState === "ready_for_signoff"
        ? "The evidence pack is complete and the contract can now be sent into the approval route."
        : workflowState === "awaiting_approval"
          ? "The package is in the approval route and you can now monitor its progress."
          : workflowState === "available_to_release"
            ? "Approval is complete and the next release decision sits in the funds workflow."
            : "The contract pack needs a commercial review before it can move further.";

  return (
    <MobileShell
      title={contract.title}
      subtitle={`${project.name} · ${project.location}`}
      backHref={`/projects/${projectId}`}
    >
      {source === "action-feed" ? (
        <ActionCard eyebrow="Action feed" title="Opened from action queue" detail={taskId ? `You opened this contract from task ${taskId}. Continue the review from the contract workflow below.` : "You opened this contract from the action feed. Continue the review from the contract workflow below."} />
      ) : null}

      {variation ? (
        <div className="space-y-3">
          <VariationSummaryCard
            title={variation.title}
            summary={variation.status === "Awaiting funding confirmation" ? "Variation awaiting funding confirmation before it can activate against the live contract position." : variation.summary}
            valueImpact={variation.valueImpact}
            timeImpact={variation.timeImpact}
            status={variation.status}
          />
          <Link href={`/projects/${projectId}/contracts/${contractId}/variation/review`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
            Review variation
          </Link>
        </div>
      ) : null}

      {dispute ? (
        <div className="space-y-3">
          <DisputeBanner amount={dispute.disputedAmount} summary={dispute.issueSummary} />
          <Link href={`/projects/${projectId}/contracts/${contractId}/dispute`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
            Open dispute
          </Link>
        </div>
      ) : null}

      <ContractSummaryCard project={project} contract={contract} />

      <NextActionPanel
        title={contract.nextAction}
        why={nextActionWhy}
        cta={<PrimaryCTA href={primaryHref}>{contract.nextActionLabel}</PrimaryCTA>}
      />

      <ActionCard eyebrow="Delivery" title="Delivery and authority">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Supplier / delivery party" value={contract.supplier} />
          <Metric label="Submitted by" value={contract.submittedBy} />
          <Metric label="Current reviewer" value={contract.currentReviewer} />
          <Metric label="Next approver" value={contract.nextApprover} />
        </div>
      </ActionCard>

      <ActionCard eyebrow="Evidence hub" title="Proof of work" detail="Evidence is structured as proof of completion and readiness, not a generic file list.">
        <div className="space-y-4">
          {evidenceGroups.map(({ group, items }) => (
            <EvidenceGroup key={group} group={group} items={items} />
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/projects/${projectId}/contracts/${contractId}/evidence/upload`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
              Upload more
            </Link>
            <Link href={`/projects/${projectId}/contracts/${contractId}/evidence`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
              Open checklist
            </Link>
          </div>
        </div>
      </ActionCard>

      <ActionCard eyebrow="Files" title="Files" detail={`${contract.filesSummary.totalFiles} linked items, including package documents and submission files.`} />

      <ActionCard eyebrow="Comments" title="Comments" detail={contract.commentsPreview} />

      <Link href={`/projects/${projectId}/contracts/${contractId}/variation/request`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
        Raise variation
      </Link>

      {releaseRecord ? (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${projectId}/contracts/${contractId}/approval-chain`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
            Approval chain
          </Link>
          <Link href={`/projects/${projectId}/contracts/${contractId}/release`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
            Release decision
          </Link>
        </div>
      ) : null}

      <StickyContractCTA>
        <PrimaryCTA href={primaryHref}>
          {contract.nextActionLabel}
        </PrimaryCTA>
      </StickyContractCTA>

      {checklist.ready ? null : (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-neutral-300">
          {checklist.missing.length} required evidence item(s) are still missing before this contract can move forward.
        </div>
      )}
    </MobileShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
