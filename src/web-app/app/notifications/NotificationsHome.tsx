"use client";

import { useEffect, useMemo, useState } from "react";

import MobileShell from "../components/prototype/MobileShell";
import ActionFeedList, { type RowRuntimeState } from "../components/prototype/ActionFeedList";
import NotificationSystemHeader from "../components/prototype/NotificationSystemHeader";
import NotificationFilters, { type NotificationFilterId } from "../components/prototype/NotificationFilters";
import { usePrototype } from "../components/PrototypeProvider";
import {
  hydrateReleaseFields,
  markNotificationRead,
  type ActionFeedItem,
} from "@/lib/actionFeedData";

export default function NotificationsHome() {
  const { actionFeedItems, currentUser } = usePrototype();
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clarificationFor, setClarificationFor] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowRuntimeState>>({});
  const [feedItems, setFeedItems] = useState<ActionFeedItem[]>(() => actionFeedItems.map(hydrateReleaseFields));
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);

  useEffect(() => {
    setFeedItems(actionFeedItems.map(hydrateReleaseFields));
    setExpandedId(null);
    setFrozenOrder(null);
  }, [actionFeedItems, currentUser.id]);

  function updateState(itemId: string, next: RowRuntimeState) {
    setRowState((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...next,
      },
    }));
  }

  function handleItemChange(nextItem: ActionFeedItem) {
    const hydrated = hydrateReleaseFields(nextItem);
    setFeedItems((current) => current.map((item) => (item.id === hydrated.id ? hydrated : item)));
  }

  function handleAction(item: ActionFeedItem, type: "primary" | "return" | "upload" | "review" | "clarify") {
    if (type === "clarify") {
      setExpandedId(item.id);
      setClarificationFor(item.id);
      return;
    }

    setClarificationFor(null);

    if (type === "primary") {
      updateState(item.id, {
        status: "Approved",
        actionRequired: "Approved and moved to next step",
        summary: "The package has been approved inline and passed forward in the workflow.",
        statusGroup: "completed",
        statusType: "ready",
        isResolved: true,
        isRead: true,
        requiresAction: false,
        priorityTimestamp: new Date().toISOString(),
      });
      return;
    }

    if (type === "return") {
      updateState(item.id, {
        status: "Returned",
        actionRequired: "Returned for amendment",
        summary: "The package has been returned so the supplier can amend the submission before it progresses.",
        statusGroup: "completed",
        statusType: item.actionType === "dispute" ? "dispute" : "requires_action",
        isResolved: false,
        isRead: true,
        requiresAction: true,
        priorityTimestamp: new Date().toISOString(),
      });
      return;
    }

    if (type === "upload") {
      updateState(item.id, {
        status: "In progress",
        actionRequired: "Evidence upload started",
        summary: "Evidence has been requested inline and the package is moving back through proof-of-work completion.",
        statusGroup: "action_required",
        statusType: "requires_action",
        isResolved: false,
        isRead: true,
        requiresAction: true,
        priorityTimestamp: new Date().toISOString(),
      });
      return;
    }

    updateState(item.id, {
      status: "In progress",
      actionRequired: "Review in progress",
      summary: "The item is now being reviewed from the action feed and can be escalated into the full contract if needed.",
      statusGroup: item.statusGroup,
      statusType: item.statusGroup === "at_risk" ? "at_risk" : "requires_action",
      isResolved: false,
      isRead: true,
      requiresAction: true,
      priorityTimestamp: new Date().toISOString(),
    });
  }

  function handleClarify(item: ActionFeedItem, message: string) {
    updateState(item.id, {
      status: "Clarification requested",
      actionRequired: "Clarification requested",
      summary: message
        ? `Clarification requested: ${message}`
        : "Clarification requested and a follow-up notification has been sent to the other party.",
      clarificationRequested: true,
      statusGroup: item.statusGroup,
      statusType: item.actionType === "dispute" ? "dispute" : "requires_action",
      isRead: true,
      requiresAction: true,
      isResolved: false,
      priorityTimestamp: new Date().toISOString(),
    });
    setClarificationFor(null);
  }

  function handleToggle(itemId: string) {
    setClarificationFor(null);
    setExpandedId((current) => {
      if (current === itemId) {
        setFrozenOrder(null);
        return null;
      }
      setFrozenOrder(filteredItems.map((item) => item.id));
      setFeedItems((items) =>
        items.map((item) => {
          if (item.id !== itemId) return item;
          return markNotificationRead(itemId, true, item) ?? item;
        }),
      );
      return itemId;
    });
  }

  const filteredItems = useMemo(() => {
    const enriched = feedItems.map((item) => ({
      ...item,
      runtimeStatusGroup: rowState[item.id]?.statusGroup ?? item.statusGroup,
      runtimeStatusType: rowState[item.id]?.statusType ?? item.statusType,
      runtimeIsRead: rowState[item.id]?.isRead ?? item.isRead,
      runtimeRequiresAction: rowState[item.id]?.requiresAction ?? item.requiresAction,
      runtimeIsResolved: rowState[item.id]?.isResolved ?? item.isResolved,
      runtimePriorityTimestamp: rowState[item.id]?.priorityTimestamp ?? item.priorityTimestamp,
    }));

    switch (selectedFilter) {
      case "action":
        return enriched.filter((item) => item.runtimeRequiresAction && !item.runtimeIsResolved);
      case "disputes":
        return enriched.filter((item) => item.actionType === "dispute" || item.runtimeStatusType === "dispute");
      default:
        return enriched;
    }
  }, [feedItems, rowState, selectedFilter])
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const haystack = [
        item.contractTitle,
        item.projectName,
        item.actionRequired,
        item.summary,
        item.timestamp,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery.trim().toLowerCase());
    })
    .sort((a, b) => {
      const aRank = !a.runtimeIsRead && a.runtimeRequiresAction && !a.runtimeIsResolved
        ? 0
        : !a.runtimeIsRead
          ? 1
          : !a.runtimeIsResolved
            ? 2
            : 3;
      const bRank = !b.runtimeIsRead && b.runtimeRequiresAction && !b.runtimeIsResolved
        ? 0
        : !b.runtimeIsRead
          ? 1
          : !b.runtimeIsResolved
            ? 2
            : 3;

      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.runtimePriorityTimestamp).getTime() - new Date(a.runtimePriorityTimestamp).getTime();
    });

  const counts = useMemo(
    () => ({
      all: feedItems.length,
      action: feedItems.filter((item) => item.requiresAction && !item.isResolved).length,
      disputes: feedItems.filter((item) => item.type === "dispute" || item.dispute.isActive).length,
    }),
    [feedItems],
  );

  const visibleItems = useMemo(() => {
    if (!expandedId || !frozenOrder) return filteredItems;

    const order = new Map(frozenOrder.map((id, index) => [id, index]));
    return [...filteredItems].sort((a, b) => {
      const aIndex = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [expandedId, filteredItems, frozenOrder]);

  return (
    <MobileShell
      title=""
      headerContent={<NotificationSystemHeader />}
    >
      <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
        <NotificationFilters
          title="Notifications"
          accent="neutral"
          selected={selectedFilter}
          query={searchQuery}
          counts={counts}
          onQueryChange={setSearchQuery}
          onSelect={setSelectedFilter}
        />

        <div className="mt-3 space-y-3">
          {filteredItems.length > 0 ? (
            <ActionFeedList
              items={visibleItems}
              expandedId={expandedId}
              clarificationFor={clarificationFor}
              rowState={rowState}
              onToggle={handleToggle}
              onAction={handleAction}
              onClarify={handleClarify}
              onItemChange={handleItemChange}
              currentUser={currentUser}
            />
          ) : null}
          {filteredItems.length === 0 ? (
            <div className="rounded-[22px] border border-[#E6E8EC] bg-white px-4 py-6 text-sm text-[#667085]">
              {selectedFilter === "disputes"
                ? "No active disputes."
                : selectedFilter === "action"
                  ? "No unresolved actions."
                  : "No unread updates."}
            </div>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}
