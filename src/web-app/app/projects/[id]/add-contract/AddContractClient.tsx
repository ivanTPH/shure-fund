"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { usePrototype } from "../../../components/PrototypeProvider";
import MobileShell from "../../../components/prototype/MobileShell";
import ActionCard from "../../../components/prototype/ActionCard";

export default function AddContractClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { addContract, getProject } = usePrototype();
  const project = getProject(projectId);
  const [form, setForm] = useState({
    title: "",
    scopeSummary: "",
    startDate: "",
    endDate: "",
    value: "",
    supplier: "",
    authority: "",
    attachments: "Scope summary\nDraft subcontract",
  });
  const [showDates, setShowDates] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  if (!project) {
    return (
      <MobileShell title="Add contract" subtitle="Project not found in the current prototype.">
        <ActionCard title="Prototype note" detail="Return to Projects and reopen the contract flow from the live mock portfolio." />
      </MobileShell>
    );
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    addContract({
      projectId,
      contract: {
        title: form.title || "New contract",
        scopeSummary: form.scopeSummary || "Scope summary to be confirmed.",
        startDate: form.startDate || "2026-04-10",
        endDate: form.endDate || "2026-05-10",
        value: Number(form.value || 0),
        supplier: form.supplier || "Supplier pending",
        authority: form.authority || "Commercial Manager",
        attachmentsSummary: form.attachments
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    });

    router.push(`/projects/${projectId}`);
  }

  return (
    <MobileShell
      title="Add contract"
      subtitle={`Set up a new contract under ${project.name} and move it straight into the workflow.`}
      backHref={`/projects/${projectId}`}
      action={
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(16,185,129,0.18)]"
        >
          Save
        </button>
      }
    >
      <ActionCard eyebrow="Guided setup" title="Start with the contract identity" detail="Capture the commercial basics first. This prototype keeps everything local in the browser.">
        <div className="space-y-4">
          <Field label="Contract name">
            <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className={inputClassName} placeholder="Steel frame package" />
          </Field>
          <Field label="Scope summary">
            <textarea
              value={form.scopeSummary}
              onChange={(event) => updateField("scopeSummary", event.target.value)}
              className={`${inputClassName} min-h-28 resize-none`}
              placeholder="Primary supply, install, and completion pack."
            />
          </Field>
        </div>
      </ActionCard>

      <ActionCard eyebrow="Commercial detail" title="Programme and contract value">
        <div className="space-y-4">
          <Field label="Value">
            <input value={form.value} onChange={(event) => updateField("value", event.target.value)} className={inputClassName} placeholder="390000" />
          </Field>
          <DisclosureButton
            title="Dates"
            summary="Tap to edit programme dates"
            open={showDates}
            onToggle={() => setShowDates((current) => !current)}
          />
          {showDates ? (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <Field label="Start date">
                <input value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} className={inputClassName} placeholder="2026-05-01" />
              </Field>
              <Field label="End date">
                <input value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} className={inputClassName} placeholder="2026-08-20" />
              </Field>
            </div>
          ) : null}
        </div>
      </ActionCard>

      <ActionCard eyebrow="Permissions" title="Authority and permissions">
        <div className="space-y-4">
          <Field label="Supplier">
            <input value={form.supplier} onChange={(event) => updateField("supplier", event.target.value)} className={inputClassName} placeholder="Northline Structures Ltd" />
          </Field>
          <DisclosureButton
            title="Assign permissions"
            summary="Tap to reveal authority controls"
            open={showPermissions}
            onToggle={() => setShowPermissions((current) => !current)}
          />
          {showPermissions ? (
            <div className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <Field label="Authority">
                <input value={form.authority} onChange={(event) => updateField("authority", event.target.value)} className={inputClassName} placeholder="Commercial Director" />
              </Field>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#667085]">
                Contract permissions will be assigned after setup and can be refined inside the live workflow.
              </div>
            </div>
          ) : null}
        </div>
      </ActionCard>

      <ActionCard eyebrow="Files" title="Attachments summary" detail="List the opening pack that should travel with the contract.">
        <div className="space-y-4">
          <DisclosureButton
            title="Opening file pack"
            summary="Tap to edit files and evidence"
            open={showFiles}
            onToggle={() => setShowFiles((current) => !current)}
          />
          {showFiles ? (
            <Field label="Attachments summary">
              <textarea
                value={form.attachments}
                onChange={(event) => updateField("attachments", event.target.value)}
                className={`${inputClassName} min-h-28 resize-none`}
                placeholder="One item per line"
              />
            </Field>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-[#10B981] px-4 py-3 text-sm font-semibold text-white"
          >
            Save and return to project
          </button>
        </div>
      </ActionCard>
    </MobileShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0B0F1A] placeholder:text-[#98A2B3]";

function DisclosureButton({
  title,
  summary,
  open,
  onToggle,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-left"
    >
      <div>
        <p className="text-sm font-semibold text-[#0B0F1A]">{title}</p>
        <p className="mt-1 text-xs text-[#667085]">{summary}</p>
      </div>
      <span className="text-sm font-semibold text-[#102345]">{open ? "Hide" : "Show"}</span>
    </button>
  );
}
