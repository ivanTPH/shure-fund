import { Wallet, AlertTriangle, GitBranch, FileText, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { LucideIcon } from "lucide-react";
import type { ActionType } from "./actionConfig";

export type SystemIconType =
  | ActionType
  | "blocked"
  | "warning"
  | "info";

export const systemIcons: Record<SystemIconType, LucideIcon> = {
  funding: Wallet,
  dispute: AlertTriangle,
  variation: GitBranch,
  evidence: FileText,
  approval: CheckCircle,
  audit: FileText,
  completion: CheckCircle,
  readiness: Info,
  blocked: XCircle,
  warning: AlertCircle,
  info: Info,
};
