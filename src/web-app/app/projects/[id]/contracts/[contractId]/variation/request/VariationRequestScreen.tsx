"use client";

import Link from "next/link";

import { usePrototype } from "../../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../../components/prototype/ActionCard";
import PrimaryCTA from "../../../../../../components/prototype/PrimaryCTA";
import { getVariationByContract } from "@/lib/contractExceptionData";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function VariationRequestScreen({
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

  if (!project || !contract) {
    return (
      <MobileShell title="Variation request" subtitle="Contract not found in the current prototype." backHref="/">
        <ActionCard title="Prototype note" detail="Return to Projects and reopen a live contract to raise a variation." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Variation request" subtitle="Capture value and time change before the variation can move into review." backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <ActionCard eyebrow="Contract context" title={contract.title} detail={project.name}>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Current contract value</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(contract.value)}</p>
        </div>
      </ActionCard>

      <ActionCard eyebrow="Variation detail" title={variation?.title ?? "New package adjustment"}>
        <Field label="Proposed variation title" value={variation?.title ?? "Temporary works adjustment"} />
        <Field label="Variation summary" value={variation?.summary ?? "Record the instructed change, why it is needed, and how it affects the live package."} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value impact" value={currency(variation?.valueImpact ?? 24000)} />
          <Field label="Time impact" value={variation?.timeImpact ?? "+5 days"} />
        </div>
      </ActionCard>

      <ActionCard eyebrow="Support" title="Supporting evidence and funding check">
        <Field label="Supporting evidence / files" value={variation?.support ?? "Upload drawings, supplier breakdown, and instruction notes for the proposed change."} />
        <Field label="Funding check summary" value={variation?.fundingCheckSummary ?? "Funding review placeholder for the proposed variation."} />
      </ActionCard>

      <PrimaryCTA href={`/projects/${projectId}/contracts/${contractId}/variation/review`}>Submit variation</PrimaryCTA>
      <Link href={`/projects/${projectId}/contracts/${contractId}`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
        Cancel
      </Link>
    </MobileShell>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}
