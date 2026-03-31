"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Clock3, Landmark, RefreshCcw, ShieldCheck, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { getAppShellHref, type AppShellView } from "./AppSidebar";
import StageReviewPanel from "./StageReviewPanel";
import EvidenceReviewPanel from "./EvidenceReviewPanel";
import TaskFirstWorkspace from "./TaskFirstWorkspace";
import { systemIcons } from "@/lib/icons";
import {
  badgePatterns,
  buttonPatterns,
  inputPatterns,
  layoutPatterns,
  statusToneClasses,
  surfacePatterns,
  transitionTimings,
  typographyScale,
} from "@/lib/designSystem";
import { priorityConfig, PriorityKey } from "@/lib/priorityConfig";
import { actionTypeConfig, type ActionType } from "@/lib/actionConfig";
import {
  addProjectFunds,
  adjustProjectFundingBuffer,
  allocateFundsToStage,
  executeQueueAction,
  getQueueActionDefinition,
  getStageById,
  type AdministrationLifecycleState,
  type AuditLogEntry,
  type ApprovalRole,
  type ContractRecord,
  type QueueActionExecutionResult,
  type StageRecord,
  useStageStore,
} from "@/lib/stageStore";
import {
  type ActionQueueItem,
  deriveControlSummaryForRole,
  deriveFinancialHealthState,
  deriveGuidanceCopy,
  deriveHomeTaskSections,
  deriveRecentCompletedItems,
  type HomeTaskItem,
  deriveOverviewStatusItems,
  derivePrimaryDashboardMetric,
  deriveProjectWorkspaceModel,
  deriveReleaseGroups,
  deriveWorkflowProgressLabel,
  deriveWorkflowState,
  derivePortfolioOverviewModel,
  filterActionsForRole,
  formatRoleLabel,
  getGapDescriptor,
  type PaymentBlockingReason,
  deriveReleaseStageDecision,
  getRoleViewConfig,
  type ProjectControlSummary,
  type ReleaseStageState,
  type ReleaseStageDecision,
  type Role,
} from "@/lib/systemState";

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatGBP(value: number) {
  return gbpFormatter.format(value);
}

function formatRequiredRole(role?: PaymentBlockingReason["nextRequiredRole"]) {
  if (!role) return null;
  return formatRoleLabel(role);
}

function formatProjectHealthLabel(health: "healthy" | "at-risk" | "blocked") {
  if (health === "healthy") return "Healthy";
  if (health === "at-risk") return "At Risk";
  return "Blocked";
}

function projectTrustClasses(trust: "trusted" | "watch" | "critical") {
  if (trust === "trusted") {
    return statusToneClasses.healthy;
  }

  if (trust === "watch") {
    return statusToneClasses["at-risk"];
  }

  return statusToneClasses.critical;
}

function projectHealthClasses(health: "healthy" | "at-risk" | "blocked") {
  if (health === "healthy") {
    return statusToneClasses.healthy;
  }

  if (health === "at-risk") {
    return statusToneClasses["at-risk"];
  }

  return statusToneClasses.blocked;
}

function disclosureToneClasses(tone: "safe" | "attention" | "action" | "info") {
  if (tone === "safe") {
    return "border-green-800/80 bg-green-950/30";
  }

  if (tone === "attention") {
    return "border-amber-800/80 bg-amber-950/25";
  }

  if (tone === "action") {
    return "border-red-800/80 bg-red-950/25";
  }

  return "border-blue-800/80 bg-blue-950/20";
}

function getRoleLabel(role: Role) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function getActionUrgencyTone(state: "healthy" | "at-risk" | "blocked") {
  if (state === "blocked") {
    return `${statusToneClasses.action} bg-red-950/35`;
  }

  if (state === "at-risk") {
    return `${statusToneClasses.attention} bg-amber-950/30`;
  }

  return statusToneClasses.info;
}

function getFundingAccountMeta(projectName: string, bankName: string) {
  const initials = bankName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const seed = projectName.replace(/\s+/g, "").slice(0, 6).toUpperCase();

  return {
    logoText: initials || "BK",
    bankName,
    maskedAccount: `•••• ${seed.slice(-4).padStart(4, "4")}`,
    sortCode: "20-45-78",
  };
}

function formatAuditTimestamp(timestamp: string) {
  return timestampFormatter.format(new Date(timestamp));
}

function formatAuditState(state: AuditLogEntry["newState"]) {
  if (!state) {
    return "No stage state available";
  }

  return `Status: ${state.status} | Evidence: ${state.evidenceStatus} | Funding gate: ${state.fundingGate ? "open" : "blocked"} | Blockers: ${state.blockers.length > 0 ? state.blockers.join(", ") : "none"}`;
}

function getVerificationBadge(status: "verified" | "approved" | "pending") {
  if (status === "verified") {
    return {
      label: "Verified",
      className: "border-blue-700 bg-blue-950/40 text-blue-200",
      Icon: ShieldCheck,
    };
  }

  if (status === "approved") {
    return {
      label: "Approved",
      className: "border-green-700 bg-green-950/40 text-green-200",
      Icon: CheckCircle2,
    };
  }

  return {
    label: "Pending",
    className: "border-amber-700 bg-amber-950/40 text-amber-200",
    Icon: Clock3,
  };
}

function StatusStripSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-full border border-neutral-800 bg-neutral-900/75 px-3 py-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-neutral-800" />
          <div className="mt-1.5 h-4 w-16 animate-pulse rounded-full bg-neutral-700" />
        </div>
      ))}
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className={`${interactiveCardClass} overflow-hidden`} aria-hidden="true">
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <div className={cardHeaderRowClass}>
          <div className="h-4 w-36 animate-pulse rounded-full bg-neutral-800" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-800" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-neutral-800" />
          <div className="h-9 w-40 animate-pulse rounded-full bg-neutral-700" />
          <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-neutral-800" />
          <div className="h-4 w-48 max-w-full animate-pulse rounded-full bg-blue-950/80" />
        </div>
        <div className={cardFooterRowClass}>
          <div className="h-3 w-24 animate-pulse rounded-full bg-neutral-800" />
          <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}

function getAuditEntryRole(entry: AuditLogEntry): ApprovalRole | null {
  switch (entry.actionKey) {
    case "approve-professional":
    case "review-audit":
      return "professional";
    case "approve-commercial":
    case "review-dispute":
    case "review-variation":
      return "commercial";
    case "approve-treasury":
    case "release-funding":
      return "treasury";
    default:
      return null;
  }
}

function getAuditEntryActionType(entry: AuditLogEntry): ActionType | null {
  return getQueueActionDefinition(entry.actionKey)?.type ?? null;
}

const priorityOrder = Object.fromEntries(Object.entries(priorityConfig).map(([k, v]) => [k, v.sortOrder]));
const cardShellClass = surfacePatterns.shell;
const compactMetricCardClass = `${cardShellClass} px-4 py-4`;
const cardBodyClass = layoutPatterns.cardBody;
const cardHeaderRowClass = layoutPatterns.cardHeaderRow;
const cardTitleClass = typographyScale.cardTitle;
const cardPrimaryValueClass = typographyScale.primaryMetric;
const cardSecondaryRowClass = typographyScale.metadata;
const cardFooterRowClass = layoutPatterns.cardFooterRow;
const interactiveCardClass = surfacePatterns.interactive;
const staticInnerCardClass = surfacePatterns.inner;
const pressableClass = `transition-transform ${transitionTimings.fast} active:scale-[0.98]`;
const panelTransitionClass = layoutPatterns.panelTransition;

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "All", label: "Owner" },
  { value: "delivery", label: "Delivery" },
  { value: "professional", label: "Professional" },
  { value: "commercial", label: "Commercial" },
  { value: "treasury", label: "Treasury" },
];

type ShureFundWorkspaceProps = {
  routeView: AppShellView;
  routeProjectId?: string | null;
  projectDetailMode?: boolean;
};

function parseRole(value: string | null): Role {
  return roleOptions.some((option) => option.value === value) ? (value as Role) : "All";
}

export default function ShureFundWorkspace({ routeView, routeProjectId = null, projectDetailMode = false }: ShureFundWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<Role>(() => parseRole(searchParams.get("role")));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => routeProjectId ?? searchParams.get("project") ?? "");
  const [topSummaryExpanded, setTopSummaryExpanded] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<"contracts" | "stages" | "stage-detail">("contracts");
  const [openDashboardSection, setOpenDashboardSection] = useState<string | null>("action-centre");
  // UI state for interactions
  const [selectedStage, setSelectedStage] = useState<StageRecord | null>(null);
  const [evidenceStageId, setEvidenceStageId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [highlightedStageId, setHighlightedStageId] = useState<string | null>(null);
  const [highlightedActionKey, setHighlightedActionKey] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(() => searchParams.get("contract"));
  const [selectedAdminStageId, setSelectedAdminStageId] = useState<string | null>(() => searchParams.get("stage"));
  const [auditStageFilter, setAuditStageFilter] = useState<string>("all");
  const [auditActionTypeFilter, setAuditActionTypeFilter] = useState<string>("all");
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>("all");
  const [projectContractFilter, setProjectContractFilter] = useState<string>("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<ReleaseStageState | "all">("all");
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const activeAppView = routeView;
  const {
    amendContract,
    amendStage,
    auditLog,
    contracts,
    createContract,
    createStage,
    notifications,
    projectFunding,
    projects,
    reconcileNotifications,
    reviewStageApproval,
    resubmitContract,
    resubmitStage,
    setContractLifecycle,
    stages,
    updateNotificationStatus,
    updateContract,
    updateStageAdministration,
    users,
  } = useStageStore();
  const roleConfig = getRoleViewConfig(selectedRole);
  const currentRoleLabel = getRoleLabel(selectedRole);
  const portfolioOverview = useMemo(
    () => derivePortfolioOverviewModel(projects, contracts, stages, projectFunding, users, notifications),
    [projects, contracts, stages, projectFunding, users, notifications],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsPageReady(true);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    setSelectedRole(parseRole(searchParams.get("role")));
    setSelectedProjectId(routeProjectId ?? searchParams.get("project") ?? "");
    setSelectedContractId(searchParams.get("contract"));
    setSelectedAdminStageId(searchParams.get("stage"));
  }, [routeProjectId, searchParams]);

  useEffect(() => {
    if (!selectedProjectId && portfolioOverview.projects[0]) {
      setSelectedProjectId(portfolioOverview.projects[0].project.id);
      setExpandedProjectId(portfolioOverview.projects[0].project.id);
      return;
    }

    if (
      selectedProjectId &&
      !portfolioOverview.projects.some((projectModel) => projectModel.project.id === selectedProjectId) &&
      portfolioOverview.projects[0]
    ) {
      setSelectedProjectId(portfolioOverview.projects[0].project.id);
      setExpandedProjectId(portfolioOverview.projects[0].project.id);
    }
  }, [portfolioOverview.projects, selectedProjectId]);

  const activeProjectModel =
    portfolioOverview.projects.find((projectModel) => projectModel.project.id === selectedProjectId) ??
    portfolioOverview.projects[0] ??
    null;

  const activeProject = activeProjectModel?.project ?? null;
  const fundingAssurance = activeProjectModel?.funding ?? null;
  const funding = fundingAssurance?.position ?? null;
  const releaseControl = activeProjectModel?.releaseControl ?? null;
  const contractAdministration = activeProjectModel?.contractAdministration ?? null;
  const actionQueue = activeProjectModel?.actionQueue ?? [];
  const activeProjectNotifications = activeProject
    ? notifications.filter((notification) => notification.projectId === activeProject.id)
    : [];
  const activeProjectFundingRecord = projectFunding.find((entry) => entry.projectId === activeProject.id) ?? null;
  const fundingBankName =
    activeProjectModel.contracts[0]?.parties.find((party) => party.role === "funder")?.organisation ?? "Controlled Funds Bank";
  const fundingAccountMeta = useMemo(
    () => getFundingAccountMeta(activeProject.name, fundingBankName),
    [activeProject.name, fundingBankName],
  );

  // Role-based filtering helpers
  const isOwnerView = selectedRole === "All";
  const routedNotifications = useMemo(
    () => portfolioOverview.projects.flatMap((projectModel) => projectModel.routedNotifications),
    [portfolioOverview.projects],
  );

  const buildViewHref = (
    view: AppShellView,
    overrides?: {
      role?: Role;
      projectId?: string | null;
      contractId?: string | null;
      stageId?: string | null;
    },
  ) => {
    const params = new URLSearchParams();
    const nextRole = overrides?.role ?? selectedRole;
    const nextProjectId = overrides?.projectId ?? selectedProjectId;
    const nextContractId = overrides?.contractId ?? selectedContractId;
    const nextStageId = overrides?.stageId ?? selectedAdminStageId;

    if (nextRole && nextRole !== "All") {
      params.set("role", nextRole);
    }

    if (nextProjectId && !(view === "projects" && nextProjectId)) {
      params.set("project", nextProjectId);
    }

    if (nextContractId) {
      params.set("contract", nextContractId);
    }

    if (nextStageId) {
      params.set("stage", nextStageId);
    }

    const href = view === "projects" && nextProjectId ? `/projects/${nextProjectId}` : getAppShellHref(view);
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  const navigateToView = (
    view: AppShellView,
    overrides?: {
      role?: Role;
      projectId?: string | null;
      contractId?: string | null;
      stageId?: string | null;
    },
  ) => {
    router.push(buildViewHref(view, overrides), { scroll: false });
  };

  useEffect(() => {
    if (!activeProjectModel) {
      return;
    }

    if (selectedContractId && !activeProjectModel.contracts.some((contract) => contract.id === selectedContractId)) {
      setSelectedContractId(activeProjectModel.contracts[0]?.id ?? null);
    }

    if (selectedAdminStageId && !activeProjectModel.stages.some((stage) => stage.id === selectedAdminStageId)) {
      setSelectedAdminStageId(activeProjectModel.stages[0]?.id ?? null);
    }
  }, [activeProjectModel, selectedAdminStageId, selectedContractId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    setExpandedProjectId(selectedProjectId);
    setAdminView("contracts");
  }, [selectedProjectId]);

  useEffect(() => {
    const nextHref = buildViewHref(activeAppView);
    const currentQuery = searchParams.toString();
    const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (currentHref !== nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [
    activeAppView,
    buildViewHref,
    pathname,
    router,
    searchParams,
    selectedAdminStageId,
    selectedContractId,
    selectedProjectId,
    selectedRole,
  ]);

  useEffect(() => {
    if (!isPageReady) {
      return;
    }

    setIsViewTransitioning(true);
    const timeoutId = window.setTimeout(() => {
      setIsViewTransitioning(false);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [activeAppView, isPageReady]);

  if (!activeProjectModel || !activeProject || !funding || !releaseControl || !contractAdministration) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-16 text-neutral-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 text-center text-neutral-400">
          No active projects are available.
        </div>
      </div>
    );
  }

  const roleScopedActions = filterActionsForRole(actionQueue, selectedRole);
  const filteredActions = roleScopedActions.filter((action) => {
    if (projectContractFilter !== "all") {
      const actionStage = action.stageId ? activeProjectModel.stages.find((stage) => stage.id === action.stageId) ?? null : null;
      if (actionStage && actionStage.contractId !== projectContractFilter) {
        return false;
      }
    }

    if (projectStatusFilter !== "all" && action.stageId) {
      const actionStage = activeProjectModel.stages.find((stage) => stage.id === action.stageId) ?? null;
      if (actionStage && deriveReleaseStageDecision(actionStage, funding).state !== projectStatusFilter) {
        return false;
      }
    }

    return true;
  });
  const sortedActions = [...filteredActions].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
    return aPriority - bPriority;
  });

  useEffect(() => {
    if (openActionId && !sortedActions.some((action) => action.id === openActionId)) {
      setOpenActionId(null);
    }
  }, [openActionId, sortedActions]);

  // Role-aware Control Summary metrics
  const allSummary = releaseControl.summary;

  const filteredControlSummary: Partial<ProjectControlSummary> = deriveControlSummaryForRole(allSummary, selectedRole);

  const groupedReleaseStages = deriveReleaseGroups(releaseControl.stageDecisions, {
    contractId: projectContractFilter,
    state: projectStatusFilter,
  });
  const selectedContractSummary =
    contractAdministration.summaries.find((summary) => summary.contract.id === selectedContractId) ??
    contractAdministration.summaries[0] ??
    null;
  const selectedContractForAdmin = selectedContractSummary?.contract ?? null;
  const selectedAdminStage =
    selectedContractSummary?.stages.find((stage) => stage.id === selectedAdminStageId) ??
    selectedContractSummary?.stages[0] ??
    null;
  const projectWorkspace = deriveProjectWorkspaceModel(activeProjectModel, selectedAdminStageId);
  const selectedAdminStageDecision = selectedAdminStage ? deriveReleaseStageDecision(selectedAdminStage, funding) : null;
  const selectedAdminWorkflow = selectedAdminStage ? deriveWorkflowState(selectedAdminStage, funding) : null;
  const dashboardFinancialStatus = deriveFinancialHealthState({
    gapToRequiredCover: funding.gapToRequiredCover,
    canProceed: funding.canProceed,
    releasableValue: activeProjectModel.metrics.releasableValue,
  });
  const activeProjectRoleActions = filterActionsForRole(activeProjectModel.actionQueue, selectedRole);
  const activeProjectNextAction = activeProjectRoleActions[0] ?? null;
  const activeProjectOverallAction = activeProjectModel.actionQueue[0];
  const activeProjectWaitingRole =
    !activeProjectNextAction && !isOwnerView ? formatRoleLabel(activeProjectOverallAction?.requiredRole ?? null) : null;
  const activeProjectGuidance = deriveGuidanceCopy({
    state: dashboardFinancialStatus,
    gap: funding.gapToRequiredCover,
    canProceed: funding.canProceed,
    releasableValue: activeProjectModel.metrics.releasableValue,
    action: activeProjectNextAction,
    role: selectedRole,
  });
  const projectsRequiringRoleAction = portfolioOverview.projects.filter(
    (projectModel) => filterActionsForRole(projectModel.actionQueue, selectedRole).length > 0,
  );
  const overviewStatusItems = deriveOverviewStatusItems(portfolioOverview, selectedRole);
  const primaryDashboardMetric = derivePrimaryDashboardMetric(fundingAssurance);
  const fundsVerification = getVerificationBadge((activeProjectFundingRecord?.ringfencedFunds ?? 0) > 0 ? "verified" : "pending");
  const releasableVerification = getVerificationBadge(activeProjectModel.metrics.releasableValue > 0 ? "approved" : "pending");
  const controlsVerification = getVerificationBadge(releaseControl.summary.blockedStages === 0 ? "approved" : "pending");
  const homeTaskSections = deriveHomeTaskSections(portfolioOverview, selectedRole);
  const recentCompletedItems = deriveRecentCompletedItems(auditLog, portfolioOverview);
  const reviewItems = activeProjectModel.stages.filter(
    (stage) => stage.evidenceStatus !== "accepted" || stage.completionState === "returned" || stage.completionState === "submitted",
  );
  const approvalItems = sortedActions.filter((action) => action.type === "approval");
  const paymentReadyItems = groupedReleaseStages.releasable;
  const paymentBlockedItems = groupedReleaseStages.blocked;
  const releasedPaymentHistory = auditLog
    .filter((entry) => entry.success && entry.actionKey === "release-funding")
    .slice()
    .reverse();

  const selectedEvidenceStage = evidenceStageId
    ? activeProjectModel.stages.find((stage) => stage.id === evidenceStageId) ?? null
    : null;
  const auditStageOptions = activeProjectModel.stages.map((stage) => ({
    value: stage.id,
    label: stage.name,
  }));
  const auditActionTypeOptions = Array.from(
    new Set(
      auditLog
        .map((entry) => getAuditEntryActionType(entry))
        .filter((actionType): actionType is ActionType => actionType !== null),
    ),
  );
  const filteredAuditLog = auditLog.filter((entry) => {
    const entryActionType = getAuditEntryActionType(entry);
    const entryRole = getAuditEntryRole(entry);
    const inActiveProject = entry.stageId
      ? activeProjectModel.stages.some((stage) => stage.id === entry.stageId)
      : true;

    if (!inActiveProject) {
      return false;
    }

    if (auditStageFilter !== "all" && entry.stageId !== auditStageFilter) {
      return false;
    }

    if (auditActionTypeFilter !== "all" && entryActionType !== auditActionTypeFilter) {
      return false;
    }

    if (auditRoleFilter !== "all" && entryRole !== auditRoleFilter) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (!highlightedStageId && !highlightedActionKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedStageId(null);
      setHighlightedActionKey(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedActionKey, highlightedStageId]);

  useEffect(() => {
    reconcileNotifications(routedNotifications);
  }, [reconcileNotifications, routedNotifications]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuditStageFilter(params.get("auditStage") ?? "all");
    setAuditActionTypeFilter(params.get("auditActionType") ?? "all");
    setAuditRoleFilter(params.get("auditRole") ?? "all");
  }, []);

  const updateAuditFilters = (nextFilters: {
    stage?: string;
    actionType?: string;
    role?: string;
  }) => {
    const params = new URLSearchParams(window.location.search);
    const nextStage = nextFilters.stage ?? auditStageFilter;
    const nextActionType = nextFilters.actionType ?? auditActionTypeFilter;
    const nextRole = nextFilters.role ?? auditRoleFilter;

    if (nextStage === "all") {
      params.delete("auditStage");
    } else {
      params.set("auditStage", nextStage);
    }

    if (nextActionType === "all") {
      params.delete("auditActionType");
    } else {
      params.set("auditActionType", nextActionType);
    }

    if (nextRole === "all") {
      params.delete("auditRole");
    } else {
      params.set("auditRole", nextRole);
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

    setAuditStageFilter(nextStage);
    setAuditActionTypeFilter(nextActionType);
    setAuditRoleFilter(nextRole);
    window.history.replaceState({}, "", nextUrl);
  };

  const showActionFeedback = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2500);
  };

  const applyPostActionFeedback = ({
    message,
    stageId,
    nextActionKey,
  }: {
    message: string;
    stageId: string | null;
    nextActionKey: string | null;
  }) => {
    setHighlightedStageId(stageId);
    setHighlightedActionKey(nextActionKey);
    showActionFeedback(message);
  };

  const handleAction = (action: ActionQueueItem) => {
    const result = executeQueueAction(action.actionKey, action.stageId);
    const updatedStage = result.postActionState?.primaryStageId
      ? getStageById(result.postActionState.primaryStageId)
      : null;
    const nextAction = updatedStage ? deriveReleaseStageDecision(updatedStage, funding).nextAction ?? null : null;
    const actionConfirmation =
      action.type === "approval" && updatedStage
        ? `${formatGBP(updatedStage.value)} marked as approved for controlled release progression.`
        : action.type === "funding" && updatedStage
        ? `${formatGBP(updatedStage.value)} funding position updated in the controlled ledger.`
        : action.type === "completion" && updatedStage
        ? `${updatedStage.name} completion recorded and queued for governed review.`
        : result.message;

    applyPostActionFeedback({
      message: actionConfirmation,
      stageId: result.postActionState?.primaryStageId ?? null,
      nextActionKey: nextAction?.nextRecommendedAction ?? null,
    });
  };

  const handleFundingResult = (result: QueueActionExecutionResult) => {
    applyPostActionFeedback({
      message: result.message,
      stageId: result.postActionState?.primaryStageId ?? null,
      nextActionKey: result.postActionState?.nextActions[0]?.actionKey ?? null,
    });
  };

  const filterRelevantBlockingReasons = (blockingReasons: PaymentBlockingReason[]) => {
    if (selectedRole === "All") {
      return blockingReasons;
    }

    switch (selectedRole) {
      case "treasury":
        return blockingReasons.filter((reason) => reason.nextRequiredRole === "treasury" || reason.category === "funding");
      case "funder":
        return blockingReasons.filter((reason) => reason.nextRequiredRole === "funder" || reason.category === "funding");
      case "commercial":
        return blockingReasons.filter(
          (reason) => reason.nextRequiredRole === "commercial" || reason.category === "dispute" || reason.category === "variation",
        );
      case "delivery":
        return blockingReasons.filter((reason) => reason.nextRequiredRole === "delivery" || reason.category === "evidence");
      case "professional":
        return blockingReasons.filter((reason) => reason.nextRequiredRole === "professional");
      default:
        return blockingReasons;
    }
  };

  const renderReleaseStageCard = (decision: ReleaseStageDecision) => {
    const { stage } = decision;
    const contract = activeProjectModel.contracts.find((item) => item.id === stage.contractId);
    const relevantBlockers = filterRelevantBlockingReasons(decision.blockers);
    const highlighted = stage.id === highlightedStageId;
    const nextAction = decision.nextAction
      ? `Your next action: ${decision.nextAction.label}${
          decision.nextAction.nextRequiredRole ? ` (${formatRequiredRole(decision.nextAction.nextRequiredRole)})` : ""
        }`
      : null;

    return (
      <div
        key={stage.id}
        className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 ${
          highlighted
            ? "bg-blue-950/30 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]"
            : staticInnerCardClass
        }`}
      >
        <div className={cardHeaderRowClass}>
          <div className="min-w-0">
            <div className={cardTitleClass}>{stage.name}</div>
          </div>
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            decision.releasable ? "bg-green-700 text-green-100" : decision.state === "blocked" ? "bg-red-700 text-red-100" : "bg-amber-700 text-amber-100"
          }`}>
            {decision.releasable ? "Ready for Payment" : decision.state === "blocked" ? "Blocked" : "Attention Required"}
          </span>
        </div>
        <div className={`${cardPrimaryValueClass} ${decision.releasable ? "text-green-300" : decision.state === "blocked" ? "text-red-300" : "text-amber-300"}`}>
          {formatGBP(stage.value)}
        </div>
        <div className={cardSecondaryRowClass}>
          {contract?.title || stage.contractId} · {decision.releasable ? "All release conditions satisfied" : `${decision.blockers.length} blocking reason${decision.blockers.length !== 1 ? "s" : ""}`}
        </div>
        <ul className="ml-1 mt-1 text-xs text-neutral-400 list-disc pl-4">
          {decision.releasable ? (
            <li>All release conditions satisfied</li>
          ) : (
            decision.blockers.map((reason, idx: number) => (
              <li
                key={idx}
                className={
                  selectedRole !== "All" && relevantBlockers.some((item) => item.code === reason.code)
                    ? "font-bold text-amber-300"
                    : undefined
                }
              >
                {reason.label}
                {reason.nextRequiredRole ? ` - Next role: ${formatRequiredRole(reason.nextRequiredRole)}` : ""}
              </li>
            ))
          )}
        </ul>
        {nextAction ? (
          <div className="text-xs text-blue-300 mt-1 italic">{nextAction}</div>
        ) : null}
        <div className={cardFooterRowClass}>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
              onClick={() => {
                setSelectedStage(stage);
              }}
            >View Details</button>
            <button
              className="rounded-full bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              onClick={() => {
                setEvidenceStageId(stage.id);
              }}
            >Review Evidence</button>
          </div>
          {highlighted ? (
            <span className="rounded-full border border-blue-500/60 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300">
              Just updated
            </span>
          ) : (
            <span>{stage.plannedEnd}</span>
          )}
        </div>
      </div>
    );
  };

  const handleCreateContract = (draft: {
    projectIdentity: string;
    title: string;
    summary: string;
    employerName: string;
    deliveryPartnerName: string;
    funderName: string;
    administratorName: string;
    totalValue: string;
    allocatedFunding: string;
    fundingModel: ContractRecord["fundingStructure"]["model"];
    reserveHeld: string;
    releaseRule: string;
    signOffMode: ContractRecord["signOffModel"]["mode"];
    requiredRoles: ApprovalRole[];
    lifecycle: AdministrationLifecycleState;
  }) => {
    const contract = createContract({
      projectId: activeProject.id,
      projectIdentity: draft.projectIdentity,
      title: draft.title,
      summary: draft.summary,
      parties: [
        { role: "employer", name: draft.employerName, organisation: "Client Team" },
        { role: "delivery-partner", name: draft.deliveryPartnerName, organisation: "BuildCo" },
        { role: "funder", name: draft.funderName, organisation: "FundBank" },
        { role: "administrator", name: draft.administratorName, organisation: "AssurePro" },
      ],
      totalValue: Number(draft.totalValue) || 0,
      allocatedFunding: Number(draft.allocatedFunding) || 0,
      fundingStructure: {
        model: draft.fundingModel,
        reserveHeld: Number(draft.reserveHeld) || 0,
        releaseRule: draft.releaseRule,
      },
      signOffModel: {
        mode: draft.signOffMode,
        requiredRoles: draft.requiredRoles,
      },
      lifecycle: draft.lifecycle,
    });

    if (!contract) {
      showActionFeedback("Contract could not be created for the current user.");
      return;
    }

    setSelectedContractId(contract.id);
    setSelectedAdminStageId(null);
    showActionFeedback(`Contract ${contract.title} created.`);
  };

  const handleUpdateContract = (contractId: string, draft: {
    projectIdentity: string;
    title: string;
    summary: string;
    employerName: string;
    deliveryPartnerName: string;
    funderName: string;
    administratorName: string;
    totalValue: string;
    allocatedFunding: string;
    fundingModel: ContractRecord["fundingStructure"]["model"];
    reserveHeld: string;
    releaseRule: string;
    signOffMode: ContractRecord["signOffModel"]["mode"];
    requiredRoles: ApprovalRole[];
    lifecycle: AdministrationLifecycleState;
  }) => {
    const nextContract = updateContract(contractId, {
      projectIdentity: draft.projectIdentity,
      title: draft.title,
      summary: draft.summary,
      parties: [
        { role: "employer", name: draft.employerName, organisation: "Client Team" },
        { role: "delivery-partner", name: draft.deliveryPartnerName, organisation: "BuildCo" },
        { role: "funder", name: draft.funderName, organisation: "FundBank" },
        { role: "administrator", name: draft.administratorName, organisation: "AssurePro" },
      ],
      totalValue: Number(draft.totalValue) || 0,
      allocatedFunding: Number(draft.allocatedFunding) || 0,
      fundingStructure: {
        model: draft.fundingModel,
        reserveHeld: Number(draft.reserveHeld) || 0,
        releaseRule: draft.releaseRule,
      },
      signOffModel: {
        mode: draft.signOffMode,
        requiredRoles: draft.requiredRoles,
      },
      lifecycle: draft.lifecycle,
    });

    if (nextContract) {
      setSelectedContractId(nextContract.id);
      showActionFeedback(`Contract ${nextContract.title} updated.`);
    }
  };

  const handleCreateStage = (contractId: string, draft: {
    name: string;
    plannedStart: string;
    plannedEnd: string;
    value: string;
    requiredEvidence: string;
    requiredApprovers: ApprovalRole[];
    lifecycle: AdministrationLifecycleState;
    fundingStatus: "unfunded" | "reserved" | "funded";
    disputeState: "none" | "open" | "resolved";
    variationState: "none" | "pending" | "approved";
  }) => {
    const nextStage = createStage(contractId, {
      name: draft.name,
      lifecycle: draft.lifecycle,
      plannedStart: draft.plannedStart,
      plannedEnd: draft.plannedEnd,
      value: Number(draft.value) || 0,
      requiredEvidence: draft.requiredEvidence.split(",").map((item) => item.trim()).filter(Boolean),
      requiredApprovers: draft.requiredApprovers,
      fundingGate: draft.fundingStatus === "funded",
      fundingStatus: draft.fundingStatus,
      disputeState: draft.disputeState,
      variationState: draft.variationState,
    });

    if (nextStage) {
      setSelectedContractId(contractId);
      setSelectedAdminStageId(nextStage.id);
      showActionFeedback(`Stage ${nextStage.name} created.`);
    }
  };

  const handleUpdateStageAdministration = (stageId: string, draft: {
    name: string;
    plannedStart: string;
    plannedEnd: string;
    value: string;
    requiredEvidence: string;
    requiredApprovers: ApprovalRole[];
    lifecycle: AdministrationLifecycleState;
    fundingStatus: "unfunded" | "reserved" | "funded";
    disputeState: "none" | "open" | "resolved";
    variationState: "none" | "pending" | "approved";
  }) => {
    const nextStage = updateStageAdministration(stageId, {
      name: draft.name,
      lifecycle: draft.lifecycle,
      plannedStart: draft.plannedStart,
      plannedEnd: draft.plannedEnd,
      value: Number(draft.value) || 0,
      requiredEvidence: draft.requiredEvidence.split(",").map((item) => item.trim()).filter(Boolean),
      requiredApprovers: draft.requiredApprovers,
      fundingGate: draft.fundingStatus === "funded",
      fundingStatus: draft.fundingStatus,
      disputeState: draft.disputeState,
      variationState: draft.variationState,
    });

    if (nextStage) {
      setSelectedAdminStageId(nextStage.id);
      showActionFeedback(`Stage ${nextStage.name} updated.`);
    }
  };

  const openStageWorkspace = (projectId: string, stageId?: string | null, view: AppShellView = "projects") => {
    setSelectedProjectId(projectId);
    let nextContractId: string | null = selectedContractId;

    if (stageId) {
      const stage = getStageById(stageId);
      setSelectedAdminStageId(stageId);
      if (stage) {
        nextContractId = stage.contractId;
        setSelectedContractId(stage.contractId);
      }
      setAdminView("stage-detail");
    } else {
      setSelectedAdminStageId(null);
      setAdminView("contracts");
    }

    navigateToView(view, {
      projectId,
      contractId: nextContractId,
      stageId: stageId ?? null,
    });
  };

  const simpleProgressTone = (label: ReturnType<typeof deriveWorkflowProgressLabel>) => {
    switch (label) {
      case "Approved":
      case "Ready for approval":
      case "Ready for release":
      case "Released":
        return "border-green-200 bg-green-50 text-green-700";
      case "Blocked":
        return "border-red-200 bg-red-50 text-red-700";
      case "Waiting":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "In review":
        return "border-blue-200 bg-blue-50 text-blue-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  const handleApprovalReview = (stageId: string, role: ApprovalRole, action: "approve" | "reject" | "request-more") => {
    const result = reviewStageApproval(stageId, role, action);
    applyPostActionFeedback({
      message: result.message,
      stageId: result.postActionState?.primaryStageId ?? null,
      nextActionKey: result.postActionState?.nextActions[0]?.actionKey ?? null,
    });
  };

  return (
    <>
      <TaskFirstWorkspace
      activeAppView={activeAppView}
      onChangeView={(view) => navigateToView(view)}
      selectedRole={selectedRole}
      onChangeRole={(role) => {
        setSelectedRole(role);
        navigateToView(activeAppView, { role });
      }}
      roleOptions={roleOptions}
      currentRoleLabel={currentRoleLabel}
      projectDetailMode={projectDetailMode}
      activeProject={activeProject}
      activeProjectModel={activeProjectModel}
      portfolioOverview={portfolioOverview}
      overviewStatusItems={overviewStatusItems}
      fundsVerification={fundsVerification}
      controlsVerification={controlsVerification}
      lastSyncLabel={activeProjectFundingRecord ? formatAuditTimestamp(activeProjectFundingRecord.lastUpdatedAt) : "Awaiting sync"}
      actionMessage={actionMessage}
      isPageReady={isPageReady}
      isViewTransitioning={isViewTransitioning}
      homeTaskSections={homeTaskSections}
      recentCompletedItems={recentCompletedItems}
      reviewItems={reviewItems}
      approvalItems={approvalItems}
      paymentReadyItems={paymentReadyItems}
      paymentBlockedItems={paymentBlockedItems}
      releasedPaymentHistory={releasedPaymentHistory}
      selectedContractSummary={selectedContractSummary}
      selectedContractForAdmin={selectedContractForAdmin}
      selectedAdminStage={selectedAdminStage}
      selectedAdminStageDecision={selectedAdminStageDecision}
      selectedAdminWorkflow={selectedAdminWorkflow}
      projectWorkspace={projectWorkspace}
      fundingAssurance={fundingAssurance}
      funding={funding}
      filteredAuditLog={filteredAuditLog}
      auditLog={auditLog}
      auditStageFilter={auditStageFilter}
      auditActionTypeFilter={auditActionTypeFilter}
      auditRoleFilter={auditRoleFilter}
      auditStageOptions={auditStageOptions}
      auditActionTypeOptions={auditActionTypeOptions}
      actionTypeLabels={Object.fromEntries(auditActionTypeOptions.map((actionType) => [actionType, actionTypeConfig[actionType].label]))}
      onUpdateAuditFilters={updateAuditFilters}
      onSelectProject={(projectId) => {
        setSelectedProjectId(projectId);
        setProjectContractFilter("all");
        setProjectStatusFilter("all");
        navigateToView(activeAppView, { projectId, contractId: null, stageId: null });
      }}
      onSelectContract={(contractId) => {
        setSelectedContractId(contractId);
        navigateToView(activeAppView, { contractId, stageId: null });
      }}
      onSelectStage={(stageId) => {
        const stage = getStageById(stageId);
        setSelectedAdminStageId(stageId);
        if (stage) {
          setSelectedContractId(stage.contractId);
        }
        setAdminView("stage-detail");
        navigateToView(activeAppView, { stageId, contractId: stage?.contractId ?? selectedContractId });
      }}
      onOpenStageWorkspace={openStageWorkspace}
      onOpenEvidenceReview={setEvidenceStageId}
      onOpenStageReview={setSelectedStage}
      onHandleAction={handleAction}
      onFundingAction={(action, stageId) => {
        if (action === "add-funds") {
          handleFundingResult(addProjectFunds(activeProject.id, Math.max(funding.gapToRequiredCover, 50000)));
          return;
        }
        if (action === "adjust-buffer") {
          handleFundingResult(adjustProjectFundingBuffer(activeProject.id, funding.reserveBuffer + 25000));
          return;
        }
        if (stageId) {
          const forecast = fundingAssurance.stageForecasts.find((item) => item.stageId === stageId);
          if (forecast) {
            handleFundingResult(allocateFundsToStage(stageId, forecast.remainingRequirement));
          }
        }
      }}
      onApprovalReview={handleApprovalReview}
      getStageById={getStageById}
      formatGBP={formatGBP}
      formatTimestamp={formatAuditTimestamp}
      formatAuditState={formatAuditState}
      formatRequiredRole={formatRequiredRole}
      getGapDescriptor={getGapDescriptor}
      deriveWorkflowProgressTone={simpleProgressTone}
      />

      {/* Panels */}
      <StageReviewPanel
        stage={selectedStage}
        onClose={() => {
          setSelectedStage(null);
        }}
      />
      <EvidenceReviewPanel
        stageId={selectedEvidenceStage?.id ?? null}
        evidenceItems={selectedEvidenceStage?.evidenceItems ?? []}
        onClose={() => {
          setEvidenceStageId(null);
        }}
      />
    </>
  );
}
