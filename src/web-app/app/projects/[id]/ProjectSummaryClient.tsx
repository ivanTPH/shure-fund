"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { usePrototype } from "../../components/PrototypeProvider";
import MobileShell from "../../components/prototype/MobileShell";
import { deriveContractWorkflowState, deriveProjectWorkflowState, type UnifiedWorkflowControl } from "@/lib/workflowState";

export default function ProjectSummaryClient({ projectId }: { projectId: string }) {
  const { getProject } = usePrototype();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const userRole = "treasury";
  const project = getProject(projectId);

  const projectWorkflow = useMemo(() => project ? deriveProjectWorkflowState(project, userRole) : null, [project]);

  const toggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const markAction = useCallback((id: string, label: string) => {
    setActionNote((current) => ({
      ...current,
      [id]: `${label} queued inline for this project contract.`,
    }));
  }, []);

  if (!project || !projectWorkflow) {
    return (
      <MobileShell title="Project summary" subtitle="Project not found in the current prototype." backHref="/">
        <section className="rounded-[22px] border border-[#E6E8EC] bg-white px-4 py-6 text-sm text-[#667085]">
          Return to Projects and reopen a live project to continue.
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title={project.name}
      subtitle={`${project.location} · contract-led workflow`}
      backHref="/"
      action={
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/audit`} className="rounded-full border border-[#D7DBE2] bg-white px-4 py-2.5 text-sm font-semibold text-[#102345] hover:border-[#A8B3C7]">
            Audit trail
          </Link>
          <Link href={`/projects/${project.id}/add-contract`} className="rounded-full border border-[#102345] bg-[#102345] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] hover:border-[#1D4ED8]">
            Add contract
          </Link>
        </div>
      }
    >
      <section className="rounded-[22px] border border-[#E6E8EC] bg-white">
        <div className="border-b border-[#E6E8EC] px-4 py-4">
          <p className="text-sm font-semibold text-[#0B0F1A]">{projectWorkflow.dominantAction}</p>
          <p className="mt-2 text-sm leading-6 text-[#4B5565]">{projectWorkflow.reason}</p>
          <p className="mt-2 text-xs font-medium text-[#667085]">Required actor: {projectWorkflow.requiredActor}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#102345]">
            {[...projectWorkflow.primaryActions, ...projectWorkflow.secondaryActions].map((action) => (
              <WorkflowActionButton key={action.key} action={action} onPress={() => markAction(project.id, action.label)} />
            ))}
          </div>
          {actionNote[project.id] ? <p className="mt-3 text-xs text-[#667085]">{actionNote[project.id]}</p> : null}
        </div>

        <div className="space-y-1.5 border-b border-[#E6E8EC] px-4 py-4 text-xs text-[#667085]">
          {projectWorkflow.detailRows.map(([label, value]) => dividerRow(label, value))}
        </div>

        {project.contracts.map((contract) => {
          const workflow = deriveContractWorkflowState(contract, project, userRole);
          const expanded = expandedId === contract.id;

          return (
            <article key={contract.id} className="border-b border-[#E6E8EC] last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(contract.id)}
                className="flex h-[124px] w-full min-w-0 items-stretch gap-3 overflow-hidden bg-white px-3.5 py-4 text-left active:bg-[#F8FAFC]"
                aria-expanded={expanded}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
                  {initials(contract.title)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <p className="truncate whitespace-nowrap text-sm font-semibold leading-5 text-[#0B0F1A]" title={workflow.title}>{workflow.title}</p>
                  <p className="mt-1 truncate whitespace-nowrap text-[13px] font-medium leading-5 text-[#0B0F1A]" title={workflow.dominantAction}>{workflow.dominantAction}</p>
                  <p className="mt-1 h-4 truncate whitespace-nowrap text-xs font-medium leading-4 text-[#667085]" title={workflow.nextAction}>{workflow.nextAction}</p>
                  <p className="mt-1 truncate whitespace-nowrap text-xs text-[#667085]" title={project.name}>{project.name}</p>
                </div>
                <div className="flex w-[132px] min-w-[132px] max-w-[132px] shrink-0 flex-col items-end justify-between overflow-hidden text-right">
                  <span className={`truncate whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(workflow.status)}`}>{workflow.status}</span>
                  <div className="flex h-[48px] w-full flex-col items-end justify-center overflow-hidden">
                    <p className="max-w-full truncate whitespace-nowrap text-[13px] font-bold leading-5 text-[#0B0F1A]" title={currency(workflow.value)}>{compactCurrency(workflow.value)}</p>
                  </div>
                </div>
              </button>

              {expanded ? (
                <div className="border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4">
                  <section className="border-b border-[#E6E8EC] py-4">
                    <p className="text-sm font-semibold text-[#0B0F1A]">{workflow.dominantAction}</p>
                    <p className="mt-2 text-sm leading-6 text-[#4B5565]">{workflow.reason}</p>
                    <p className="mt-2 text-xs font-medium text-[#667085]">Required actor: {workflow.requiredActor}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#102345]">
                      {[...workflow.primaryActions, ...workflow.secondaryActions].map((action) => (
                        <WorkflowActionButton key={action.key} action={action} onPress={() => markAction(contract.id, action.label)} />
                      ))}
                    </div>
                    {actionNote[contract.id] ? <p className="mt-3 text-xs text-[#667085]">{actionNote[contract.id]}</p> : null}
                  </section>

                  <section className="space-y-1.5 py-4 text-xs text-[#667085]">
                    {workflow.detailRows.map(([label, value]) => dividerRow(label, value))}
                  </section>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </MobileShell>
  );
}

function dividerRow(label: string, value: string) {
  return (
    <div key={label} className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#0B0F1A]" title={value}>{value || "—"}</span>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SF";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function compactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    const compact = value / 1_000_000;
    return `£${compact.toFixed(compact >= 10 ? 1 : 2).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")}m`;
  }
  return currency(value);
}

function statusClass(status: string) {
  if (status === "blocked") return "text-[#EF4444]";
  if (status === "ready" || status === "clear") return "text-[#047857]";
  return "text-[#B45309]";
}

function WorkflowActionButton({
  action,
  onPress,
}: {
  action: UnifiedWorkflowControl;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!action.enabled}
      onClick={onPress}
      className={`rounded-full border px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        action.intent === "primary"
          ? "border-[#102345] bg-[#102345] text-white hover:bg-[#1D4ED8] hover:border-[#1D4ED8]"
          : action.intent === "danger"
            ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318] hover:border-[#FCA5A5]"
            : "border-[#D7DBE2] bg-white text-[#102345] hover:border-[#A8B3C7] hover:text-[#1D4ED8]"
      }`}
    >
      {action.label}
    </button>
  );
}
