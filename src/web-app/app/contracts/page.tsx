"use client";

import { useCallback, useMemo, useState } from "react";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";

import MobileShell from "../components/prototype/MobileShell";
import NotificationFilters, { type FilterScope } from "../components/prototype/NotificationFilters";
import NotificationSystemHeader from "../components/prototype/NotificationSystemHeader";
import AttachmentGrid from "../components/prototype/AttachmentGrid";
import type { PreviewAttachment } from "../components/prototype/AttachmentModal";
import { usePrototype } from "../components/PrototypeProvider";
import type { ContractRecord, ProjectRecord } from "@/lib/prototypeData";
import { deriveContractWorkflowState, type UnifiedWorkflowControl } from "@/lib/workflowState";

type ContractFilterId = "all" | "action" | "blocked";

const contractScopes: readonly FilterScope<ContractFilterId>[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "blocked", label: "Blocked" },
];

type ContractRow = {
  id: string;
  project: ProjectRecord;
  contract: ContractRecord;
};

export default function ContractsPage() {
  const { projects, currentUser, issueContract, runContractAction } = usePrototype();
  const [selectedFilter, setSelectedFilter] = useState<ContractFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState(() => defaultContractDraft(currentUser.name, projects[0]?.id ?? ""));
  const userRole = currentUser.workflowRole;
  const canCreateContract = currentUser.role === "funder" || currentUser.role === "primary_contractor";

  const rows = useMemo<ContractRow[]>(
    () =>
      projects.flatMap((project) =>
        project.contracts.map((contract) => ({
          id: `${project.id}-${contract.id}`,
          project,
          contract,
        })),
      ),
    [projects],
  );
  const visibleRows = useMemo(
    () =>
      rows.filter(({ project, contract }) => {
        const workflow = deriveContractWorkflowState(contract, project, userRole);
        if (selectedFilter === "action" && workflow.status === "clear") return false;
        if (selectedFilter === "blocked" && workflow.status !== "blocked") return false;
        if (!searchQuery.trim()) return true;
        const haystack = [
          contract.title,
          contract.supplier,
          project.name,
          workflow.dominantAction,
          workflow.nextAction,
        ].join(" ").toLowerCase();
        return haystack.includes(searchQuery.trim().toLowerCase());
      }),
    [rows, searchQuery, selectedFilter, userRole],
  );
  const counts = useMemo(
    () => {
      const workflows = rows.map(({ project, contract }) => deriveContractWorkflowState(contract, project, userRole));
      return {
        all: rows.length,
        action: workflows.filter((workflow) => workflow.status !== "clear").length,
        blocked: workflows.filter((workflow) => workflow.status === "blocked").length,
      };
    },
    [rows, userRole],
  );

  const toggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const handleContractAction = useCallback((projectId: string, contractId: string, rowId: string, actionKey: string) => {
    const confirmation = runContractAction({ projectId, contractId, actionKey });
    setActionNote((current) => ({
      ...current,
      [rowId]: confirmation,
    }));
  }, [runContractAction]);

  return (
    <MobileShell title="" headerContent={<NotificationSystemHeader />}>
      <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
        <NotificationFilters
          title="Contracts"
          accent="blue"
          selected={selectedFilter}
          query={searchQuery}
          counts={counts}
          scopes={contractScopes}
          placeholder="Search contracts, suppliers, actions"
          onQueryChange={setSearchQuery}
          onSelect={setSelectedFilter}
        />

      <div className="mt-3">
      {canCreateContract ? (
        <section className="mb-3 rounded-[22px] border border-[#E6E8EC] bg-white px-3.5 py-3">
          <button type="button" onClick={() => setContractFormOpen((current) => !current)} className="text-sm font-semibold text-[#102345]">
            New Contract
          </button>
          {contractFormOpen ? (
            <div className="mt-3 grid gap-2 text-sm">
              <select value={contractDraft.projectId} onChange={(event) => setContractDraft((draft) => ({ ...draft, projectId: event.target.value }))} className="rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 outline-none">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <input value={contractDraft.title} onChange={(event) => setContractDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Contract name" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <input value={contractDraft.packageType} onChange={(event) => setContractDraft((draft) => ({ ...draft, packageType: event.target.value }))} placeholder="Package/type" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <textarea value={contractDraft.description} onChange={(event) => setContractDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Contract details" rows={2} className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={contractDraft.startDate} onChange={(event) => setContractDraft((draft) => ({ ...draft, startDate: event.target.value }))} placeholder="Start date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                <input value={contractDraft.endDate} onChange={(event) => setContractDraft((draft) => ({ ...draft, endDate: event.target.value }))} placeholder="End date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              </div>
              <input value={contractDraft.value} onChange={(event) => setContractDraft((draft) => ({ ...draft, value: event.target.value }))} placeholder="Value" inputMode="numeric" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <input value={contractDraft.attachments} onChange={(event) => setContractDraft((draft) => ({ ...draft, attachments: event.target.value }))} placeholder="Contract files, comma separated" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const result = issueContract({ projectId: contractDraft.projectId, title: contractDraft.title, packageType: contractDraft.packageType, description: contractDraft.description, startDate: contractDraft.startDate, endDate: contractDraft.endDate, value: Number(contractDraft.value) || 0, authorityName: currentUser.name, assignedRole: "Delivery party", signOffAuthority: true, paymentAuthority: false, attachmentsSummary: splitAttachments(contractDraft.attachments), mode: "draft" });
                    setContractDraft(defaultContractDraft(currentUser.name, projects[0]?.id ?? ""));
                    setContractFormOpen(false);
                    setActionNote((current) => ({ ...current, [result.contractId]: result.fundingShortfall ? "Draft saved with funding shortfall." : "Draft saved." }));
                  }}
                  className="rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#102345]"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const result = issueContract({ projectId: contractDraft.projectId, title: contractDraft.title, packageType: contractDraft.packageType, description: contractDraft.description, startDate: contractDraft.startDate, endDate: contractDraft.endDate, value: Number(contractDraft.value) || 0, authorityName: currentUser.name, assignedRole: "Delivery party", signOffAuthority: true, paymentAuthority: false, attachmentsSummary: splitAttachments(contractDraft.attachments), mode: "issue" });
                    setContractDraft(defaultContractDraft(currentUser.name, projects[0]?.id ?? ""));
                    setContractFormOpen(false);
                    setActionNote((current) => ({ ...current, [result.contractId]: result.fundingShortfall ? "Funding shortfall: saved as draft." : "Contract issued." }));
                  }}
                  className="rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Issue contract
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E6E8EC] bg-white">
        {visibleRows.map(({ id, project, contract }) => {
          const expanded = expandedId === id;
          const workflow = deriveContractWorkflowState(contract, project, userRole);
          const dominantAction = workflow.dominantAction;
          const nextAction = workflow.nextAction;
          const stageSummary = `${contract.progressPercent}% complete • ${contract.approvalState}`;
          const workflowActions = getValidWorkflowActions(contract, workflow, currentUser.role);
          const lifecycleControls = getLifecycleControls(contract, currentUser.role);

          return (
            <article key={id} className="w-full min-w-0 overflow-hidden border-b border-[#E6E8EC] last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(id)}
                className="flex h-[108px] w-full min-w-0 items-stretch gap-3 overflow-hidden bg-white px-3.5 py-4 text-left active:bg-[#F8FAFC]"
                aria-expanded={expanded}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
                  {initials(contract.title)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <p className="truncate whitespace-nowrap text-sm font-semibold leading-5 text-[#0B0F1A]" title={contract.title}>{contract.title || "—"}</p>
                  <p className="mt-1 truncate whitespace-nowrap text-[13px] font-medium leading-5 text-[#0B0F1A]" title={dominantAction}>{dominantAction}</p>
                  <p className="mt-1 h-4 truncate whitespace-nowrap text-xs font-medium leading-4 text-[#667085]" title={nextAction}>{nextAction || "No action"}</p>
                </div>
                <div className="flex w-[104px] min-w-[104px] max-w-[104px] shrink-0 items-center justify-end overflow-hidden text-right">
                  <p className="max-w-full truncate whitespace-nowrap text-[13px] font-bold leading-5 text-[#0B0F1A]" title={currency(contract.value)}>{compactCurrency(contract.value)}</p>
                </div>
              </button>

              {expanded ? (
                <div className="min-w-0 overflow-hidden border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4">
                  <section className="border-b border-[#E6E8EC] py-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B7FD8]">{contextLabel(dominantAction)}</p>
                    <p className="text-sm font-semibold text-[#0B0F1A]">{dominantAction}</p>
                    <p className="mt-2 break-words text-sm leading-6 text-[#4B5565]">{workflow.reason}</p>
                    <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {workflow.requiredActor}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#102345]">
                      {workflowActions.map((action) => (
                        <WorkflowActionButton key={action.key} action={action} onPress={() => handleContractAction(project.id, contract.id, id, action.key)} />
                      ))}
                    </div>
                    {workflow.status === "blocked" ? <p className="mt-2 break-words text-xs text-amber-600">{workflow.reason}</p> : null}
                    {actionNote[id] ? <p className="mt-3 break-words text-xs text-[#667085]">{actionNote[id]}</p> : null}
                  </section>

                  {lifecycleControls.length > 0 ? (
                    <section className="border-b border-[#E6E8EC] py-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Lifecycle controls</p>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {lifecycleControls.map((control) => (
                          <IconLifecycleButton key={control.key} control={control} onPress={() => handleContractAction(project.id, contract.id, id, control.key)} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="space-y-1.5 border-b border-[#E6E8EC] py-4 text-xs text-[#667085]">
                    {dividerRow("Why now", contract.statusSummary)}
                    {dividerRow("Next step", nextAction || "No action")}
                    {workflow.detailRows.slice(2).map(([label, value]) => dividerRow(label, value))}
                  </section>

                  {contract.evidence.length > 0 ? (
                    <section className="border-b border-[#E6E8EC] py-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Attachments</p>
                      <AttachmentGrid attachments={contractAttachments(contract)} />
                    </section>
                  ) : null}

                  <section className="border-b border-[#E6E8EC] py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Stage checklist</p>
                    <div className="mt-2 divide-y divide-[#E6E8EC]">
                      {contract.checklist.map((step) => (
                        <div key={step.id} className="flex min-w-0 items-center justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-[#4B5565]" title={step.label}>{step.label}</span>
                          <span className={`shrink-0 text-xs font-semibold ${step.done ? "text-[#047857]" : "text-[#B45309]"}`}>{step.done ? "Complete" : "Current"}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-1.5 py-4 text-xs text-[#667085]">
                    {dividerRow("Contract", contract.title)}
                    {dividerRow("Project", project.name)}
                    {dividerRow("Supplier", contract.supplier)}
                    {dividerRow("Stage summary", stageSummary)}
                    {dividerRow("Lifecycle", contract.status)}
                    {dividerRow("Value", currency(workflow.value))}
                  </section>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
      </div>
      </div>
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

function contextLabel(action: string) {
  if (/funding/i.test(action)) return "Funding issue";
  if (/approval/i.test(action)) return "Approval task";
  if (/dispute/i.test(action)) return "Dispute case";
  if (/evidence/i.test(action)) return "Evidence task";
  if (/release/i.test(action)) return "Release task";
  return "Contract task";
}

function contractAttachments(contract: ContractRecord): PreviewAttachment[] {
  return contract.evidence.map((item) => ({
    id: item.id,
    name: item.title,
    type: item.type === "Photo" ? "image" : "file",
    url: item.type === "Photo" ? placeholderImage(item.title) : undefined,
    fileType: item.type,
  }));
}

function placeholderImage(label: string) {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#5B7FD8"/><text x="18" y="124" fill="white" font-family="Arial" font-size="18" font-weight="700">${label.slice(0, 18)}</text></svg>`);
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function defaultContractDraft(authorityName: string, projectId: string) {
  return {
    projectId,
    title: "",
    packageType: "",
    description: "",
    startDate: "",
    endDate: "",
    value: "",
    authorityName,
    attachments: "",
  };
}

function splitAttachments(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

type LifecycleControl = { key: string; label: string; icon: "edit" | "cancel" | "return" | "reassign"; enabled: boolean; reason?: string; intent?: "danger" };

function getLifecycleControls(contract: ContractRecord, role: string): LifecycleControl[] {
  const canControl = role === "funder" || role === "primary_contractor";
  if (!canControl || contract.status === "Completed" || contract.status === "Cancelled") return [];
  const controls: LifecycleControl[] = [];
  if (contract.status === "Draft" || contract.status === "Returned") controls.push({ key: "edit", label: "Edit", icon: "edit", enabled: true });
  if (contract.status === "Draft" || contract.status === "Returned") controls.push({ key: "issue_contract", label: "Issue", icon: "return", enabled: contract.fundingState !== "Proof of funds pending" && contract.fundingState !== "Blocked", reason: "Funding shortfall blocks issue." });
  if (contract.status === "Issued" || contract.status === "Returned" || contract.status === "Rejected" || contract.status === "Sent") controls.push({ key: "reassign", label: "Reassign", icon: "reassign", enabled: true });
  if (contract.status === "Issued" || contract.status === "Sent") controls.push({ key: "accept_contract", label: "Accept", icon: "return", enabled: true });
  if (contract.status === "Accepted") controls.push({ key: "activate_contract", label: "Activate", icon: "return", enabled: contract.fundingState !== "Proof of funds pending" && contract.fundingState !== "Blocked", reason: "Funding required before activation." });
  if (contract.status === "Rejected") controls.push({ key: "duplicate_draft", label: "Duplicate", icon: "edit", enabled: true });
  if (["Draft", "Issued", "Returned", "Rejected", "Sent"].includes(contract.status)) controls.push({ key: "cancel_contract", label: "Cancel", icon: "cancel", enabled: true, intent: "danger" });
  return controls;
}

function getValidWorkflowActions(contract: ContractRecord, workflow: ReturnType<typeof deriveContractWorkflowState>, role: string) {
  if (contract.status === "Completed" || contract.status === "Cancelled") return [];
  const isFunder = role === "funder";
  const isApprover = role === "qs" || role === "primary_contractor";
  const canSubmit = role === "supplier" || role === "subcontractor";
  return [...workflow.primaryActions, ...workflow.secondaryActions].filter((action) => {
    if (action.key === "confirm_release") return isFunder && contract.approvalState === "Approved" && contract.fundingState === "Available to release" && contract.status !== "Disputed";
    if (action.key === "approve" || action.key === "return") return isApprover;
    if (action.key === "upload_evidence" || action.key === "request_evidence") return canSubmit && (contract.status === "Active" || contract.status === "Accepted" || contract.status === "In progress");
    if (action.key === "review_funding") return isFunder;
    if (action.key === "reassign") return !["Accepted", "Active", "Completed"].includes(contract.status) && (isFunder || role === "primary_contractor");
    return action.enabled;
  }).map((action) => ({
    ...action,
    enabled: action.enabled && !(action.key === "confirm_release" && contract.fundingState !== "Available to release"),
  }));
}

function IconLifecycleButton({ control, onPress }: { control: LifecycleControl; onPress: () => void }) {
  const icon = control.icon === "edit"
    ? <EditOutlined style={{ fontSize: 16 }} />
    : control.icon === "cancel"
      ? <CancelOutlined style={{ fontSize: 16 }} />
      : control.icon === "reassign"
        ? <SwapHorizOutlined style={{ fontSize: 16 }} />
        : <ReplayOutlined style={{ fontSize: 16 }} />;
  return (
    <button
      type="button"
      disabled={!control.enabled}
      title={control.enabled ? control.label : control.reason}
      onClick={onPress}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
        control.intent === "danger" ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]" : "border-[#D7DBE2] bg-white text-[#102345]"
      }`}
    >
      {icon}
      {control.label}
    </button>
  );
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
