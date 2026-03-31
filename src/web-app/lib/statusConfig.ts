import { SystemIconType } from "./icons";

export type StatusKey =
  | "healthy"
  | "at-risk"
  | "blocked"
  | "pending"
  | "approved"
  | "rejected"
  | "missing"
  | "reviewed"
  | "accepted";

export interface StatusConfig {
  label: string;
  icon: SystemIconType;
  badgeClass: string;
  textClass: string;
  borderClass?: string;
}

export const statusConfig: Record<StatusKey, StatusConfig> = {
  healthy: {
    label: "Healthy",
    icon: "approval",
    badgeClass: "bg-green-600 text-green-100",
    textClass: "text-green-100",
    borderClass: "border-green-600",
  },
  "at-risk": {
    label: "At Risk",
    icon: "warning",
    badgeClass: "bg-amber-400 text-amber-900",
    textClass: "text-amber-900",
    borderClass: "border-amber-400",
  },
  blocked: {
    label: "Blocked",
    icon: "blocked",
    badgeClass: "bg-red-600 text-red-100",
    textClass: "text-red-100",
    borderClass: "border-red-600",
  },
  pending: {
    label: "Pending",
    icon: "info",
    badgeClass: "bg-zinc-500 text-zinc-100",
    textClass: "text-zinc-100",
    borderClass: "border-zinc-500",
  },
  approved: {
    label: "Approved",
    icon: "approval",
    badgeClass: "bg-green-700 text-green-100",
    textClass: "text-green-100",
    borderClass: "border-green-700",
  },
  rejected: {
    label: "Rejected",
    icon: "blocked",
    badgeClass: "bg-red-700 text-red-100",
    textClass: "text-red-100",
    borderClass: "border-red-700",
  },
  missing: {
    label: "Missing",
    icon: "warning",
    badgeClass: "bg-amber-700 text-amber-100",
    textClass: "text-amber-100",
    borderClass: "border-amber-700",
  },
  reviewed: {
    label: "Reviewed",
    icon: "info",
    badgeClass: "bg-blue-700 text-blue-100",
    textClass: "text-blue-100",
    borderClass: "border-blue-700",
  },
  accepted: {
    label: "Accepted",
    icon: "approval",
    badgeClass: "bg-green-600 text-green-100",
    textClass: "text-green-100",
    borderClass: "border-green-600",
  },
};
