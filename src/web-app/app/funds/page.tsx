"use client";

import { useCallback, useMemo, useState } from "react";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import PaidOutlined from "@mui/icons-material/PaidOutlined";
import RequestQuoteOutlined from "@mui/icons-material/RequestQuoteOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";

import MobileShell from "../components/prototype/MobileShell";
import NotificationFilters, { type FilterScope } from "../components/prototype/NotificationFilters";
import NotificationSystemHeader from "../components/prototype/NotificationSystemHeader";
import { usePrototype } from "../components/PrototypeProvider";
import type { ContractRecord, ProjectRecord } from "@/lib/prototypeData";
import { deriveFundsWorkflowState, deriveStageState, type UnifiedWorkflowControl } from "@/lib/workflowState";

type FundsFilterId = "all" | "required" | "shortfall" | "ready";
type FundsView = "projects" | "contracts";
type FundingAction = "add_funding" | "commit_funds" | "request_funds" | "transfer_funds" | "confirm_release";
type ContractFundingLabel = "Funds committed" | "Funds pending" | "Funding shortfall" | "Request funding" | "Do not proceed";

const fundsScopes: readonly FilterScope<FundsFilterId>[] = [
  { id: "all", label: "All" },
  { id: "required", label: "Required" },
  { id: "shortfall", label: "Shortfall" },
  { id: "ready", label: "Ready" },
];

type ProjectFundingRow = {
  id: string;
  project: ProjectRecord;
  ringfencedBalance: number;
  committedWip: number;
  forecastRequired: number;
  availableHeadroom: number;
  fundingGap: number;
  dominantAction: string;
  nextAction: string;
  reason: string;
  requiredActor: string;
  contracts: ContractFundingRow[];
};

type ContractFundingRow = {
  id: string;
  project: ProjectRecord;
  contract: ContractRecord;
  label: ContractFundingLabel;
  warning?: string;
  value: number;
  committedCover: number;
  forecastRequired: number;
  fundingGap: number;
  workflow: ReturnType<typeof deriveFundsWorkflowState>;
};

export default function FundsPage() {
  const { projects, currentUser, runContractAction, runProjectFundingAction } = usePrototype();
  const [selectedFilter, setSelectedFilter] = useState<FundsFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [fundingFlow, setFundingFlow] = useState<{ id: string; action: FundingAction } | null>(null);
  const [fundingAmount, setFundingAmount] = useState("");
  const [selectedView, setSelectedView] = useState<FundsView>("projects");
  const userRole = currentUser.workflowRole;
  const role = currentUser.role;

  const contractRows = useMemo<ContractFundingRow[]>(
    () =>
      projects.flatMap((project) =>
        project.contracts.map((contract) => {
          const stageState = deriveStageState(contract, contract, project, userRole);
          const workflow = deriveFundsWorkflowState(contract, project, userRole);
          const label = contractFundingLabel(contract, workflow, role, stageState.fundingGap);
          return {
            id: `contract-${project.id}-${contract.id}`,
            project,
            contract,
            label,
            warning: label === "Funds committed" ? undefined : "Do not proceed — funds not committed.",
            value: contract.value,
            committedCover: stageState.availableFundingCover,
            forecastRequired: stageState.totalRequiredWithBuffer,
            fundingGap: stageState.fundingGap,
            workflow,
          };
        }),
      ),
    [projects, role, userRole],
  );

  const projectRows = useMemo<ProjectFundingRow[]>(
    () =>
      projects.map((project) => {
        const contracts = contractRows.filter((row) => row.project.id === project.id);
        const ringfencedBalance = inferAvailableProjectFunding(project);
        const committedWip = contracts.reduce((total, row) => total + Math.max(row.contract.approvedValue, row.contract.fundingState === "Released" ? row.contract.value : 0), 0);
        const forecastRequired = contracts.reduce((total, row) => total + row.forecastRequired, 0);
        const availableHeadroom = Math.max(0, ringfencedBalance - committedWip);
        const fundingGap = Math.max(0, contracts.reduce((total, row) => total + row.fundingGap, 0), forecastRequired - ringfencedBalance);
        const hasReadyRelease = contracts.some((row) => row.workflow.dominantAction === "Release ready");
        const hasPending = contracts.some((row) => row.label !== "Funds committed");
        const dominantAction = fundingGap > 0 ? "Funding shortfall" : hasReadyRelease ? "Release ready" : hasPending ? "Commit funds" : "Funds committed";
        return {
          id: `project-${project.id}`,
          project,
          ringfencedBalance,
          committedWip,
          forecastRequired,
          availableHeadroom,
          fundingGap,
          dominantAction,
          nextAction: fundingGap > 0 ? "Add or transfer funds" : hasReadyRelease ? "Release approved funds" : hasPending ? "Commit contract funds" : "Monitor funding",
          reason: fundingGap > 0
            ? "Project reserve does not cover current commitments and 30-day forecast."
            : hasPending
              ? "One or more child contracts still needs committed funding before proceeding."
              : "Project funding covers current WIP and forecast commitments.",
          requiredActor: role === "funder" || role === "primary_contractor" ? "Project funding authority" : "Funding authority view only",
          contracts,
        };
      }),
    [contractRows, projects, role],
  );

  const visibleProjectRows = useMemo(
    () => filterProjectRows(projectRows, selectedFilter, searchQuery),
    [projectRows, searchQuery, selectedFilter],
  );
  const visibleContractRows = useMemo(
    () => filterContractRows(contractRows, selectedFilter, searchQuery),
    [contractRows, searchQuery, selectedFilter],
  );
  const counts = useMemo(
    () => selectedView === "projects"
      ? {
        all: projectRows.length,
        required: projectRows.filter((row) => row.dominantAction !== "Funds committed").length,
        shortfall: projectRows.filter((row) => row.fundingGap > 0).length,
        ready: projectRows.filter((row) => row.dominantAction === "Release ready").length,
      }
      : {
        all: contractRows.length,
        required: contractRows.filter((row) => row.label !== "Funds committed").length,
        shortfall: contractRows.filter((row) => row.label === "Funding shortfall" || row.label === "Do not proceed").length,
        ready: contractRows.filter((row) => row.workflow.dominantAction === "Release ready").length,
      },
    [contractRows, projectRows, selectedView],
  );
  const totals = useMemo(
    () => ({
      ringfenced: projectRows.reduce((total, row) => total + row.ringfencedBalance, 0),
      committed: projectRows.reduce((total, row) => total + row.committedWip, 0),
      forecast: projectRows.reduce((total, row) => total + row.forecastRequired, 0),
      gap: projectRows.reduce((total, row) => total + row.fundingGap, 0),
      pendingContracts: contractRows.filter((row) => row.label !== "Funds committed").length,
    }),
    [contractRows, projectRows],
  );

  const toggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const runProjectAction = useCallback((row: ProjectFundingRow, actionKey: FundingAction) => {
    const target = row.contracts.find((contractRow) => contractRow.label !== "Funds committed") ?? row.contracts[0];
    const confirmation = actionKey === "request_funds" && target
      ? runContractAction({ projectId: row.project.id, contractId: target.contract.id, actionKey })
      : runProjectFundingAction({ projectId: row.project.id, actionKey, contractId: target?.contract.id });
    setActionNote((current) => ({ ...current, [row.id]: confirmation }));
    setFundingFlow(null);
    setFundingAmount("");
  }, [runContractAction, runProjectFundingAction]);

  const runContractFundingAction = useCallback((row: ContractFundingRow, actionKey: FundingAction) => {
    const confirmation = actionKey === "transfer_funds" || actionKey === "commit_funds"
      ? runProjectFundingAction({ projectId: row.project.id, contractId: row.contract.id, actionKey })
      : runContractAction({ projectId: row.project.id, contractId: row.contract.id, actionKey });
    setActionNote((current) => ({ ...current, [row.id]: confirmation }));
    setFundingFlow(null);
    setFundingAmount("");
  }, [runContractAction, runProjectFundingAction]);

  const openFundingFlow = useCallback((id: string, action: FundingAction) => {
    setFundingFlow({ id, action });
    setFundingAmount("");
  }, []);

  const selectView = useCallback((view: FundsView) => {
    setSelectedView(view);
    setExpandedId(null);
    setFundingFlow(null);
  }, []);

  return (
    <MobileShell title="" headerContent={<NotificationSystemHeader />}>
      <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
        <NotificationFilters
          title="Funds"
          accent="green"
          selected={selectedFilter}
          query={searchQuery}
          counts={counts}
          scopes={fundsScopes}
          placeholder="Search funds, projects, contracts"
          onQueryChange={setSearchQuery}
          onSelect={setSelectedFilter}
        />

        <div className="mt-3 space-y-3">
          <FundsViewToggle selected={selectedView} onSelect={selectView} projectCount={visibleProjectRows.length} contractCount={visibleContractRows.length} />
          <FundsAccountSummary totals={totals} view={selectedView} />

          {selectedView === "projects" ? (
            <FundingSection title="Project funding accounts" icon={<AccountBalanceWalletOutlined style={{ fontSize: 16 }} />}>
              {visibleProjectRows.map((row) => {
                const expanded = expandedId === row.id;
                const actions = projectActions(row, role);
                return (
                  <article key={row.id} className="border-b border-[#E6E8EC] last:border-b-0">
                    <button type="button" onClick={() => toggle(row.id)} className="w-full px-3.5 py-4 text-left active:bg-[#F8FAFC]" aria-expanded={expanded}>
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF8EE] text-[#047857]">
                          <AccountBalanceWalletOutlined style={{ fontSize: 20 }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0B0F1A]" title={row.project.name}>{row.project.name}</p>
                              <p className={`mt-1 text-[13px] font-semibold ${row.fundingGap > 0 ? "text-[#B42318]" : "text-[#047857]"}`}>{row.dominantAction}</p>
                              <p className="mt-1 truncate text-xs font-medium text-[#667085]" title={row.nextAction}>{row.nextAction}</p>
                            </div>
                            <div className="w-[104px] shrink-0 text-right">
                              <p className="text-[13px] font-bold text-[#0B0F1A]">{compactCurrency(row.ringfencedBalance)}</p>
                              <p className="mt-1 text-[11px] text-[#667085]">ringfenced</p>
                            </div>
                          </div>
                          <AccountStackBar row={row} />
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#667085]">
                            <MetricPill label="30-day required" value={compactCurrency(row.forecastRequired)} />
                            <MetricPill label="Gap" value={compactCurrency(row.fundingGap)} tone={row.fundingGap > 0 ? "warning" : "clear"} />
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded ? (
                      <FundingPanel
                        contextLabel="Project funding account"
                        action={projectPanelAction(row, role)}
                        why={projectFundingWarning(row)}
                        requiredActor={row.requiredActor}
                        actions={actions}
                        note={actionNote[row.id]}
                        onAction={(actionKey) => actionKey === "confirm_release" ? runProjectAction(row, actionKey) : openFundingFlow(row.id, actionKey)}
                      >
                        {fundingFlow?.id === row.id ? (
                          <FundingFlowPanel
                            action={fundingFlow.action}
                            amount={fundingAmount}
                            defaultAmount={row.fundingGap || row.forecastRequired}
                            onAmountChange={setFundingAmount}
                            onCancel={() => setFundingFlow(null)}
                            onConfirm={() => runProjectAction(row, fundingFlow.action)}
                          />
                        ) : null}
                        <BalanceCards
                          items={[
                            ["Ringfenced balance", row.ringfencedBalance],
                            ["Committed WIP", row.committedWip],
                            ["30-day forecast", row.forecastRequired],
                            ["Available headroom", row.availableHeadroom],
                            ["Funding gap", row.fundingGap],
                            ["Linked contracts", `${row.contracts.length}`],
                          ]}
                        />
                        <CoverageBar value={row.ringfencedBalance} required={row.committedWip + row.forecastRequired} />
                        <ScheduledFundingTimeline forecast={row.forecastRequired} headroom={row.availableHeadroom} gap={row.fundingGap} contracts={row.contracts} />
                        <LinkedContractsDropdown row={row} />
                      </FundingPanel>
                    ) : null}
                  </article>
                );
              })}
            </FundingSection>
          ) : (
            <FundingSection title="Contract funding commitments" icon={<PaidOutlined style={{ fontSize: 16 }} />}>
              {visibleContractRows.map((row) => {
                const expanded = expandedId === row.id;
                const actions = contractActions(row, role);
                return (
                  <article key={row.id} className="border-b border-[#E6E8EC] last:border-b-0">
                    <button type="button" onClick={() => toggle(row.id)} className="w-full px-3.5 py-4 text-left active:bg-[#F8FAFC]" aria-expanded={expanded}>
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-[#102345]">
                          <PaidOutlined style={{ fontSize: 20 }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0B0F1A]" title={row.contract.title}>{row.contract.title}</p>
                              <p className={`mt-1 text-[13px] font-semibold ${row.label === "Do not proceed" || row.label === "Funding shortfall" ? "text-[#B42318]" : "text-[#047857]"}`}>{row.label}</p>
                              <p className="mt-1 truncate text-xs font-medium text-[#667085]" title={row.project.name}>{row.project.name}</p>
                            </div>
                            <div className="w-[104px] shrink-0 text-right">
                              <p className="text-[13px] font-bold text-[#0B0F1A]">{compactCurrency(row.value)}</p>
                              <p className="mt-1 text-[11px] text-[#667085]">contract</p>
                            </div>
                          </div>
                          <CoverageBar value={row.committedCover} required={row.forecastRequired || row.value} compact />
                          {row.warning ? <p className="mt-2 truncate text-xs font-semibold text-[#B45309]" title={row.warning}>{row.warning}</p> : null}
                        </div>
                      </div>
                    </button>

                    {expanded ? (
                      <FundingPanel
                        contextLabel="Contract funding commitment"
                        action={row.label}
                        why={row.warning ?? row.workflow.reason}
                        requiredActor={fundingActor(role, row)}
                        actions={actions}
                        note={actionNote[row.id]}
                        onAction={(actionKey) => actionKey === "confirm_release" ? runContractFundingAction(row, actionKey) : openFundingFlow(row.id, actionKey)}
                      >
                        {fundingFlow?.id === row.id ? (
                          <FundingFlowPanel
                            action={fundingFlow.action}
                            amount={fundingAmount}
                            defaultAmount={row.fundingGap || Math.max(0, row.value - row.committedCover)}
                            onAmountChange={setFundingAmount}
                            onCancel={() => setFundingFlow(null)}
                            onConfirm={() => runContractFundingAction(row, fundingFlow.action)}
                          />
                        ) : null}
                        {row.warning ? <p className="rounded-2xl border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2 text-xs font-semibold text-[#B45309]">{row.warning}</p> : null}
                        <BalanceCards
                          items={[
                            ["Contract value", row.value],
                            ["Committed cover", row.committedCover],
                            ["30-day forecast", row.forecastRequired],
                            ["Funding gap", row.fundingGap],
                          ]}
                        />
                        <CoverageBar value={row.committedCover} required={row.forecastRequired || row.value} />
                        <ScheduledFundingTimeline forecast={row.forecastRequired} headroom={row.committedCover} gap={row.fundingGap} contracts={[row]} />
                        <div className="space-y-2 border-t border-[#E6E8EC] pt-3">
                          <TransactionLine title="Parent project" meta={row.project.name} value={currency(inferAvailableProjectFunding(row.project))} />
                          <TransactionLine title="Committed amount" meta={row.contract.fundingState} value={currency(row.committedCover)} warning={row.warning} />
                          <TransactionLine title="Remaining amount" meta={row.label} value={currency(Math.max(0, row.value - row.committedCover))} />
                          <TransactionLine title="Evidence / approval gate" meta={`${row.workflow.detailRows.find(([label]) => label === "Evidence")?.[1] ?? "clear"} / ${row.workflow.detailRows.find(([label]) => label === "Approval")?.[1] ?? "pending"}`} value={row.workflow.nextAction} />
                          <TransactionLine title="Release eligibility" meta={row.workflow.reason} value={row.workflow.dominantAction} />
                        </div>
                      </FundingPanel>
                    ) : null}
                  </article>
                );
              })}
            </FundingSection>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function FundingSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E6E8EC] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E6E8EC] px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
        <span className="text-[#047857]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function FundsViewToggle({
  selected,
  onSelect,
  projectCount,
  contractCount,
}: {
  selected: FundsView;
  onSelect: (view: FundsView) => void;
  projectCount: number;
  contractCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#D7DBE2] bg-white p-1 text-xs font-semibold">
      {([
        ["projects", "Project accounts", projectCount],
        ["contracts", "Contract commitments", contractCount],
      ] as const).map(([view, label, count]) => (
        <button
          key={view}
          type="button"
          onClick={() => onSelect(view)}
          className={`rounded-xl px-3 py-2 transition ${selected === view ? "bg-[#EAF8EE] text-[#047857]" : "text-[#667085]"}`}
        >
          {label}
          <span className="ml-1 text-[11px] opacity-75">{count}</span>
        </button>
      ))}
    </div>
  );
}

function FundsAccountSummary({
  totals,
  view,
}: {
  totals: { ringfenced: number; committed: number; forecast: number; gap: number; pendingContracts: number };
  view: FundsView;
}) {
  const required = totals.committed + totals.forecast;
  return (
    <section className="rounded-[22px] border border-[#D7DBE2] bg-white px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">{view === "projects" ? "Funding account" : "Commitment ledger"}</p>
          <p className="mt-1 text-xl font-bold text-[#0B0F1A]">{compactCurrency(totals.ringfenced)}</p>
          <p className="mt-1 text-xs text-[#667085]">{totals.pendingContracts} contract{totals.pendingContracts === 1 ? "" : "s"} pending funding action</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${totals.gap > 0 ? "text-[#B42318]" : "text-[#047857]"}`}>{compactCurrency(totals.gap)}</p>
          <p className="mt-1 text-[11px] text-[#667085]">gap</p>
        </div>
      </div>
      <div className="mt-3">
        <CoverageBar value={totals.ringfenced} required={required} compact />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <MetricPill label="Committed" value={compactCurrency(totals.committed)} />
        <MetricPill label="30-day req." value={compactCurrency(totals.forecast)} />
        <MetricPill label="Headroom" value={compactCurrency(Math.max(0, totals.ringfenced - totals.committed))} tone={totals.gap > 0 ? "warning" : "clear"} />
      </div>
    </section>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone?: "warning" | "clear" }) {
  return (
    <span className={`min-w-0 rounded-xl border px-2 py-1.5 ${tone === "warning" ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B45309]" : tone === "clear" ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#047857]" : "border-[#E6E8EC] bg-white text-[#667085]"}`}>
      <span className="block truncate">{label}</span>
      <span className="mt-0.5 block truncate font-bold text-[#0B0F1A]">{value}</span>
    </span>
  );
}

function AccountStackBar({ row }: { row: ProjectFundingRow }) {
  const required = Math.max(row.ringfencedBalance, row.committedWip + row.forecastRequired, 1);
  const committed = Math.min(100, (row.committedWip / required) * 100);
  const forecast = Math.min(100 - committed, (row.forecastRequired / required) * 100);
  const gap = Math.min(100, (row.fundingGap / required) * 100);
  return (
    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#EEF0F3]" title="Committed WIP, forecast requirement, and gap">
      <div className="flex h-full">
        <span className="bg-[#047857]" style={{ width: `${committed}%` }} />
        <span className="bg-[#8FD9A8]" style={{ width: `${forecast}%` }} />
        {gap > 0 ? <span className="bg-[#F59E0B]" style={{ width: `${gap}%` }} /> : null}
      </div>
    </div>
  );
}

function FundingPanel({
  contextLabel,
  action,
  why,
  requiredActor,
  actions,
  note,
  onAction,
  children,
}: {
  contextLabel: string;
  action: string;
  why: string;
  requiredActor: string;
  actions: UnifiedWorkflowControl[];
  note?: string;
  onAction: (actionKey: FundingAction) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4">
      <section className="border-b border-[#E6E8EC] py-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#047857]">{contextLabel}</p>
        <p className="text-sm font-semibold text-[#0B0F1A]">{action}</p>
        <p className="mt-2 break-words text-sm leading-6 text-[#4B5565]">{why}</p>
        <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {requiredActor}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          {actions.map((control) => <FundingActionButton key={control.key} action={control} onPress={() => onAction(control.key as FundingAction)} />)}
        </div>
        {note ? <p className="mt-3 break-words text-xs text-[#667085]">{note}</p> : null}
      </section>
      <section className="space-y-3 py-4">{children}</section>
    </div>
  );
}

function BalanceCards({ items }: { items: Array<[string, number | string]> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2.5">
          <p className="text-[11px] font-medium text-[#667085]">{label}</p>
          <p className={`mt-1 text-sm font-bold ${label.toLowerCase().includes("gap") && Number(value) > 0 ? "text-[#B42318]" : "text-[#0B0F1A]"}`}>{typeof value === "number" ? compactCurrency(value) : value}</p>
        </div>
      ))}
    </div>
  );
}

function CoverageBar({ value, required, compact = false }: { value: number; required: number; compact?: boolean }) {
  const percent = required > 0 ? Math.min(100, Math.round((value / required) * 100)) : 100;
  return (
    <div className={compact ? "pt-2" : "rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3"}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#0B0F1A]">Coverage</span>
        <span className={percent < 100 ? "font-semibold text-[#B42318]" : "font-semibold text-[#047857]"}>{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF0F3]">
        <div className={`h-full rounded-full ${percent < 100 ? "bg-[#F59E0B]" : "bg-[#10B981]"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ScheduledFundingTimeline({
  forecast,
  headroom,
  gap,
  contracts,
}: {
  forecast: number;
  headroom: number;
  gap: number;
  contracts: ContractFundingRow[];
}) {
  const upcoming = contracts
    .slice()
    .sort((a, b) => b.forecastRequired - a.forecastRequired)
    .slice(0, 4);
  const nextAmount = upcoming[0]?.forecastRequired || forecast;
  return (
    <details className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[#0B0F1A]">
        <span>
          Scheduled forecast
          <span className="ml-2 rounded-full bg-[#EAF8EE] px-2 py-0.5 text-[11px] text-[#047857]">{upcoming.length + 3}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-right text-[11px] font-semibold text-[#667085]">
          Next {compactCurrency(nextAmount)} · +7 days
          <KeyboardArrowDownOutlined titleAccess="Expand scheduled forecast" style={{ fontSize: 16 }} />
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <TimelineEntry date="Today" title="Reserve position checked" meta="Available headroom after current WIP" value={currency(headroom)} />
        <TimelineEntry date="+7 days" title="Committed WIP sweep" meta={`${upcoming.length} linked commitment${upcoming.length === 1 ? "" : "s"} reviewed`} value={currency(upcoming.reduce((total, row) => total + row.committedCover, 0))} />
        <TimelineEntry date="+30 days" title="Forecast funding required" meta="Scheduled project cash cover" value={currency(forecast)} />
        {upcoming.filter((row) => row.contract.approvalState === "Approved").map((row) => (
          <TimelineEntry key={row.id} date="Release" title={row.contract.title} meta="Approved release queued" value={currency(row.contract.approvedValue || row.value)} />
        ))}
        <TimelineEntry date="Gate" title={gap > 0 ? "Shortfall warning" : "Funding gate clear"} meta={gap > 0 ? "Add funds to keep project on track" : "No extra funds required"} value={currency(gap)} warning={gap > 0} />
      </div>
    </details>
  );
}

function TimelineEntry({ date, title, meta, value, warning }: { date: string; title: string; meta: string; value: string; warning?: boolean }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-2">
      <span className={`text-[11px] font-semibold ${warning ? "text-[#B42318]" : "text-[#047857]"}`}>{date}</span>
      <div className="min-w-0 border-l border-[#E6E8EC] pl-3">
        <p className="truncate font-semibold text-[#0B0F1A]" title={title}>{title}</p>
        <p className={`mt-0.5 truncate ${warning ? "text-[#B45309]" : "text-[#667085]"}`} title={meta}>{meta}</p>
      </div>
      <span className="font-bold text-[#0B0F1A]">{value}</span>
    </div>
  );
}

function LinkedContractsDropdown({ row }: { row: ProjectFundingRow }) {
  const committed = row.contracts.filter((contractRow) => contractRow.label === "Funds committed").length;
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  return (
    <details className="rounded-2xl border border-[#E6E8EC] bg-white px-3 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
        <span>
          Contracts linked
          <span className="ml-2 rounded-full bg-[#EAF8EE] px-2 py-0.5 text-[11px] text-[#047857]">{committed}/{row.contracts.length} funded</span>
        </span>
        <KeyboardArrowDownOutlined titleAccess="Expand linked contracts" style={{ fontSize: 16 }} className="text-[#98A2B3]" />
      </summary>
      <div className="mt-3 space-y-2">
        {row.contracts.map((contractRow) => (
          <div key={contractRow.id} className="rounded-xl border border-[#E6E8EC] bg-white">
            <button
              type="button"
              onClick={() => setOpenContractId((current) => current === contractRow.id ? null : contractRow.id)}
              className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left"
              aria-expanded={openContractId === contractRow.id}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#0B0F1A]" title={contractRow.contract.title}>{contractRow.contract.title}</p>
                <p className={`mt-0.5 truncate text-[11px] ${contractRow.warning ? "text-[#B45309]" : "text-[#667085]"}`} title={contractRow.warning ?? contractRow.label}>{contractRow.warning ?? contractRow.label}</p>
              </div>
              <p className="shrink-0 text-xs font-bold text-[#0B0F1A]">{currency(contractRow.value)}</p>
            </button>
            {openContractId === contractRow.id ? (
              <div className="border-t border-[#E6E8EC] px-3 py-2 text-xs">
                <TransactionLine title="Committed" meta={contractRow.contract.fundingState} value={currency(contractRow.committedCover)} warning={contractRow.warning} />
                <TransactionLine title="Remaining" meta={contractRow.label} value={currency(Math.max(0, contractRow.value - contractRow.committedCover))} />
                <TransactionLine title="Gate" meta={contractRow.workflow.nextAction} value={contractRow.workflow.dominantAction} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function FundingFlowPanel({
  action,
  amount,
  defaultAmount,
  onAmountChange,
  onCancel,
  onConfirm,
}: {
  action: FundingAction;
  amount: string;
  defaultAmount: number;
  onAmountChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = action === "add_funding"
    ? "Add funds"
    : action === "request_funds"
      ? "Request funds"
      : action === "commit_funds"
        ? "Commit funds"
        : "Transfer funds";
  return (
    <div className="rounded-2xl border border-[#D7DBE2] bg-white px-3 py-3 text-xs">
      <p className="font-semibold text-[#0B0F1A]">{title}</p>
      <p className="mt-1 text-[#667085]">{flowDescription(action)}</p>
      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">Amount</span>
        <input
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={currency(defaultAmount)}
          inputMode="numeric"
          className="mt-1 w-full rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 text-sm font-semibold text-[#0B0F1A] outline-none"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onConfirm} className="rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 font-semibold text-white">Confirm</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 font-semibold text-[#102345]">Cancel</button>
      </div>
    </div>
  );
}

function flowDescription(action: FundingAction) {
  if (action === "add_funding") return "Top up the project ringfenced reserve.";
  if (action === "request_funds") return "Send a funding request to the project owner.";
  if (action === "commit_funds") return "Assign reserve cover to a contract commitment.";
  return "Move reserve headroom into the selected contract commitment.";
}

function TransactionLine({ title, meta, value, warning }: { title: string; meta: string; value: string; warning?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#E6E8EC] bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[#0B0F1A]" title={title}>{title}</p>
        <p className={`mt-0.5 truncate text-[11px] ${warning ? "text-[#B45309]" : "text-[#667085]"}`} title={warning ?? meta}>{warning ?? meta}</p>
      </div>
      <p className="shrink-0 text-xs font-bold text-[#0B0F1A]">{value}</p>
    </div>
  );
}

function projectFundingWarning(row: ProjectFundingRow) {
  if (row.fundingGap > 0) return `Add funds to keep project on track. Next 30 days requires ${currency(row.forecastRequired)} and the current gap is ${currency(row.fundingGap)}.`;
  if (row.contracts.some((contractRow) => contractRow.label !== "Funds committed")) return "Commit funds to linked contracts before they proceed.";
  return `Funding is on track. Available headroom is ${currency(row.availableHeadroom)} after committed WIP.`;
}

function projectPanelAction(row: ProjectFundingRow, role: string) {
  if (role === "funder") return row.fundingGap > 0 ? "Add funds to keep project on track" : row.nextAction;
  if (role === "primary_contractor") return "Request funds from project owner";
  return row.fundingGap > 0 ? "Funding action required" : row.dominantAction;
}

function projectActions(row: ProjectFundingRow, role: string): UnifiedWorkflowControl[] {
  const canFund = role === "funder";
  const canRequest = role === "primary_contractor";
  if (role === "supplier" || role === "subcontractor" || role === "qs") return [];
  return [
    { key: "add_funding", label: "Add funds", enabled: canFund, intent: "primary" as const },
    { key: "transfer_funds", label: "Transfer funds", enabled: canFund && row.contracts.length > 0 },
    { key: "request_funds", label: "Request funds", enabled: canRequest, intent: "primary" as const },
  ].filter((action) => role === "funder" ? action.key !== "request_funds" : action.key === "request_funds");
}

function contractActions(row: ContractFundingRow, role: string): UnifiedWorkflowControl[] {
  if (role === "supplier" || role === "subcontractor" || role === "qs") return [];
  const canFund = role === "funder";
  const canRelease = role === "funder" && row.workflow.dominantAction === "Release ready" && row.label === "Funds committed";
  const canRequest = role === "primary_contractor" && row.label !== "Funds committed";
  return [
    { key: "commit_funds", label: "Commit funds", enabled: canFund && row.label !== "Funds committed", intent: "primary" as const },
    { key: "request_funds", label: "Request funds", enabled: canRequest },
    { key: "transfer_funds", label: "Transfer funds", enabled: canFund && row.label !== "Funds committed" },
    { key: "confirm_release", label: "Release funds", enabled: canRelease, intent: "primary" as const },
  ].filter((action) => action.enabled || action.key !== "confirm_release");
}

function contractFundingLabel(contract: ContractRecord, workflow: ReturnType<typeof deriveFundsWorkflowState>, role: string, fundingGap: number): ContractFundingLabel {
  if (contract.fundingState === "Blocked") return "Do not proceed";
  if (workflow.dominantAction === "Funding shortfall" && fundingGap > 0) return "Funding shortfall";
  if (contract.fundingState === "Proof of funds pending") return role === "primary_contractor" ? "Request funding" : "Funds pending";
  if (contract.fundingState === "Banked" || contract.fundingState === "Available to release" || contract.fundingState === "Released") return "Funds committed";
  return "Funds pending";
}

function fundingActor(role: string, row: ContractFundingRow) {
  if (role === "funder") return row.workflow.dominantAction === "Release ready" ? "Treasury release authority" : "Treasury funding authority";
  if (role === "primary_contractor") return "Contract owner funding request";
  return "Funding gate view only";
}

function filterProjectRows(rows: ProjectFundingRow[], selectedFilter: FundsFilterId, query: string) {
  return rows.filter((row) => {
    if (selectedFilter === "required" && row.dominantAction === "Funds committed") return false;
    if (selectedFilter === "shortfall" && row.fundingGap === 0) return false;
    if (selectedFilter === "ready" && row.dominantAction !== "Release ready") return false;
    if (!query.trim()) return true;
    const haystack = [row.project.name, row.dominantAction, row.nextAction].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
}

function filterContractRows(rows: ContractFundingRow[], selectedFilter: FundsFilterId, query: string) {
  return rows.filter((row) => {
    if (selectedFilter === "required" && row.label === "Funds committed") return false;
    if (selectedFilter === "shortfall" && row.label !== "Funding shortfall" && row.label !== "Do not proceed") return false;
    if (selectedFilter === "ready" && row.workflow.dominantAction !== "Release ready") return false;
    if (!query.trim()) return true;
    const haystack = [row.project.name, row.contract.title, row.label, row.workflow.nextAction].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
}

function inferAvailableProjectFunding(project: ProjectRecord) {
  const availableMatch = project.fundingSummary.match(/£([\d.]+)\s*([mk])?\s+available/i);
  if (availableMatch) return parseAmount(availableMatch[1], availableMatch[2]);
  const balanceMatch = project.fundingSummary.match(/£([\d.]+)\s*([mk])?\s+in bank/i);
  if (balanceMatch) return parseAmount(balanceMatch[1], balanceMatch[2]);
  if (project.fundingStatus === "Funded") return Math.max(project.totalValue, 0);
  return 0;
}

function parseAmount(raw: string, unit?: string) {
  const amount = Number(raw) || 0;
  if (unit?.toLowerCase() === "m") return Math.round(amount * 1_000_000);
  if (unit?.toLowerCase() === "k") return Math.round(amount * 1_000);
  return amount;
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

function FundingActionButton({ action, onPress }: { action: UnifiedWorkflowControl; onPress: () => void }) {
  const icon = action.key === "add_funding"
    ? <AccountBalanceWalletOutlined style={{ fontSize: 15 }} />
    : action.key === "request_funds"
      ? <RequestQuoteOutlined style={{ fontSize: 15 }} />
      : action.key === "transfer_funds"
        ? <SwapHorizOutlined style={{ fontSize: 15 }} />
        : action.key === "confirm_release"
          ? <PaidOutlined style={{ fontSize: 15 }} />
          : <TrendingUpOutlined style={{ fontSize: 15 }} />;
  return (
    <button
      type="button"
      disabled={!action.enabled}
      title={action.enabled ? action.label : "Not permitted for this role or funding state"}
      onClick={onPress}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        action.intent === "primary" ? "border-[#102345] bg-[#102345] text-white" : "border-[#D7DBE2] bg-white text-[#102345]"
      }`}
    >
      {icon}
      {action.label}
    </button>
  );
}
