"use client";

import { useCallback, useMemo, useRef } from "react";

import { usePrototype } from "../PrototypeProvider";
import type { ActionFeedItem } from "@/lib/actionFeedData";
import { deriveReleaseDecision } from "@/lib/actionFeedData";
import type { DemoUser } from "@/lib/demoUsers";

import ActionFeedRow from "./ActionFeedRow";

export type RowRuntimeState = {
  status?: string;
  actionRequired?: string;
  summary?: string;
  clarificationRequested?: boolean;
  isRead?: boolean;
  requiresAction?: boolean;
  isResolved?: boolean;
  priorityTimestamp?: string;
  statusGroup?: "action_required" | "at_risk" | "completed";
  statusType?: "dispute" | "awaiting_signoff" | "requires_action" | "at_risk" | "in_progress" | "ready";
};

export default function ActionFeedList({
  items,
  expandedId,
  clarificationFor,
  rowState,
  onToggle,
  onAction,
  onClarify,
  onItemChange,
  currentUser,
}: {
  items: ActionFeedItem[];
  expandedId: string | null;
  clarificationFor: string | null;
  rowState: Record<string, RowRuntimeState>;
  onToggle: (itemId: string) => void;
  onAction: (item: ActionFeedItem, type: "primary" | "return" | "upload" | "review" | "clarify") => void;
  onClarify: (item: ActionFeedItem, message: string) => void;
  onItemChange: (item: ActionFeedItem) => void;
  currentUser: DemoUser;
}) {
  const { getContract } = usePrototype();
  const frozenOrderRef = useRef<string[]>([]);
  const contracts = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, getContract(item.projectId, item.contractId)]),
      ),
    [getContract, items],
  );
  const runtimeItems = useMemo(() => {
    return items.map((item) => {
      const runtime = rowState[item.id] ?? {};
      return {
        item,
        runtime,
        visualState: {
          status: runtime.status ?? item.status,
          actionRequired: runtime.actionRequired ?? item.actionRequired,
          summary: runtime.summary ?? item.summary,
          clarificationRequested: runtime.clarificationRequested,
          statusType: runtime.statusType ?? item.statusType,
          isRead: runtime.isRead ?? item.isRead,
          requiresAction: runtime.requiresAction ?? item.requiresAction,
          isResolved: runtime.isResolved ?? item.isResolved,
        },
      };
    });
  }, [items, rowState]);

  const sortedItems = useMemo(() => {
    const sorted = [...runtimeItems].sort((a, b) => {
      const aPriority = getSortPriority(a.visualState);
      const bPriority = getSortPriority(b.visualState);
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aReleasePriority = getReleasePriority(a.item);
      const bReleasePriority = getReleasePriority(b.item);
      if (aReleasePriority !== bReleasePriority) return aReleasePriority - bReleasePriority;

      const aTimestamp = new Date(a.runtime.priorityTimestamp ?? a.item.priorityTimestamp ?? a.item.timestamp).getTime();
      const bTimestamp = new Date(b.runtime.priorityTimestamp ?? b.item.priorityTimestamp ?? b.item.timestamp).getTime();
      return bTimestamp - aTimestamp;
    });

    frozenOrderRef.current = sorted.map(({ item }) => item.id);
    return sorted;
  }, [runtimeItems]);

  const visualItems = useMemo(() => {
    if (expandedId) {
      const frozenIndex = new Map(frozenOrderRef.current.map((id, index) => [id, index]));
      return [...sortedItems].sort((a, b) => {
        const aIndex = frozenIndex.get(a.item.id) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = frozenIndex.get(b.item.id) ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
      });
    }

    return sortedItems;
  }, [expandedId, sortedItems]);

  const groupedItems = useMemo(() => {
    const actionRequired = visualItems.filter(({ visualState }) => visualState.requiresAction && !visualState.isResolved);
    const unread = visualItems.filter(
      ({ visualState }) => !visualState.isRead && !(visualState.requiresAction && !visualState.isResolved),
    );
    const resolved = visualItems.filter(({ visualState }) => visualState.isResolved);
    const usedIds = new Set([...actionRequired, ...unread, ...resolved].map(({ item }) => item.id));
    const ungrouped = visualItems.filter(({ item }) => !usedIds.has(item.id));
    const primaryRows = [...actionRequired, ...ungrouped];

    return [
      { id: "primary", label: "", subcopy: "", rows: primaryRows },
      { id: "unread", label: "Unread", subcopy: "Updates awaiting review", rows: unread },
      { id: "resolved", label: "Resolved", subcopy: "Completed or closed items", rows: resolved },
    ].filter((group) => group.rows.length > 0);
  }, [visualItems]);

  const getRowKey = useCallback((item: ActionFeedItem) => {
    return item.id || `${item.projectId}-${item.contractId}-${item.stageId}-${item.type}`;
  }, []);

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E6E8EC] bg-white">
        {groupedItems.map((group) => (
          <div key={group.id} className="min-w-0 overflow-x-hidden">
            {group.label ? (
              <div className="sticky top-[126px] z-10 mt-3 min-w-0 overflow-hidden border-b border-t border-[#EEF0F3] bg-[#F7F8FA]/95 px-4 py-2.5 backdrop-blur first:mt-0 first:border-t-0">
                <p className="truncate whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">{group.label}</p>
                <p className="mt-0.5 truncate whitespace-nowrap text-[11px] font-medium normal-case tracking-normal text-[#98A2B3]">{group.subcopy}</p>
              </div>
            ) : null}
            {group.rows.map(({ item, visualState }) => (
              <ActionFeedRow
                key={getRowKey(item)}
                item={item}
                contract={contracts[item.id]}
                expanded={expandedId === item.id}
                clarificationOpen={clarificationFor === item.id}
                visualState={visualState}
                onToggle={onToggle}
                onAction={onAction}
                onClarify={onClarify}
                onItemChange={onItemChange}
                currentUser={currentUser}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function getSortPriority(visualState: {
  isRead?: boolean;
  requiresAction?: boolean;
  isResolved?: boolean;
}) {
  if (visualState.requiresAction && !visualState.isResolved) return 0;
  if (!visualState.isRead) return 1;
  if (!visualState.isResolved) return 2;
  return 3;
}

function getReleasePriority(item: ActionFeedItem) {
  switch (deriveReleaseDecision(item)) {
    case "blocked_dispute":
      return 0;
    case "blocked_funding":
      return 1;
    case "partial_release":
      return 2;
    case "ready":
      return 3;
    case "released":
      return 4;
    default:
      return 5;
  }
}
