import React from "react";
// ...existing code...

import { demoProject, demoContracts, demoStages, demoApprovalStatuses, demoUsers, calculateFundingPosition, canReleasePayment, demoAuditLog, demoDisputes, demoVariations, demoEvidence, getStageEvidenceStatus, getProjectControlSummary, getActionQueue, getPaymentDecision, getRoleViewConfig } from "@/lib/systemState";

function formatGBP(value: number) {
  return value.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
}

function Page() {
  // ...existing dashboard logic and JSX...
  // Funding Integrity Status calculations
  const funding = calculateFundingPosition(demoProject);
  // Role selector state
  const [selectedRole, setSelectedRole] = React.useState<string>("All");
  // Derived role config
  const roleConfig = getRoleViewConfig(selectedRole);
  // Project Control Summary
  const controlSummary = getProjectControlSummary({
    stages: demoStages,
    approvalStatuses: demoApprovalStatuses,
    disputes: demoDisputes,
    variations: demoVariations,
    evidence: demoEvidence,
    project: demoProject,
    calculateFundingPosition,
    getStageEvidenceStatus,
    canReleasePayment,
  });
  // Action Queue
  const actionQueue = getActionQueue({
    stages: demoStages,
    approvalStatuses: demoApprovalStatuses,
    disputes: demoDisputes,
    variations: demoVariations,
    evidence: demoEvidence,
    project: demoProject,
    calculateFundingPosition,
    getStageEvidenceStatus,
  });

  // Priority sort order
  const priorityOrder = { critical: 0, high: 1, medium: 2 };
  const sortedActions = [...actionQueue].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
    return aPriority - bPriority;
  });

  const statusBadge = (status: string) => {
    let color = "";
    let label = "";
    switch (status) {
      case "healthy":
        color = "bg-green-600 text-green-100";
        label = "Healthy";
        break;
      case "at-risk":
        color = "bg-amber-400 text-amber-900";
        label = "At Risk";
        break;
      case "blocked":
        color = "bg-red-600 text-red-100";
        label = "Blocked";
        break;
      default:
        color = "bg-zinc-700 text-zinc-100";
        label = status;
    }
    return (
      <span className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{label}</span>
    );
  };

  return (
    // ...existing dashboard JSX...
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col items-center">
      {/* Header */}
      {/* ...rest of the dashboard as before... */}
    </div>
  );
}

