"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import AddCircleOutlineOutlined from "@mui/icons-material/AddCircleOutlineOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import KeyboardArrowUpOutlined from "@mui/icons-material/KeyboardArrowUpOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";

import MobileShell from "../components/prototype/MobileShell";
import NotificationFilters, { type FilterScope } from "../components/prototype/NotificationFilters";
import NotificationSystemHeader from "../components/prototype/NotificationSystemHeader";
import AttachmentGrid from "../components/prototype/AttachmentGrid";
import type { PreviewAttachment } from "../components/prototype/AttachmentModal";
import { usePrototype } from "../components/PrototypeProvider";
import type { ContractRecord, ProjectRecord } from "@/lib/prototypeData";
import { deriveContractWorkflowState, deriveProjectWorkflowState, type UnifiedWorkflowControl, type WorkflowSurfaceState } from "@/lib/workflowState";
import { demoUsers, type DemoUser } from "@/lib/demoUsers";

type ProjectFilterId = "all" | "action" | "at_risk";

const projectScopes: readonly FilterScope<ProjectFilterId>[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "at_risk", label: "At risk" },
];

export default function ProjectsListScreen() {
  const { projects, currentUser, createProject, issueContract, assignContractSupplier, runContractAction, runProjectFundingAction } = usePrototype();
  const [selectedFilter, setSelectedFilter] = useState<ProjectFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [contractsMenuProjectId, setContractsMenuProjectId] = useState<string | null>(null);
  const [detailsProjectId, setDetailsProjectId] = useState<string | null>(null);
  const [filesProjectId, setFilesProjectId] = useState<string | null>(null);
  const [issueDetailsProjectId, setIssueDetailsProjectId] = useState<string | null>(null);
  const [addFundsProjectId, setAddFundsProjectId] = useState<string | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [contractFormProjectId, setContractFormProjectId] = useState<string | null>(null);
  const [contractFormParentContractId, setContractFormParentContractId] = useState<string | undefined>(undefined);
  const [projectDraft, setProjectDraft] = useState({
    name: "",
    description: "",
    location: "",
    postcode: "",
    what3words: "",
    startDate: "",
    endDate: "",
    budgetValue: "",
    initialFunding: "",
    authorityName: currentUser.name,
    paymentAuthorityName: currentUser.name,
    signOffAuthority: true,
    paymentAuthority: true,
    attachments: "",
  });
  const [contractDraft, setContractDraft] = useState(() => defaultContractDraft(currentUser.name));
  const [supplierSelection, setSupplierSelection] = useState<Record<string, string>>({});
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [fundingDraft, setFundingDraft] = useState<Record<string, string>>({});
  const [fundingSourceDraft, setFundingSourceDraft] = useState<Record<string, string>>({});
  const userRole = currentUser.workflowRole;
  const canStartProject = currentUser.role === "funder";
  const canIssueContract = currentUser.role === "funder" || currentUser.role === "primary_contractor";
  const supplierContacts = demoUsers.filter((user) => user.role === "supplier" || user.role === "subcontractor" || user.role === "primary_contractor");
  const verifiedFundingAccounts = getVerifiedFundingAccounts(currentUser);

  const projectRows = useMemo(
    () => projects.map((project) => ({
      project,
      workflow: deriveProjectWorkflowState(project, userRole),
    })),
    [projects, userRole],
  );
  const visibleRows = useMemo(
    () =>
      projectRows.filter(({ project, workflow }) => {
        if (selectedFilter === "action" && workflow.status === "clear") return false;
        if (selectedFilter === "at_risk" && !["blocked", "warning", "in review"].includes(workflow.status)) return false;
        if (!searchQuery.trim()) return true;
        const haystack = [
          workflow.title,
          workflow.dominantAction,
          workflow.nextAction,
          project.location,
          project.fundingSummary,
        ].join(" ").toLowerCase();
        return haystack.includes(searchQuery.trim().toLowerCase());
      }),
    [projectRows, searchQuery, selectedFilter],
  );
  const counts = useMemo(
    () => ({
      all: projectRows.length,
      action: projectRows.filter(({ workflow }) => workflow.status !== "clear").length,
      at_risk: projectRows.filter(({ workflow }) => ["blocked", "warning", "in review"].includes(workflow.status)).length,
    }),
    [projectRows],
  );

  const toggle = useCallback((id: string) => {
    setExpandedContractId(null);
    setContractsMenuProjectId(null);
    setDetailsProjectId(null);
    setFilesProjectId(null);
    setIssueDetailsProjectId(null);
    setAddFundsProjectId(null);
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const toggleContract = useCallback((id: string) => {
    setExpandedContractId((current) => (current === id ? null : id));
  }, []);

  const handleContractAction = useCallback((projectId: string, contractId: string, actionKey: string) => {
    const confirmation = runContractAction({ projectId, contractId, actionKey });
    setActionNote((current) => ({
      ...current,
      [`${projectId}-${contractId}`]: confirmation,
    }));
  }, [runContractAction]);

  const handleProjectFundingAction = useCallback((projectId: string, actionKey: string) => {
    const confirmation = runProjectFundingAction({ projectId, actionKey });
    setActionNote((current) => ({ ...current, [projectId]: confirmation }));
    setFundingDraft((current) => ({ ...current, [projectId]: "" }));
  }, [runProjectFundingAction]);

  const handleAddFundsConfirm = useCallback((projectId: string) => {
    const selectedAccount = verifiedFundingAccounts.find((account) => account.id === fundingSourceDraft[projectId]) ?? verifiedFundingAccounts[0];
    const confirmation = runProjectFundingAction({ projectId, actionKey: "add_funding" });
    setActionNote((current) => ({
      ...current,
      [projectId]: selectedAccount ? `${confirmation} Source: ${selectedAccount.label}.` : "Add a verified bank account in Account before funding.",
    }));
    setFundingDraft((current) => ({ ...current, [projectId]: "" }));
    setAddFundsProjectId(null);
  }, [fundingSourceDraft, runProjectFundingAction, verifiedFundingAccounts]);

  if (!projectRows.length) {
    return (
      <MobileShell title="" headerContent={<NotificationSystemHeader />}>
        <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
          <NotificationFilters
            title="My work"
            accent="blue"
            selected={selectedFilter}
            query={searchQuery}
            counts={counts}
            scopes={projectScopes}
            placeholder="Search projects, contracts, actions"
            onQueryChange={setSearchQuery}
            onSelect={setSelectedFilter}
          />
        <section className="rounded-[22px] border border-[#E6E8EC] bg-white px-4 py-6 text-sm text-[#667085]">
          No live projects are available.
        </section>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="" headerContent={<NotificationSystemHeader />}>
      <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
        <NotificationFilters
          title="My work"
          accent="blue"
          selected={selectedFilter}
          query={searchQuery}
          counts={counts}
          scopes={projectScopes}
          placeholder="Search projects, contracts, actions"
          onQueryChange={setSearchQuery}
          onSelect={setSelectedFilter}
        />

      {canStartProject ? (
        <section className="mt-3 rounded-[22px] border border-[#E6E8EC] bg-white px-3.5 py-3">
          <button type="button" onClick={() => setProjectFormOpen((current) => !current)} className="text-sm font-semibold text-[#102345]">
            Start New Project
          </button>
          {projectFormOpen ? (
            <div className="mt-3 grid gap-2 text-sm">
              <input value={projectDraft.name} onChange={(event) => setProjectDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Project name" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <textarea value={projectDraft.description} onChange={(event) => setProjectDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description" rows={2} className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <input value={projectDraft.location} onChange={(event) => setProjectDraft((draft) => ({ ...draft, location: event.target.value }))} placeholder="Address / location" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={projectDraft.postcode} onChange={(event) => setProjectDraft((draft) => ({ ...draft, postcode: event.target.value }))} placeholder="Postcode" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                <input value={projectDraft.what3words} onChange={(event) => setProjectDraft((draft) => ({ ...draft, what3words: event.target.value }))} placeholder="what3words" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={projectDraft.startDate} onChange={(event) => setProjectDraft((draft) => ({ ...draft, startDate: event.target.value }))} placeholder="Start date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                <input value={projectDraft.endDate} onChange={(event) => setProjectDraft((draft) => ({ ...draft, endDate: event.target.value }))} placeholder="End date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              </div>
              <input value={projectDraft.budgetValue} onChange={(event) => setProjectDraft((draft) => ({ ...draft, budgetValue: event.target.value }))} placeholder="Budget value" inputMode="numeric" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <input value={projectDraft.initialFunding} onChange={(event) => setProjectDraft((draft) => ({ ...draft, initialFunding: event.target.value }))} placeholder="Initial funding" inputMode="numeric" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <input value={projectDraft.attachments} onChange={(event) => setProjectDraft((draft) => ({ ...draft, attachments: event.target.value }))} placeholder="Attachments, comma separated" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
              <div className="grid gap-2 rounded-2xl border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-3">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#102345]">
                  Authorise sign-off
                  <input type="checkbox" checked={projectDraft.signOffAuthority} onChange={(event) => setProjectDraft((draft) => ({ ...draft, signOffAuthority: event.target.checked }))} />
                </label>
                <input value={projectDraft.authorityName} onChange={(event) => setProjectDraft((draft) => ({ ...draft, authorityName: event.target.value }))} placeholder="Sign-off authority" className="rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 outline-none" />
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#102345]">
                  Authorise payment
                  <input type="checkbox" checked={projectDraft.paymentAuthority} onChange={(event) => setProjectDraft((draft) => ({ ...draft, paymentAuthority: event.target.checked }))} />
                </label>
                <input value={projectDraft.paymentAuthorityName} onChange={(event) => setProjectDraft((draft) => ({ ...draft, paymentAuthorityName: event.target.value }))} placeholder="Payment authority" className="rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 outline-none" />
              </div>
              <button
                type="button"
                onClick={() => {
                  createProject({
                    name: projectDraft.name,
                    description: projectDraft.description,
                    location: projectDraft.location,
                    postcode: projectDraft.postcode,
                    what3words: projectDraft.what3words,
                    startDate: projectDraft.startDate,
                    endDate: projectDraft.endDate,
                    budgetValue: Number(projectDraft.budgetValue) || undefined,
                    initialFunding: Number(projectDraft.initialFunding) || undefined,
                    authorityName: projectDraft.authorityName,
                    paymentAuthorityName: projectDraft.paymentAuthorityName,
                    signOffAuthority: projectDraft.signOffAuthority,
                    paymentAuthority: projectDraft.paymentAuthority,
                    attachmentsSummary: splitAttachments(projectDraft.attachments),
                  });
                  setProjectDraft({ name: "", description: "", location: "", postcode: "", what3words: "", startDate: "", endDate: "", budgetValue: "", initialFunding: "", authorityName: currentUser.name, paymentAuthorityName: currentUser.name, signOffAuthority: true, paymentAuthority: true, attachments: "" });
                  setProjectFormOpen(false);
                }}
                className="justify-self-start rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Create project
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-3">
      <section className="w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E6E8EC] bg-white">
        {visibleRows.map(({ project, workflow }) => {
          const expanded = expandedId === project.id;
          const fundingPosition = getProjectFundingPosition(project);
          const isFunderView = currentUser.role === "funder";

          return (
            <article key={project.id} className="w-full min-w-0 overflow-hidden border-b border-[#E6E8EC] last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(project.id)}
                className="flex min-h-[116px] w-full min-w-0 items-stretch gap-3 overflow-hidden border-l-4 border-[#5B7FD8] bg-white px-3.5 py-4 text-left active:bg-[#F8FAFC]"
                aria-expanded={expanded}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
                  {initials(project.name)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <span className="mb-1 inline-flex w-fit rounded-full bg-[#EAF0FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1D4ED8]">{currentUser.role === "funder" ? "My project" : "Project account"}</span>
                  <p className="truncate whitespace-nowrap text-sm font-semibold leading-5 text-[#0B0F1A]" title={workflow.title}>{workflow.title}</p>
                  <p className="mt-1 truncate whitespace-nowrap text-[13px] font-medium leading-5 text-[#0B0F1A]" title={projectAccountAction(fundingPosition, currentUser.role)}>{projectAccountAction(fundingPosition, currentUser.role)}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E6E8EC]">
                    <div className={`h-full rounded-full ${fundingPosition.shortfall > 0 ? "bg-[#D97706]" : "bg-[#047857]"}`} style={{ width: `${fundingPosition.coveragePercent}%` }} />
                  </div>
                  <p className="mt-1 h-4 truncate whitespace-nowrap text-xs font-medium leading-4 text-[#667085]" title={fundingPosition.shortfall > 0 ? `${currency(fundingPosition.shortfall)} shortfall` : `${currency(fundingPosition.surplus)} surplus`}>
                    {fundingPosition.shortfall > 0 ? `${compactCurrency(fundingPosition.shortfall)} shortfall` : `${compactCurrency(fundingPosition.surplus)} surplus`}
                  </p>
                </div>
                <div className="flex w-[104px] min-w-[104px] max-w-[104px] shrink-0 items-center justify-end overflow-hidden text-right">
                  <p className="max-w-full truncate whitespace-nowrap text-[13px] font-bold leading-5 text-[#0B0F1A]" title={currency(fundingPosition.ringfenced)}>{compactCurrency(fundingPosition.ringfenced)}</p>
                </div>
              </button>

              {expanded ? (
                <div className="min-w-0 overflow-hidden border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4">
                  <section className="border-b border-[#E6E8EC] py-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B7FD8]">{contextLabel(workflow.dominantAction)}</p>
                    <p className="text-sm font-semibold text-[#0B0F1A]">{projectAccountAction(fundingPosition, currentUser.role)}</p>
                    <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {isFunderView ? "Project funding owner" : "Project owner / funder"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#102345]">
                      {isFunderView && projectFundingBlocked(project, fundingPosition) ? (
                        <WorkflowActionButton action={{ key: "add_funding", label: "Add funds", enabled: verifiedFundingAccounts.length > 0, intent: "primary" }} onPress={() => setAddFundsProjectId((current) => (current === project.id ? null : project.id))} />
                      ) : currentUser.role === "primary_contractor" ? (
                        <WorkflowActionButton action={{ key: "request_funds", label: "Request funds", enabled: fundingPosition.shortfall > 0, intent: "primary" }} onPress={() => handleProjectFundingAction(project.id, "request_funds")} />
                      ) : null}
                    </div>
                    {isFunderView && addFundsProjectId === project.id ? (
                      <div className="mt-3 grid min-w-0 gap-2 overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3">
                        <select
                          value={fundingSourceDraft[project.id] ?? verifiedFundingAccounts[0]?.id ?? ""}
                          onChange={(event) => setFundingSourceDraft((current) => ({ ...current, [project.id]: event.target.value }))}
                          className="min-w-0 max-w-full rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 text-sm outline-none"
                        >
                          {verifiedFundingAccounts.map((account) => (
                            <option key={account.id} value={account.id}>{account.label}</option>
                          ))}
                        </select>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <input value={fundingDraft[project.id] ?? ""} onChange={(event) => setFundingDraft((current) => ({ ...current, [project.id]: event.target.value }))} placeholder="Amount to add" inputMode="numeric" className="min-w-0 rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 text-sm outline-none" />
                          <button type="button" onClick={() => handleAddFundsConfirm(project.id)} className="max-w-[86px] shrink-0 rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-xs font-semibold text-white">
                            Confirm
                          </button>
                        </div>
                        <p className="truncate text-xs text-[#667085]" title="Only verified bank accounts from Account settings are available here.">Verified accounts only</p>
                      </div>
                    ) : null}
                    {actionNote[project.id] ? <p className="mt-3 break-words text-xs text-[#667085]">{actionNote[project.id]}</p> : null}
                  </section>

                  <ProjectFundingSummary funding={fundingPosition} />

                  {(projectFundingBlocked(project, fundingPosition) || fundingPosition.disputed > 0) ? (
                    <section className="border-b border-[#E6E8EC] py-4">
                      <div className="flex items-center gap-2">
                        {projectFundingBlocked(project, fundingPosition) ? (
                          <IssueActionButton
                            label="Proof of funds pending"
                            icon="money"
                            active={issueDetailsProjectId === `${project.id}-funds`}
                            onPress={() => setIssueDetailsProjectId((current) => (current === `${project.id}-funds` ? null : `${project.id}-funds`))}
                          />
                        ) : null}
                        {fundingPosition.disputed > 0 ? (
                          <IssueActionButton
                            label="Frozen by dispute"
                            icon="contract"
                            tone="red"
                            active={issueDetailsProjectId === `${project.id}-dispute`}
                            onPress={() => setIssueDetailsProjectId((current) => (current === `${project.id}-dispute` ? null : `${project.id}-dispute`))}
                          />
                        ) : null}
                      </div>
                      {issueDetailsProjectId === `${project.id}-funds` ? (
                        <IssueDetail title="Proof of funds pending" detail="No linked contract should commence until funds are allocated and cleared for this project." />
                      ) : null}
                      {issueDetailsProjectId === `${project.id}-dispute` ? (
                        <IssueDetail title="Frozen by dispute" detail={`${currency(fundingPosition.disputed)} is frozen until the disputed contract value is resolved.`} tone="red" />
                      ) : null}
                    </section>
                  ) : null}

                  <section className="border-b border-[#E6E8EC] py-4">
                    <button
                      type="button"
                      onClick={() => setDetailsProjectId((current) => (current === project.id ? null : project.id))}
                      className="flex w-full items-center justify-between gap-3 text-left"
                      aria-expanded={detailsProjectId === project.id}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Project details</span>
                      {detailsProjectId === project.id ? <KeyboardArrowUpOutlined titleAccess="Hide project details" style={{ fontSize: 18 }} /> : <KeyboardArrowDownOutlined titleAccess="Show project details" style={{ fontSize: 18 }} />}
                    </button>
                    {detailsProjectId === project.id ? (
                      <div className="mt-3 space-y-3 text-xs text-[#667085]">
                        {project.description ? dividerRow("Description", project.description) : null}
                        {dividerRow("Address", project.location)}
                        {project.postcode ? dividerRow("Postcode", project.postcode) : null}
                        {project.what3words ? dividerRow("what3words", project.what3words) : null}
                        {dividerRow("Budget", currency(project.budgetValue ?? project.totalValue))}
                        <ScheduleBlock dateRange={project.dateRange} />
                        {project.permissions?.authorityName ? dividerRow("Sign-off", project.permissions.authorityName) : null}
                        {project.permissions?.paymentAuthorityName ? dividerRow("Payment authority", project.permissions.paymentAuthorityName) : null}
                        <ProjectFilesPanel
                          project={project}
                          open={filesProjectId === project.id}
                          onToggle={() => setFilesProjectId((current) => (current === project.id ? null : project.id))}
                        />
                      </div>
                    ) : null}
                  </section>

                  <section className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setContractsMenuProjectId((current) => (current === project.id ? null : project.id))}
                        className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]"
                        aria-expanded={contractsMenuProjectId === project.id}
                      >
                        <span>Contracts linked ({project.contracts.length})</span>
                        {contractsMenuProjectId === project.id ? <KeyboardArrowUpOutlined titleAccess="Hide contracts" style={{ fontSize: 16 }} /> : <KeyboardArrowDownOutlined titleAccess="Show contracts" style={{ fontSize: 16 }} />}
                      </button>
                    </div>
                    {contractsMenuProjectId === project.id ? (
                    <div className="mt-2">
                      {canIssueContract ? (
                        <button
                          type="button"
                          onClick={() => {
                            setContractFormParentContractId(undefined);
                            setContractFormProjectId((current) => (current === project.id ? null : project.id));
                          }}
                          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-dashed border-[#A8B3C7] bg-white px-3 py-3 text-left text-sm font-semibold text-[#102345]"
                          title="Add contract"
                          aria-label="Add contract"
                        >
                          <span>Add contract</span>
                          <AddCircleOutlineOutlined style={{ fontSize: 22 }} />
                        </button>
                      ) : null}
                      {contractFormProjectId === project.id ? (
                      <div className="mt-3 grid gap-2 rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3 text-sm">
                        <input value={contractDraft.title} onChange={(event) => setContractDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Contract name" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <input value={contractDraft.packageType} onChange={(event) => setContractDraft((draft) => ({ ...draft, packageType: event.target.value }))} placeholder="Package/type" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <textarea value={contractDraft.description} onChange={(event) => setContractDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder={contractFormParentContractId ? "Subcontract scope / details" : "Contract description / details"} rows={2} className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <input value={contractDraft.postcode} onChange={(event) => setContractDraft((draft) => ({ ...draft, postcode: event.target.value }))} placeholder="Postcode" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                          <input value={contractDraft.what3words} onChange={(event) => setContractDraft((draft) => ({ ...draft, what3words: event.target.value }))} placeholder="what3words" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={contractDraft.startDate} onChange={(event) => setContractDraft((draft) => ({ ...draft, startDate: event.target.value }))} placeholder="Start date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                          <input value={contractDraft.endDate} onChange={(event) => setContractDraft((draft) => ({ ...draft, endDate: event.target.value }))} placeholder="End date" className="min-w-0 rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        </div>
                        <input value={contractDraft.value} onChange={(event) => setContractDraft((draft) => ({ ...draft, value: event.target.value }))} placeholder="Value" inputMode="numeric" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <input value={contractDraft.authorityName} onChange={(event) => setContractDraft((draft) => ({ ...draft, authorityName: event.target.value }))} placeholder="Sign-off authority" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <input value={contractDraft.assignedRole} onChange={(event) => setContractDraft((draft) => ({ ...draft, assignedRole: event.target.value }))} placeholder="Delivery role assignment" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <input value={contractDraft.attachments} onChange={(event) => setContractDraft((draft) => ({ ...draft, attachments: event.target.value }))} placeholder="Contract files, comma separated" className="rounded-xl border border-[#D7DBE2] px-3 py-2 outline-none" />
                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-3">
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#102345]">
                            Sign-off
                            <input type="checkbox" checked={contractDraft.signOffAuthority} onChange={(event) => setContractDraft((draft) => ({ ...draft, signOffAuthority: event.target.checked }))} />
                          </label>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#102345]">
                            Payment
                            <input type="checkbox" checked={contractDraft.paymentAuthority} onChange={(event) => setContractDraft((draft) => ({ ...draft, paymentAuthority: event.target.checked }))} />
                          </label>
                        </div>
                        <FundingHint project={project} value={Number(contractDraft.value) || 0} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const result = issueContract({ projectId: project.id, parentContractId: contractFormParentContractId, title: contractDraft.title, packageType: contractDraft.packageType, description: contractDraft.description, postcode: contractDraft.postcode, what3words: contractDraft.what3words, startDate: contractDraft.startDate, endDate: contractDraft.endDate, value: Number(contractDraft.value) || 0, authorityName: contractDraft.authorityName, assignedRole: contractDraft.assignedRole, signOffAuthority: contractDraft.signOffAuthority, paymentAuthority: contractDraft.paymentAuthority, attachmentsSummary: splitAttachments(contractDraft.attachments), mode: "draft" });
                              setContractDraft(defaultContractDraft(currentUser.name));
                              setContractFormProjectId(null);
                              setContractFormParentContractId(undefined);
                              setActionNote((current) => ({ ...current, [project.id]: result.fundingShortfall ? "Draft saved with funding shortfall." : "Draft saved." }));
                            }}
                            className="rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#102345]"
                          >
                            Save draft
                          </button>
                          <button
                            type="button"
                            disabled={(Number(contractDraft.value) || 0) > inferAvailableProjectFunding(project)}
                            title={(Number(contractDraft.value) || 0) > inferAvailableProjectFunding(project) ? "Funding shortfall: save as draft until funded." : "Issue contract"}
                            onClick={() => {
                              const result = issueContract({ projectId: project.id, parentContractId: contractFormParentContractId, title: contractDraft.title, packageType: contractDraft.packageType, description: contractDraft.description, postcode: contractDraft.postcode, what3words: contractDraft.what3words, startDate: contractDraft.startDate, endDate: contractDraft.endDate, value: Number(contractDraft.value) || 0, authorityName: contractDraft.authorityName, assignedRole: contractDraft.assignedRole, signOffAuthority: contractDraft.signOffAuthority, paymentAuthority: contractDraft.paymentAuthority, attachmentsSummary: splitAttachments(contractDraft.attachments), mode: "issue" });
                              setContractDraft(defaultContractDraft(currentUser.name));
                              setContractFormProjectId(null);
                              setContractFormParentContractId(undefined);
                              setActionNote((current) => ({ ...current, [project.id]: result.fundingShortfall ? "Funding shortfall: saved as draft." : "Contract issued." }));
                            }}
                            className="rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Issue contract
                          </button>
                        </div>
                      </div>
                      ) : null}
                    <div className="max-h-[520px] overflow-y-auto divide-y divide-[#E6E8EC] pr-1">
                      {project.contracts.map((contract) => (
                        <ContractInlinePanel
                          key={contract.id}
                          contract={contract}
                          projectFunding={fundingPosition}
                          workLabel={getContractWorkLabel(contract, currentUser.company, currentUser.role)}
                          workflow={deriveContractWorkflowState(contract, project, userRole)}
                          currentRole={currentUser.role}
                          supplierContacts={supplierContacts}
                          selectedSupplierId={supplierSelection[`${project.id}-${contract.id}`] ?? contract.supplierContactId ?? supplierContacts[0]?.id ?? ""}
                          expanded={expandedContractId === `${project.id}-${contract.id}`}
                          onToggle={() => toggleContract(`${project.id}-${contract.id}`)}
                          onAction={(actionKey) => handleContractAction(project.id, contract.id, actionKey)}
                          onSupplierChange={(contactId) => setSupplierSelection((current) => ({ ...current, [`${project.id}-${contract.id}`]: contactId }))}
                          onAssignSupplier={(invite) => {
                            const contactId = supplierSelection[`${project.id}-${contract.id}`] ?? contract.supplierContactId ?? supplierContacts[0]?.id;
                            const confirmation = assignContractSupplier({ projectId: project.id, contractId: contract.id, contactId: contactId ?? "", invite });
                            setActionNote((current) => ({ ...current, [`${project.id}-${contract.id}`]: confirmation }));
                          }}
                          onCreateSubcontract={() => {
                            setContractFormProjectId(project.id);
                            setContractFormParentContractId(contract.id);
                            setContractDraft({ ...defaultContractDraft(currentUser.name), title: `${contract.title} subcontract`, packageType: "Subcontract", description: `Subcontract package under ${contract.title}.` });
                          }}
                          actionNote={actionNote[`${project.id}-${contract.id}`]}
                        />
                      ))}
                    </div>
                    </div>
                    ) : null}
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

function ScheduleBlock({ dateRange }: { dateRange: string }) {
  const [start, end] = splitDateRange(dateRange);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Start</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#0B0F1A]" title={start}>{start}</p>
      </div>
      <div className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">End</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#0B0F1A]" title={end}>{end}</p>
      </div>
    </div>
  );
}

function ProjectFilesPanel({ project, open, onToggle }: { project: ProjectRecord; open: boolean; onToggle: () => void }) {
  const groups = getProjectFileGroups(project);
  const totalFiles = groups.reduce((count, group) => count + group.attachments.length, 0);
  return (
    <div className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3">
      <DropdownHeader title={`Files (${totalFiles})`} icon={<AttachFileOutlined style={{ fontSize: 17 }} />} open={open} onToggle={onToggle} />
      {open ? (
        <div className="mt-3 space-y-4">
          {groups.map((group) => (
            group.attachments.length > 0 ? (
              <section key={group.title} className="min-w-0">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#667085]">{group.title}</p>
                <AttachmentGrid attachments={group.attachments} layout="list" />
              </section>
            ) : null
          ))}
        </div>
      ) : null}
    </div>
  );
}

function contextLabel(action: string) {
  if (/funding/i.test(action)) return "Funding issue";
  if (/approval/i.test(action)) return "Approval task";
  if (/dispute/i.test(action)) return "Dispute case";
  if (/evidence/i.test(action)) return "Evidence task";
  if (/release/i.test(action)) return "Release task";
  return "Project task";
}

function ContractInlinePanel({
  contract,
  projectFunding,
  workLabel,
  workflow,
  currentRole,
  supplierContacts,
  selectedSupplierId,
  expanded,
  actionNote,
  onToggle,
  onAction,
  onSupplierChange,
  onAssignSupplier,
  onCreateSubcontract,
}: {
  contract: ContractRecord;
  projectFunding: ProjectFundingPosition;
  workLabel: string;
  workflow: WorkflowSurfaceState;
  currentRole: string;
  supplierContacts: typeof demoUsers;
  selectedSupplierId: string;
  expanded: boolean;
  actionNote?: string;
  onToggle: () => void;
  onAction: (actionKey: string) => void;
  onSupplierChange: (contactId: string) => void;
  onAssignSupplier: (invite: boolean) => void;
  onCreateSubcontract: () => void;
}) {
  const lifecycleControls = getLifecycleControls(contract, currentRole);
  const workflowActions = getValidWorkflowActions(contract, workflow, currentRole);
  const requiredAction = workflowActions.find((action) => action.intent === "primary" && action.enabled) ?? workflowActions.find((action) => action.enabled) ?? workflowActions[0];
  const fundingLabel = contractFundingLabel(contract, projectFunding);
  const [contractDetailsOpen, setContractDetailsOpen] = useState(false);
  const [actionDetailsOpen, setActionDetailsOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  return (
    <div className="min-w-0 py-2">
      <button type="button" onClick={onToggle} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#E6E8EC] bg-[#FBFBFC] px-3 py-2 text-left text-sm" aria-expanded={expanded}>
        <div className="min-w-0">
          <span className="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#667085]">{workLabel}</span>
          <p className="truncate font-medium text-[#0B0F1A]" title={contract.title}>{contract.title}</p>
          <p className={`mt-1 truncate text-xs font-semibold ${fundingLabel.warning ? "text-[#B45309]" : "text-[#047857]"}`} title={fundingLabel.detail}>{fundingLabel.label}</p>
          <p className="mt-0.5 truncate text-xs text-[#667085]" title={workflow.nextAction}>{workflow.nextAction}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#667085]">
          {compactCurrency(contract.value)}
          {expanded ? <KeyboardArrowUpOutlined titleAccess="Collapse contract" style={{ fontSize: 16 }} /> : <KeyboardArrowDownOutlined titleAccess="Expand contract" style={{ fontSize: 16 }} />}
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3">
          <section className="border-b border-[#E6E8EC] pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">{workLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#0B0F1A]" title={contract.title}>{contract.title}</p>
                <p className="mt-1 truncate text-xs text-[#667085]" title={contract.supplier}>{contract.supplier}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-[#0B0F1A]">{compactCurrency(contract.value)}</p>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#4B5565]" title={contract.scopeSummary}>{contract.scopeSummary}</p>
          </section>

          <section className="border-b border-[#E6E8EC] pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B7FD8]">{contextLabel(workflow.dominantAction)}</p>
                <p className="truncate text-sm font-semibold text-[#0B0F1A]" title={workflow.dominantAction}>{workflow.dominantAction}</p>
              </div>
              <button
                type="button"
                onClick={() => setActionDetailsOpen((current) => !current)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D7DBE2] bg-white text-[#102345]"
                title="Show action details"
                aria-label="Show action details"
                aria-expanded={actionDetailsOpen}
              >
                {actionDetailsOpen ? <KeyboardArrowUpOutlined style={{ fontSize: 18 }} /> : <KeyboardArrowDownOutlined style={{ fontSize: 18 }} />}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <StatusPill label={fundingLabel.label} tone={fundingLabel.warning ? "warning" : "ok"} />
              <StatusPill label={contract.approvalState} tone={contract.approvalState === "Approved" ? "ok" : contract.approvalState === "Returned" ? "danger" : "neutral"} />
              <StatusPill label={contract.status} tone={contract.status === "Disputed" ? "danger" : "neutral"} />
            </div>
            {actionDetailsOpen ? (
              <div className="mt-3 rounded-2xl border border-[#E6E8EC] bg-[#FBFBFC] px-3 py-3">
                <p className="break-words text-sm leading-6 text-[#4B5565]">{workflow.reason}</p>
                {fundingLabel.warning ? <p className="mt-2 break-words rounded-xl bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#B45309]">Do not proceed - funds not committed. {fundingLabel.detail}</p> : null}
                <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {workflow.requiredActor}</p>
              </div>
            ) : null}
            {requiredAction ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#102345]">
                <WorkflowActionButton action={requiredAction} onPress={() => onAction(requiredAction.key)} />
              </div>
            ) : null}
            {actionNote ? <p className="mt-3 break-words text-xs text-[#667085]">{actionNote}</p> : null}
          </section>

          {lifecycleControls.length > 0 ? (
            <section className="border-b border-[#E6E8EC] py-3">
              <DropdownHeader title="Lifecycle controls" icon={<CheckCircleOutlineOutlined style={{ fontSize: 17 }} />} open={lifecycleOpen} onToggle={() => setLifecycleOpen((current) => !current)} />
              {lifecycleOpen ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {lifecycleControls.map((control) => (
                    <IconLifecycleButton key={control.key} control={control} onPress={() => onAction(control.key)} />
                  ))}
                  {currentRole === "funder" || currentRole === "primary_contractor" ? (
                    <button type="button" onClick={onCreateSubcontract} className="inline-flex items-center gap-1.5 rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 text-[#102345]" title="Create subcontract from this contract">
                      <ReplayOutlined style={{ fontSize: 16 }} />
                      Subcontract
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {currentRole === "funder" || currentRole === "primary_contractor" ? (
            <section className="border-b border-[#E6E8EC] py-3">
              <DropdownHeader title="Supplier assignment" icon={<PersonOutlineOutlined style={{ fontSize: 17 }} />} open={supplierOpen} onToggle={() => setSupplierOpen((current) => !current)} />
              {supplierOpen ? (
              <div className="mt-3 grid gap-2 text-sm">
                <select value={selectedSupplierId} onChange={(event) => onSupplierChange(event.target.value)} className="rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 outline-none">
                  {supplierContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.company}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <button type="button" onClick={() => onAssignSupplier(false)} className="rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 text-[#102345]">
                    Add supplier
                  </button>
                  <button type="button" onClick={() => onAssignSupplier(true)} className="rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-white">
                    Invite supplier
                  </button>
                </div>
              </div>
              ) : null}
            </section>
          ) : null}

          <section className="border-b border-[#E6E8EC] py-3">
            <DropdownHeader title="Contract details" icon={<AssignmentOutlined style={{ fontSize: 17 }} />} open={contractDetailsOpen} onToggle={() => setContractDetailsOpen((current) => !current)} />
            {contractDetailsOpen ? (
              <div className="mt-3 space-y-1.5 text-xs text-[#667085]">
                {dividerRow("Package", contract.packageType ?? "—")}
                {dividerRow("Start", contract.startDate)}
                {dividerRow("End", contract.endDate)}
                {contract.postcode ? dividerRow("Postcode", contract.postcode) : null}
                {contract.what3words ? dividerRow("what3words", contract.what3words) : null}
                {dividerRow("Authority", contract.authority)}
                {dividerRow("Scope", contract.scopeSummary)}
              </div>
            ) : null}
          </section>

          {contract.evidence.length > 0 ? (
            <section className="border-b border-[#E6E8EC] py-3">
              <DropdownHeader title={`Files (${contract.evidence.length})`} icon={<AttachFileOutlined style={{ fontSize: 17 }} />} open={filesOpen} onToggle={() => setFilesOpen((current) => !current)} />
              {filesOpen ? (
                <div className="mt-3">
                  <AttachmentGrid attachments={contractAttachments(contract)} showDetails />
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-1.5 pt-3 text-xs text-[#667085]">
            {dividerRow("Supplier", contract.supplier)}
            {dividerRow("Supplier status", contract.supplierStatus ?? "Accepted")}
            {contract.parentContractId ? dividerRow("Parent contract", contract.parentContractId) : null}
            {dividerRow("Approval status", contract.approvalState)}
            {dividerRow("Funding state", contract.fundingState)}
            {dividerRow("Lifecycle", contract.status)}
            {dividerRow("Evidence", `${contract.filesSummary.totalFiles} files`)}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FundingHint({ project, value }: { project: { fundingSummary?: string; fundingStatus?: string; totalValue?: number }; value: number }) {
  if (!value) return null;
  const available = inferAvailableProjectFunding(project);
  const shortfall = Math.max(0, value - available);
  return (
    <p className={`text-xs ${shortfall > 0 ? "text-[#B45309]" : "text-[#047857]"}`}>
      {shortfall > 0 ? `Funding shortfall: ${currency(shortfall)}. Save as draft until funded.` : `Funding covers this value: ${currency(available)} available.`}
    </p>
  );
}

function DropdownHeader({ title, icon, open, onToggle }: { title: string; icon?: ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
        {icon ? <span className="text-[#102345]">{icon}</span> : null}
        {title}
      </span>
      {open ? <KeyboardArrowUpOutlined titleAccess={`Hide ${title}`} style={{ fontSize: 18 }} /> : <KeyboardArrowDownOutlined titleAccess={`Show ${title}`} style={{ fontSize: 18 }} />}
    </button>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warning" | "danger" | "neutral" }) {
  const className = tone === "ok"
    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#047857]"
    : tone === "warning"
      ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
      : tone === "danger"
        ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
        : "border-[#E6E8EC] bg-white text-[#667085]";
  return <span className={`rounded-full border px-2.5 py-1 ${className}`}>{label}</span>;
}

type ProjectFundingPosition = {
  value: number;
  ringfenced: number;
  committed: number;
  pending: number;
  surplus: number;
  shortfall: number;
  disputed: number;
  coveragePercent: number;
  shortfallContracts: ContractRecord[];
  pendingContracts: ContractRecord[];
  disputedContracts: ContractRecord[];
};

function ProjectFundingSummary({ funding }: { funding: ProjectFundingPosition }) {
  const balanceLabel = funding.shortfall > 0 ? "Shortfall" : "Surplus";
  const balanceValue = funding.shortfall > 0 ? funding.shortfall : funding.surplus;
  return (
    <section className="border-b border-[#E6E8EC] py-4">
      <div className="grid grid-cols-3 gap-2">
        <FundingMetric label="Value" value={funding.value} />
        <FundingMetric label="Funds" value={funding.ringfenced} />
        <FundingMetric label={balanceLabel} value={balanceValue} warning={funding.shortfall > 0} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6E8EC]">
        <div className={`h-full rounded-full ${funding.shortfall > 0 ? "bg-[#D97706]" : "bg-[#047857]"}`} style={{ width: `${funding.coveragePercent}%` }} />
      </div>
    </section>
  );
}

function IssueActionButton({
  label,
  icon,
  tone = "amber",
  active,
  onPress,
}: {
  label: string;
  icon: "money" | "contract";
  tone?: "amber" | "red";
  active: boolean;
  onPress: () => void;
}) {
  const classes = tone === "red"
    ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
    : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  return (
    <button
      type="button"
      onClick={onPress}
      title={label}
      aria-label={label}
      aria-expanded={active}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${classes}`}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        {icon === "money" ? <PaymentsOutlined style={{ fontSize: 20 }} /> : <AssignmentOutlined style={{ fontSize: 20 }} />}
        <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm">
          <WarningAmberOutlined style={{ fontSize: 11 }} />
        </span>
      </span>
      <span>{label}</span>
    </button>
  );
}

function IssueDetail({ title, detail, tone = "amber" }: { title: string; detail: string; tone?: "amber" | "red" }) {
  const classes = tone === "red"
    ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
    : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  return (
    <div className={`mt-3 rounded-2xl border px-3 py-3 ${classes}`}>
      <p className="text-xs font-bold uppercase tracking-[0.08em]">{title}</p>
      <p className="mt-1 text-sm leading-6">{detail}</p>
    </div>
  );
}

function FundingMetric({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">{label}</p>
      <p className={`mt-1 text-sm font-bold ${warning ? "text-[#B45309]" : "text-[#0B0F1A]"}`}>{compactCurrency(value)}</p>
    </div>
  );
}

function getProjectFundingPosition(project: ProjectRecord): ProjectFundingPosition {
  const ringfenced = inferRingfencedProjectFunding(project);
  const activeContracts = project.contracts.filter((contract) => contract.status !== "Cancelled");
  const value = activeContracts.reduce((total, contract) => total + contract.value, 0);
  const committed = activeContracts
    .filter((contract) => contract.fundingState === "Banked" || contract.fundingState === "Available to release" || contract.fundingState === "Released")
    .reduce((total, contract) => total + contract.value, 0);
  const shortfallContracts = activeContracts.filter((contract) => contract.fundingState === "Proof of funds pending");
  const disputedContracts = project.contracts.filter((contract) => contract.status === "Disputed" || contract.fundingState === "Blocked");
  const pendingContracts = activeContracts.filter((contract) => contract.fundingState === "Proof of funds pending" || contract.status === "Draft");
  const pending = shortfallContracts.reduce((total, contract) => total + contract.value, 0);
  const surplus = Math.max(0, ringfenced - value);
  const shortfall = Math.max(0, value - ringfenced);
  const coveragePercent = value > 0 ? Math.max(8, Math.min(100, Math.round((ringfenced / value) * 100))) : 100;

  return {
    value,
    ringfenced,
    committed,
    pending,
    surplus,
    shortfall,
    disputed: disputedContracts.reduce((total, contract) => total + (contract.approvedValue || contract.value), 0),
    coveragePercent,
    shortfallContracts,
    pendingContracts,
    disputedContracts,
  };
}

function projectAccountAction(funding: ProjectFundingPosition, role: string) {
  if (funding.shortfall > 0) return role === "funder" ? "Add funds to keep project on track" : "Request funds from project owner";
  if (funding.disputed > 0) return "Dispute freezes contract value";
  if (funding.pending > 0) return "Commit project funds";
  return "Project funding clear";
}

function projectFundingBlocked(project: ProjectRecord, funding: ProjectFundingPosition) {
  return project.fundingStatus === "Proof of funds pending" || funding.shortfall > 0;
}

function getContractWorkLabel(contract: ContractRecord, company: string, role: string) {
  if (contract.parentContractId) return "Delegated contract";
  if (contract.supplier === company) return "My contract";
  if (role === "funder") return "From my project";
  if (role === "primary_contractor") return "Contract won";
  return "Assigned contract";
}

function getVerifiedFundingAccounts(user: DemoUser) {
  if (user.role !== "funder") return [];
  return [
    {
      id: "harbour-capital-reserve",
      label: "Harbour Capital ****1467",
      meta: "Verified",
    },
    {
      id: "harbour-capital-projects",
      label: "Harbour Capital ****6084",
      meta: "Verified",
    },
  ];
}

function getProjectFileGroups(project: ProjectRecord): Array<{ title: string; attachments: PreviewAttachment[] }> {
  const projectFiles = (project.attachmentsSummary?.length ? project.attachmentsSummary : inferProjectFileNames(project.projectFilesSummary)).map((name, index) => ({
    id: `${project.id}-project-file-${index}`,
    name,
    type: "file" as const,
    fileType: inferFileType(name),
  }));
  const evidenceFiles = project.contracts.flatMap((contract) =>
    contract.evidence
      .filter((item) => contract.status !== "Disputed" && contract.fundingState !== "Blocked")
      .map((item) => evidenceAttachment(item, contract.id)),
  );
  const disputeFiles = project.contracts.flatMap((contract) =>
    contract.status === "Disputed" || contract.fundingState === "Blocked"
      ? [
          ...contract.attachmentsSummary.map((name, index) => ({
            id: `${contract.id}-dispute-file-${index}`,
            name,
            type: "file" as const,
            fileType: inferFileType(name),
          })),
          ...contract.evidence.map((item) => evidenceAttachment(item, contract.id)),
        ]
      : [],
  );

  return [
    { title: "Project files", attachments: projectFiles },
    { title: "Evidence", attachments: evidenceFiles },
    { title: "Dispute linked", attachments: disputeFiles },
  ];
}

function evidenceAttachment(item: ContractRecord["evidence"][number], contractId: string): PreviewAttachment {
  return {
    id: `${contractId}-${item.id}`,
    name: item.title,
    type: item.type === "Photo" ? "image" : "file",
    url: item.type === "Photo" ? placeholderImage(item.title) : undefined,
    fileType: item.type,
  };
}

function inferProjectFileNames(summary: string) {
  if (/no project files/i.test(summary)) return [];
  return ["Project brief.pdf", "Site plan.pdf", "Funding approval.pdf", "Programme schedule.docx"];
}

function inferFileType(name: string) {
  if (/plan|drawing/i.test(name)) return "PLAN";
  if (/reg|policy|approval/i.test(name)) return "REG";
  if (/doc|schedule|note/i.test(name)) return "DOC";
  if (/pdf|certificate|brief/i.test(name)) return "PDF";
  return "FILE";
}

function contractFundingLabel(contract: ContractRecord, funding: ProjectFundingPosition) {
  if (contract.fundingState === "Proof of funds pending") {
    if (funding.shortfall > 0) {
      return { label: "Funding shortfall", detail: `${currency(funding.shortfall)} must be added to the parent project account.`, warning: true };
    }
    return { label: "Funds pending", detail: `${currency(contract.value)} is covered by project funds but not yet committed.`, warning: true };
  }
  if (contract.fundingState === "Blocked") {
    return { label: "Blocked by dispute", detail: `${currency(contract.approvedValue || contract.value)} is frozen until dispute is resolved.`, warning: true };
  }
  if (contract.fundingState === "Banked" || contract.fundingState === "Available to release") {
    return { label: "Funds committed", detail: `${currency(contract.value)} committed from parent project.`, warning: false };
  }
  if (contract.fundingState === "Released") return { label: "Funds released", detail: `${currency(contract.value)} released.`, warning: false };
  return { label: "Funds pending", detail: "Funding commitment pending.", warning: true };
}

function defaultContractDraft(authorityName: string) {
  return {
    title: "",
    packageType: "",
    description: "",
    postcode: "",
    what3words: "",
    startDate: "",
    endDate: "",
    value: "",
    authorityName,
    assignedRole: "Delivery party",
    signOffAuthority: true,
    paymentAuthority: false,
    attachments: "",
  };
}

function splitAttachments(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferAvailableProjectFunding(project: { fundingSummary?: string; fundingStatus?: string; totalValue?: number }) {
  const summary = project.fundingSummary ?? "";
  const availableMatch = summary.match(/£([\d.]+)\s*([mk])?\s+available/i);
  if (availableMatch) return parseAmount(availableMatch[1], availableMatch[2]);
  const balanceMatch = summary.match(/£([\d.]+)\s*([mk])?\s+in bank/i);
  if (balanceMatch) return parseAmount(balanceMatch[1], balanceMatch[2]);
  if (project.fundingStatus === "Funded") return Math.max(project.totalValue ?? 0, 0);
  return 0;
}

function inferRingfencedProjectFunding(project: { fundingSummary?: string; fundingStatus?: string; totalValue?: number }) {
  const summary = project.fundingSummary ?? "";
  const balanceMatch = summary.match(/£([\d.]+)\s*([mk])?\s+in bank/i);
  if (balanceMatch) return parseAmount(balanceMatch[1], balanceMatch[2]);
  const availableMatch = summary.match(/£([\d.]+)\s*([mk])?\s+available/i);
  if (availableMatch) return parseAmount(availableMatch[1], availableMatch[2]);
  return Math.max(project.totalValue ?? 0, 0);
}

function parseAmount(raw: string, unit?: string) {
  const amount = Number(raw) || 0;
  if (unit?.toLowerCase() === "m") return Math.round(amount * 1_000_000);
  if (unit?.toLowerCase() === "k") return Math.round(amount * 1_000);
  return amount;
}

function splitDateRange(dateRange: string) {
  const parts = dateRange.split(/\s+-\s+/);
  if (parts.length >= 2) return [parts[0] || "Start pending", parts.slice(1).join(" - ") || "End pending"] as const;
  if (/draft|pending/i.test(dateRange)) return ["Start pending", dateRange] as const;
  return [dateRange || "Start pending", "End pending"] as const;
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

function getValidWorkflowActions(contract: ContractRecord, workflow: WorkflowSurfaceState, role: string) {
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
