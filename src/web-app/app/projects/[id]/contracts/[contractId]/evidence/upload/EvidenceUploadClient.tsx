"use client";

import Link from "next/link";
import { useState } from "react";

import { usePrototype } from "../../../../../../components/PrototypeProvider";
import MobileShell from "../../../../../../components/prototype/MobileShell";
import ActionCard from "../../../../../../components/prototype/ActionCard";
import PrimaryCTA from "../../../../../../components/prototype/PrimaryCTA";

const evidenceTypeOptions = [
  "Site photo",
  "Certificate",
  "Progress note",
  "Marked-up drawing",
  "Delivery note",
] as const;

export default function EvidenceUploadClient({
  projectId,
  contractId,
}: {
  projectId: string;
  contractId: string;
}) {
  const { getProject, getContract } = usePrototype();
  const project = getProject(projectId);
  const contract = getContract(projectId, contractId);
  const [evidenceType, setEvidenceType] = useState<(typeof evidenceTypeOptions)[number]>("Site photo");
  const [note, setNote] = useState("");

  if (!project || !contract) {
    return (
      <MobileShell title="Upload evidence" subtitle="Contract not found in the current prototype." backHref="/">
        <ActionCard title="Prototype note" detail="Return to the contract detail screen and reopen the evidence upload flow from a live contract." />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Upload evidence" subtitle={`${contract.title} · ${project.name}`} backHref={`/projects/${projectId}/contracts/${contractId}`}>
      <ActionCard eyebrow="Evidence upload" title="Submit proof of work" detail="Choose the evidence type, attach the proof placeholder, and add a note for the current package.">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Evidence type</span>
          <select
            value={evidenceType}
            onChange={(event) => setEvidenceType(event.target.value as (typeof evidenceTypeOptions)[number])}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          >
            {evidenceTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
          <p className="text-sm font-medium text-white">Upload / capture placeholder</p>
          <p className="mt-2 text-sm text-neutral-400">Attach a site photo, certificate, drawing, or delivery note in the live product.</p>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Evidence note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-500"
            placeholder="Add a short note about what has been uploaded and what it proves."
          />
        </label>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Linked contract</p>
          <p className="mt-2 text-sm font-medium text-white">{contract.title}</p>
          <p className="mt-1 text-sm text-neutral-400">{project.name}</p>
        </div>
      </ActionCard>

      <PrimaryCTA href={`/projects/${projectId}/contracts/${contractId}`}>
        Submit evidence
      </PrimaryCTA>

      <Link
        href={`/projects/${projectId}/contracts/${contractId}`}
        className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
      >
        Cancel
      </Link>
    </MobileShell>
  );
}
