"use client";

import { memo, type KeyboardEvent, useCallback, useMemo } from "react";

import type { ActionFeedItem } from "@/lib/actionFeedData";
import {
  deriveNextRequiredAction,
  deriveReleaseContext,
} from "@/lib/actionFeedData";
import { deriveContactWorkflowContext, mapUserToContact } from "@/lib/contactIdentity";
import type { ContractRecord } from "@/lib/prototypeData";
import type { DemoUser } from "@/lib/demoUsers";

import ActionFeedExpanded, { type ActionFeedVisualState } from "./ActionFeedExpanded";
import ClickableAvatar from "./ClickableAvatar";

function currency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    const compact = value / 1_000_000;
    const formatted = compact.toFixed(compact >= 10 ? 1 : 2).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
    return `£${formatted}m`;
  }

  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

const ActionFeedRow = memo(function ActionFeedRow({
  item,
  contract,
  expanded,
  visualState,
  clarificationOpen,
  onToggle,
  onAction,
  onClarify,
  onItemChange,
  currentUser,
}: {
  item: ActionFeedItem;
  contract?: ContractRecord;
  expanded: boolean;
  visualState: ActionFeedVisualState;
  clarificationOpen: boolean;
  onToggle: (itemId: string) => void;
  onAction: (item: ActionFeedItem, type: "primary" | "return" | "upload" | "review" | "clarify") => void;
  onClarify: (item: ActionFeedItem, message: string) => void;
  onItemChange: (item: ActionFeedItem) => void;
  currentUser: DemoUser;
}) {
  if (!item) return null;
  const rowContact = useMemo(() => {
    const rowContactBase = mapUserToContact(
      item.currentReviewer ?? item.submittedBy ?? contract?.submittedBy,
      item.currentReviewer,
      contract?.supplier ?? item.projectName,
      { projectId: item.projectId, contractId: item.contractId, contract: item.contractContext },
    );
    return {
      ...rowContactBase,
      workflowContext: deriveContactWorkflowContext(rowContactBase.id, item),
    };
  }, [contract?.submittedBy, contract?.supplier, item]);
  const contractTitle = item.contractName || item.contractTitle || "—";
  const projectName = item.projectName || "—";
  const dominantAction = deriveNextRequiredAction(item, currentUser.id);
  const primaryAction = dominantAction.label || "No action";
  const nextActionLine = dominantAction.nextAction || "";
  const releaseContext = deriveReleaseContext(item, currentUser.workflowRole);
  const rowValue =
    releaseContext.releaseStatus === "released"
      ? releaseContext.releasedValue
      : releaseContext.releaseStatus === "ready" || releaseContext.releaseStatus === "partial_released"
        ? releaseContext.remainingReleasableValue
        : releaseContext.authorisedReleaseValue || item.approvedValue;
  const displayValue = typeof rowValue === "number" ? currency(rowValue) : "—";
  const avatarLabel = item.projectAvatar || projectName.slice(0, 2).toUpperCase() || "SF";
  const showBlueDot = !visualState.isRead || (Boolean(visualState.requiresAction) && !visualState.isResolved);
  const handleToggle = useCallback(() => onToggle(item.id), [item.id, onToggle]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(item.id);
    }
  }, [item.id, onToggle]);
  const handleExpandedAction = useCallback((type: "primary" | "return" | "upload" | "review" | "clarify") => {
    onAction(item, type);
  }, [item, onAction]);
  const handleExpandedClarify = useCallback((message: string) => {
    onClarify(item, message);
  }, [item, onClarify]);
  return (
    <article className="w-full min-w-0 overflow-hidden border-b border-[#E6E8EC] last:border-b-0">
      <div className="relative w-full min-w-0 overflow-hidden bg-white">
        <div className="flex h-[108px] w-full items-stretch gap-3 px-3.5 py-4">
          <ClickableAvatar contact={rowContact} className="w-11 shrink-0 self-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
              {avatarLabel}
            </div>
          </ClickableAvatar>

          <div
            role="button"
            tabIndex={0}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className="flex min-w-0 flex-1 cursor-pointer items-stretch gap-3 overflow-hidden rounded-2xl text-left active:bg-[#F8FAFC]"
            aria-expanded={expanded}
            aria-label={`Open notification for ${contractTitle}`}
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch overflow-hidden">
              <div className="flex min-w-0 items-center gap-2">
                {showBlueDot ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" /> : null}
                <p className="min-w-0 overflow-hidden truncate text-ellipsis whitespace-nowrap text-sm font-semibold leading-5 text-[#0B0F1A]" title={contractTitle}>{contractTitle}</p>
              </div>
              <p className="mt-1 overflow-hidden truncate text-ellipsis whitespace-nowrap text-[13px] font-medium leading-5 text-[#0B0F1A]" title={primaryAction}>{primaryAction}</p>
              <p
                aria-hidden={!nextActionLine}
                className={`mt-1 h-4 overflow-hidden truncate text-ellipsis whitespace-nowrap text-xs font-medium leading-4 ${nextActionLine ? dominantAction.urgency === "critical" ? "text-[#B42318]" : "text-[#667085]" : "text-transparent"}`}
                title={nextActionLine || undefined}
              >
                {nextActionLine || "No action"}
              </p>
            </div>

            <div className="flex w-[104px] min-w-[104px] max-w-[104px] shrink-0 items-center justify-end self-stretch overflow-hidden text-right">
              <p className="max-w-full overflow-hidden truncate text-ellipsis whitespace-nowrap text-[13px] font-bold leading-5 text-[#0B0F1A]" title={displayValue}>{displayValue}</p>
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="bg-[#F7F8FA]">
          <ActionFeedExpanded
            item={item}
            contract={contract}
            visualState={visualState}
            clarificationOpen={clarificationOpen}
            onAction={handleExpandedAction}
            onClarify={handleExpandedClarify}
            onItemChange={onItemChange}
            demoUser={currentUser}
          />
        </div>
      ) : null}
    </article>
  );
});

export default ActionFeedRow;
