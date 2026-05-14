"use client";

import { usePrototype } from "../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../components/prototype/ActionCard";
import ApprovalChainStep from "../../../../../components/prototype/ApprovalChainStep";
import ApprovalContextCard from "../../../../../components/prototype/ApprovalContextCard";
import { getApprovalReleaseRecord } from "@/lib/approvalReleaseData";

export default function ApprovalChainScreen({
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
      <MobileShell title="Approval chain" subtitle="Approval chain not found in the current prototype." backHref="/notifications">
        <ActionCard title="Prototype note" detail="Return to the contract and reopen the approval flow from a live package." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Approval chain" subtitle={`${contract.title} · ${project.name}`} backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <ApprovalContextCard record={record} />
      <ActionCard eyebrow="Approval sequence" title="Evidence → Validation → Approval → Release" detail="This chain shows what is complete, what is current, and what still remains before release.">
        <div className="space-y-3">
          {record.chain.map((step) => (
            <ApprovalChainStep key={step.id} step={step} />
          ))}
        </div>
      </ActionCard>
    </MobileShell>
  );
}
