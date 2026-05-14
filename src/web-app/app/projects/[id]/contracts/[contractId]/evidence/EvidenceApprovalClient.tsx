"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../components/prototype/ActionCard";
import ChecklistItem from "../../../../../components/prototype/ChecklistItem";
import PrimaryCTA from "../../../../../components/prototype/PrimaryCTA";
import { getChecklistReadiness } from "@/lib/contractWorkflow";

export default function EvidenceApprovalClient({
  projectId,
  contractId,
}: {
  projectId: string;
  contractId: string;
}) {
  const { getContract } = usePrototype();
  const contract = getContract(projectId, contractId);

  if (!contract) {
    return (
      <MobileShell title="Evidence checklist" subtitle="Contract not found in the current prototype." backHref="/">
        <ActionCard title="Prototype note" detail="Return to the contract detail screen and reopen evidence from a live contract." />
      </MobileShell>
    );
  }

  const checklist = getChecklistReadiness(contract);

  return (
    <MobileShell
      title="Evidence checklist"
      subtitle={contract.title}
      backHref={`/projects/${projectId}/contracts/${contractId}`}
    >
      <ActionCard eyebrow="Required evidence" title="Evidence readiness" detail={checklist.ready ? "The required proof is in place and the package can move into sign-off." : "Some required proof is still missing, so sign-off cannot be requested yet."}>
        <div className="space-y-2">
          {contract.checklist.map((item) => (
            <ChecklistItem key={item.id} label={item.label} done={item.done} />
          ))}
        </div>
      </ActionCard>

      <div className="grid grid-cols-2 gap-3">
        <ActionCard eyebrow="Submitted evidence" title={`${checklist.submitted.length} items ready`}>
          <p className="text-sm leading-6 text-neutral-300">Proof already submitted and available for review.</p>
        </ActionCard>
        <ActionCard eyebrow="Missing evidence" title={`${checklist.missing.length} items missing`}>
          <p className="text-sm leading-6 text-neutral-300">Outstanding evidence still blocks the next sign-off step.</p>
        </ActionCard>
      </div>

      <ActionCard eyebrow="Checklist result" title={checklist.ready ? "Ready to request sign-off" : "Evidence still outstanding"} detail={checklist.ready ? "All required evidence is in place. The package can move into sign-off." : "Upload the missing evidence items below before you request sign-off."} />

      <PrimaryCTA href={checklist.ready ? `/projects/${projectId}/contracts/${contractId}` : `/projects/${projectId}/contracts/${contractId}/evidence/upload`}>
        {checklist.ready ? "Request sign-off" : "Upload missing evidence"}
      </PrimaryCTA>

      <Link
        href={`/projects/${projectId}/contracts/${contractId}`}
        className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
      >
        Return to contract
      </Link>
    </MobileShell>
  );
}
