import { SystemIconType } from "./icons";

export type PriorityKey = "critical" | "high" | "medium" | "low";

export interface PriorityConfig {
  label: string;
  icon: SystemIconType;
  badgeClass: string;
  sortOrder: number;
}

export const priorityConfig: Record<PriorityKey, PriorityConfig> = {
  critical: {
    label: "Critical",
    icon: "blocked",
    badgeClass: "bg-red-700 text-red-100",
    sortOrder: 0,
  },
  high: {
    label: "High",
    icon: "warning",
    badgeClass: "bg-amber-700 text-amber-100",
    sortOrder: 1,
  },
  medium: {
    label: "Medium",
    icon: "info",
    badgeClass: "bg-blue-700 text-blue-100",
    sortOrder: 2,
  },
  low: {
    label: "Low",
    icon: "info",
    badgeClass: "bg-zinc-700 text-zinc-100",
    sortOrder: 3,
  },
};
