/**
 * supabaseQueries.ts
 *
 * Fetches all data needed to populate SystemStateRecord from Supabase.
 *
 * Schema notes:
 *  - contract_stages belong to contracts which belong to projects (no direct project_id on stage)
 *  - evidence has stage_id but no separate evidence_requirements table
 *  - approvals.approved_by stores the designated approver (NOT NULL in schema)
 *  - variations uses description/value_change, not title/amountDelta
 *  - wallets + wallet_transactions map to ledgerAccounts + ledgerEntries
 *  - no disputes table — stage status 'disputed' and audit_events carry dispute context
 *
 * DB stage_status → app StageStatus mapping:
 *   draft / sent / accepted / in_progress / awaiting_approval / returned / funding_gap / part_funded → blocked / in_review
 *   disputed → disputed
 *   available_to_release → approved
 *   released → released
 */

import type {
  ApprovalRecord,
  EvidenceRecord,
  EvidenceRequirementRecord,
  LedgerAccountRecord,
  LedgerEntryRecord,
  ProjectRecord,
  SystemStageRecord,
  SystemStateRecord,
  UserRecord,
  VariationRecord,
} from "./shureFundModels";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// DB row types (snake_case as returned by Supabase)
// ---------------------------------------------------------------------------

type DbUser = {
  id: string;
  full_name: string;
  role: string;
};

type DbProject = {
  id: string;
  name: string;
  address: string;
  status: string;
};

type DbContract = {
  id: string;
  project_id: string;
  contractor_id: string;
};

type DbStage = {
  id: string;
  contract_id: string;
  name: string;
  description: string | null;
  value: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type DbEvidence = {
  id: string;
  stage_id: string;
  file_url: string;
  file_type: string;
  status: string;
  uploaded_at: string;
  notes: string | null; // used to store display name
};

type DbApproval = {
  id: string;
  stage_id: string;
  approved_by: string;
  role: string;
  decision: string;
  created_at: string;
};

type DbVariation = {
  id: string;
  stage_id: string;
  description: string;
  value_change: number;
  requested_by: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

type DbWallet = {
  id: string;
  project_id: string;
  balance: number;
  available_amount: number;
};

type DbWalletTransaction = {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  reference: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Stage status mapping
// ---------------------------------------------------------------------------

function mapStageStatus(dbStatus: string): SystemStageRecord["status"] {
  switch (dbStatus) {
    case "available_to_release":
      return "approved";
    case "released":
      return "released";
    case "disputed":
      return "disputed";
    case "awaiting_approval":
      return "in_review";
    case "in_progress":
      return "in_review";
    case "sent":
    case "accepted":
      return "in_review";
    case "funding_gap":
    case "part_funded":
    case "returned":
    case "draft":
    default:
      return "blocked";
  }
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchSystemState(currentUserId: string): Promise<SystemStateRecord> {
  const [
    usersResult,
    projectsResult,
    contractsResult,
    stagesResult,
    evidenceResult,
    approvalsResult,
    variationsResult,
    walletsResult,
    walletTxResult,
  ] = await Promise.all([
    supabase.from("users").select("id, full_name, role"),
    supabase.from("projects").select("id, name, address, status"),
    supabase.from("contracts").select("id, project_id, contractor_id"),
    supabase.from("contract_stages").select("id, contract_id, name, description, value, status, start_date, end_date"),
    supabase.from("evidence").select("id, stage_id, file_url, file_type, status, uploaded_at, notes"),
    supabase.from("approvals").select("id, stage_id, approved_by, role, decision, created_at"),
    supabase.from("variations").select("id, stage_id, description, value_change, requested_by, status, approved_by, approved_at, created_at"),
    supabase.from("wallets").select("id, project_id, balance, available_amount"),
    supabase.from("wallet_transactions").select("id, wallet_id, amount, type, reference, created_at"),
  ]);

  // Surface any errors
  const firstError =
    usersResult.error ??
    projectsResult.error ??
    contractsResult.error ??
    stagesResult.error ??
    evidenceResult.error ??
    approvalsResult.error ??
    variationsResult.error ??
    walletsResult.error ??
    walletTxResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const dbUsers = (usersResult.data ?? []) as DbUser[];
  const dbProjects = (projectsResult.data ?? []) as DbProject[];
  const dbContracts = (contractsResult.data ?? []) as DbContract[];
  const dbStages = (stagesResult.data ?? []) as DbStage[];
  const dbEvidence = (evidenceResult.data ?? []) as DbEvidence[];
  const dbApprovals = (approvalsResult.data ?? []) as DbApproval[];
  const dbVariations = (variationsResult.data ?? []) as DbVariation[];
  const dbWallets = (walletsResult.data ?? []) as DbWallet[];
  const dbWalletTx = (walletTxResult.data ?? []) as DbWalletTransaction[];

  // ---------------------------------------------------------------------------
  // Build lookup maps
  // ---------------------------------------------------------------------------

  // contract_id → project_id, contractor user id
  const contractMap = new Map(dbContracts.map((c) => [c.id, c]));

  // wallet_id → project_id
  const walletToProject = new Map(dbWallets.map((w) => [w.id, w.project_id]));

  // stage_id → [variations]
  const variationsByStage = new Map<string, DbVariation[]>();
  for (const v of dbVariations) {
    const existing = variationsByStage.get(v.stage_id) ?? [];
    existing.push(v);
    variationsByStage.set(v.stage_id, existing);
  }

  // stage_id → [approvals]
  const approvalsByStage = new Map<string, DbApproval[]>();
  for (const a of dbApprovals) {
    const existing = approvalsByStage.get(a.stage_id) ?? [];
    existing.push(a);
    approvalsByStage.set(a.stage_id, existing);
  }

  // stage_id → [evidence]
  const evidenceByStage = new Map<string, DbEvidence[]>();
  for (const e of dbEvidence) {
    const existing = evidenceByStage.get(e.stage_id) ?? [];
    existing.push(e);
    evidenceByStage.set(e.stage_id, existing);
  }

  // user id → user name (for contractor name lookup)
  const userNameById = new Map(dbUsers.map((u) => [u.id, u.full_name]));

  // ---------------------------------------------------------------------------
  // Transform users
  // ---------------------------------------------------------------------------
  const users: UserRecord[] = dbUsers.map((u) => ({
    id: u.id,
    name: u.full_name,
    role: u.role as UserRecord["role"],
  }));

  // ---------------------------------------------------------------------------
  // Transform projects
  // ---------------------------------------------------------------------------
  const projects: ProjectRecord[] = dbProjects.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.address,
    status: p.status,
    reserveBuffer: 0, // not stored in schema — default
  }));

  // ---------------------------------------------------------------------------
  // Transform stages
  // ---------------------------------------------------------------------------
  const stages: SystemStageRecord[] = dbStages.map((s) => {
    const contract = contractMap.get(s.contract_id);
    const projectId = contract?.project_id ?? "";
    const project = dbProjects.find((p) => p.id === projectId);
    const contractorName = contract ? (userNameById.get(contract.contractor_id) ?? "") : "";

    const stageApprovals = approvalsByStage.get(s.id) ?? [];
    const requiredApprovalRoles = stageApprovals
      .map((a) => a.role as SystemStageRecord["requiredApprovalRoles"][number])
      .filter((role, idx, arr) => arr.indexOf(role) === idx);

    const stageEvidence = evidenceByStage.get(s.id) ?? [];
    const evidenceRequirementIds = stageEvidence.map((e) => e.id);

    const stageVariations = variationsByStage.get(s.id) ?? [];
    const variations: VariationRecord[] = stageVariations.map((v) => ({
      id: v.id,
      stageId: v.stage_id,
      title: v.description,
      reason: v.description,
      amountDelta: v.value_change,
      status: v.status as VariationRecord["status"],
      createdBy: v.requested_by,
      createdAt: v.created_at,
      commercialApprovedBy: v.approved_by ?? undefined,
      commercialApprovedAt: v.approved_at ?? undefined,
    }));

    // Disputes are not in the schema — stages with status 'disputed' show as disputed
    // Dispute detail would require a separate disputes table or audit_events query
    const disputes = s.status === "disputed"
      ? [
          {
            id: `dispute-${s.id}`,
            stageId: s.id,
            title: "Stage under dispute",
            reason: "This stage has been flagged for dispute resolution.",
            disputedAmount: 0,
            status: "open" as const,
            openedBy: "",
            openedAt: s.start_date ?? new Date().toISOString(),
          },
        ]
      : [];

    return {
      id: s.id,
      projectId,
      projectName: project?.name ?? "",
      projectLocation: project?.address ?? "",
      name: s.name,
      description: s.description ?? "",
      plannedStartDate: s.start_date ?? "",
      plannedEndDate: s.end_date ?? "",
      status: mapStageStatus(s.status),
      requiredAmount: s.value,
      releasedAmount: 0, // computed from releases table — not fetched here for simplicity
      evidenceRequirementIds,
      requiredApprovalRoles,
      contractorName,
      subcontractorName: "",
      overrideActive: false,
      disputes,
      variations,
    };
  });

  // ---------------------------------------------------------------------------
  // Transform evidence (each DB evidence = one requirement + one submission)
  // ---------------------------------------------------------------------------
  const evidenceRequirements: EvidenceRequirementRecord[] = dbEvidence.map((e) => ({
    id: e.id,
    stageId: e.stage_id,
    label: e.notes ?? e.file_type,
    type: (e.file_type === "form" ? "form" : "file") as EvidenceRequirementRecord["type"],
    required: true,
  }));

  const evidence: EvidenceRecord[] = dbEvidence.map((e) => ({
    id: `submission-${e.id}`,
    stageId: e.stage_id,
    type: (e.file_type === "form" ? "form" : "file") as EvidenceRecord["type"],
    status: e.status as EvidenceRecord["status"],
    requirementId: e.id,
    name: e.notes ?? e.file_type,
    submittedAt: e.uploaded_at,
  }));

  // ---------------------------------------------------------------------------
  // Transform approvals
  // ---------------------------------------------------------------------------
  const approvals: ApprovalRecord[] = dbApprovals.map((a) => ({
    id: a.id,
    stageId: a.stage_id,
    role: a.role as ApprovalRecord["role"],
    status: (a.decision === "approved" ? "approved" : a.decision === "rejected" ? "rejected" : "pending") as ApprovalRecord["status"],
    approvedAt: a.decision === "approved" ? a.created_at : undefined,
    approvedBy: a.decision === "approved" ? a.approved_by : undefined,
  }));

  // ---------------------------------------------------------------------------
  // Transform wallets → ledger accounts + entries
  // ---------------------------------------------------------------------------
  const ledgerAccounts: LedgerAccountRecord[] = dbWallets.map((w) => ({
    id: w.id,
    name: dbProjects.find((p) => p.id === w.project_id)?.name ?? "Project wallet",
    balance: w.balance,
    projectId: w.project_id,
  }));

  const ledgerEntries: LedgerEntryRecord[] = dbWalletTx.map((tx) => ({
    id: tx.id,
    accountId: tx.wallet_id,
    amount: tx.amount,
    type: tx.type as LedgerEntryRecord["type"],
    reference: tx.reference,
    timestamp: tx.created_at,
  }));

  // ---------------------------------------------------------------------------
  // Resolve currentUserId — fall back to first user if not found
  // ---------------------------------------------------------------------------
  const resolvedCurrentUserId = users.some((u) => u.id === currentUserId)
    ? currentUserId
    : (users[0]?.id ?? currentUserId);

  return {
    currentUserId: resolvedCurrentUserId,
    users,
    projects,
    stages,
    evidenceRequirements,
    evidence,
    approvals,
    ledgerAccounts,
    ledgerEntries,
    auditLog: [],
    eventHistory: [],
    lastActionOutcomes: {},
  };
}
