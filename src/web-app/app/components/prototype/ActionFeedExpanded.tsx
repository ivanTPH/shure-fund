"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import PendingOutlined from "@mui/icons-material/PendingOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import ReplyOutlined from "@mui/icons-material/ReplyOutlined";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";

import {
  appendActivityEvent,
  appendThreadMessage,
  approveStage,
  type Attachment,
  type ActionFeedItem,
  deleteDraft,
  deriveDisputeContext,
  deriveFundingAssuranceContext,
  deriveApprovalChain,
  deriveExpandedTopSummary,
  deriveEvidenceCounts,
  deriveEvidenceStatus,
  deriveMessageMeta,
  deriveMissingEvidence,
  deriveReleaseContext,
  escalateNotification,
  deriveFundingShortfall,
  deriveNextRequiredAction,
  deriveTimelineRows,
  getAuditEventBase,
  canCurrentUserRelease,
  reassignNotificationOwner,
  hydrateReleaseFields,
  markNotificationRead,
  setNotificationResolved,
  raiseDispute,
  rejectStage,
  releasePayment,
  resolveDispute,
  saveDraft,
  type ApprovalChainStep,
  type EvidenceFilter,
  type ThreadMessage,
  type ThreadSection,
  type WorkflowAuthority,
} from "@/lib/actionFeedData";
import { deriveContactWorkflowContext, getContactIdentity, getContactInitials, hasWorkflowAuthority, mapUserToContact } from "@/lib/contactIdentity";
import type { DemoUser } from "@/lib/demoUsers";

import ClickableAvatar from "./ClickableAvatar";
import DisclosureSection from "./DisclosureSection";
import AttachmentGrid from "./AttachmentGrid";
import type { PreviewAttachment } from "./AttachmentModal";

export type ActionFeedVisualState = {
  status: string;
  actionRequired: string;
  summary: string;
  clarificationRequested?: boolean;
  statusType: ActionFeedItem["statusType"];
  isRead?: boolean;
  requiresAction?: boolean;
  isResolved?: boolean;
};

type SectionKey = "qs" | "contractor";
type ComposerImageDraft = { id: string; name: string; url: string };
type ComposerFileDraft = { id: string; name: string; sizeLabel: string; url: string };
type SectionDraftPayload = {
  message: string;
  attachments: Attachment[];
};

export default function ActionFeedExpanded({
  item,
  contract: _contract,
  visualState,
  clarificationOpen: _clarificationOpen,
  onAction: _onAction,
  onClarify: _onClarify,
  onItemChange,
  demoUser,
}: {
  item: ActionFeedItem;
  contract?: unknown;
  visualState: ActionFeedVisualState;
  clarificationOpen: boolean;
  onAction: (type: "primary" | "return" | "upload" | "review" | "clarify") => void;
  onClarify: (message: string) => void;
  onItemChange: (item: ActionFeedItem) => void;
  demoUser: DemoUser;
}) {
  const [currentItem, setCurrentItem] = useState(() => hydrateReleaseFields(item));
  const activeItemIdRef = useRef(item.id);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalationTarget, setEscalationTarget] = useState<WorkflowAuthority>("client");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState("");
  const [reassignTarget, setReassignTarget] = useState("");
  const [isConfirmingRelease, setIsConfirmingRelease] = useState(false);
  const [releaseSubmitted, setReleaseSubmitted] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showFundingReview, setShowFundingReview] = useState(false);
  const currentUser = useMemo(() => mapUserToContact(demoUser.name, demoUser.workflowRole, demoUser.company, {
    contract: currentItem.contractContext,
  }), [currentItem.contractContext, demoUser]);
  const currentUserAuthority = demoUser.authority;
  const issueSummary = visualState.summary || currentItem.summary || "No summary available.";
  const actionSectionKey: SectionKey =
    currentItem.currentAuthority === "qs" ? "qs" : currentItem.sections.contractor ? "contractor" : "qs";

  useEffect(() => {
    if (activeItemIdRef.current !== item.id) {
      activeItemIdRef.current = item.id;
      setIsConfirmingRelease(false);
      setReleaseSubmitted(false);
      setShowChecklist(false);
      setShowFundingReview(false);
    }
    setCurrentItem(hydrateReleaseFields(item));
  }, [item]);

  function commitItem(nextItem: ActionFeedItem | null) {
    if (!nextItem) return;
    const hydrated = hydrateReleaseFields(nextItem);
    setCurrentItem(hydrated);
    onItemChange(hydrated);
  }

  function appendReply(sectionKey: SectionKey, payload: SectionDraftPayload) {
    const nextMessage: ThreadMessage = {
      id: `${sectionKey}-${Date.now()}`,
      senderId: currentUser.id,
      text: payload.message.trim(),
      attachments: payload.attachments.length > 0 ? payload.attachments : undefined,
      timestamp: Date.now(),
      visibility: "public_thread",
      deliveryStatus: "sent",
      actionIntent: payload.attachments.length > 0 ? "evidence" : "reply",
      authoredForRole: sectionKey,
    };

    setCurrentItem((current) => {
      const withMessage = appendThreadMessage(current.id, sectionKey, nextMessage, current);
      const withActivity = appendActivityEvent(current.id, {
        id: `${current.id}-activity-${Date.now()}`,
        type: payload.attachments.length > 0 ? "evidence_submitted" : "dispute_responded",
        actorId: currentUser.id,
        text: payload.attachments.length > 0
          ? `Evidence response sent with ${payload.attachments.length} supporting attachment${payload.attachments.length === 1 ? "" : "s"}.`
          : `Reply sent to ${sectionKey === "qs" ? "Quantity Surveyor" : "Contractor"}.`,
        evidenceCount: payload.attachments.length,
        note: payload.message.trim(),
        timestamp: Date.now(),
      }, withMessage ?? current);
      const withoutDraft = deleteDraft(current.id, sectionKey, withActivity ?? current);
      const hydrated = hydrateReleaseFields(withoutDraft ?? current);
      onItemChange(hydrated);
      return hydrated;
    });
  }

  function persistDraft(sectionKey: SectionKey, draftState: ActionFeedItem["drafts"][SectionKey]) {
    if (!draftState) return;
    setCurrentItem((current) => {
      const nextItem = saveDraft(current.id, sectionKey, draftState, current) ?? current;
      onItemChange(nextItem);
      return nextItem;
    });
  }

function removeDraft(sectionKey: SectionKey) {
    setCurrentItem((current) => {
      const withoutDraft = deleteDraft(current.id, sectionKey, current) ?? current;
      const nextItem = appendActivityEvent(current.id, {
        id: `${current.id}-activity-${Date.now()}`,
        type: "note",
        actorId: currentUser.id,
        text: `Draft deleted from ${sectionKey === "qs" ? "QS position" : "Contractor response"}.`,
        timestamp: Date.now(),
      }, withoutDraft) ?? withoutDraft;
      onItemChange(nextItem);
      return nextItem;
    });
  }

  function handleApprove() {
    commitItem(approveStage(currentItem.id, currentUser.id, currentItem));
  }

  function handleReject() {
    commitItem(rejectStage(currentItem.id, currentUser.id, currentItem));
  }

  function handleRaiseDispute() {
    commitItem(raiseDispute(currentItem.id, currentUser.id, "Held value requires clarification before funds can move.", currentItem));
  }

  function handleResolveDispute() {
    commitItem(resolveDispute(currentItem.id, currentItem));
  }

  function handleReleasePayment() {
    if (!canRelease) return;
    if (!isConfirmingRelease) {
      setCurrentItem((current) => {
        const releaseAmount = Math.min(remainingReleasableValue, current.availableFunds);
        const nextItem = appendActivityEvent(current.id, {
          ...getAuditEventBase(current, userRole, currentUser),
          id: `${current.id}-activity-${Date.now()}`,
          type: "release_confirmation_started",
          actorId: currentUser.id,
          text: `Treasury release confirmation started for ${currency(releaseAmount)}.`,
          releaseAmount,
          timestamp: Date.now(),
        }, current) ?? current;
        const hydrated = hydrateReleaseFields(nextItem);
        onItemChange(hydrated);
        return hydrated;
      });
      setIsConfirmingRelease(true);
      return;
    }

    setReleaseSubmitted(true);
    commitItem(releasePayment(currentItem.id, currentItem, currentUser.id, userRole));
    setIsConfirmingRelease(false);
  }

  function handleEscalate() {
    commitItem(escalateNotification(currentItem.id, currentItem.currentAuthority, escalationTarget, escalationReason.trim(), currentUser.id, currentItem));
    setEscalationOpen(false);
    setEscalationReason("");
  }

  function handleReassign() {
    const targetOwner = reassignTarget || availableOwners[0]?.[0] || currentOwnerId;
    commitItem(reassignNotificationOwner(currentItem.id, currentOwnerId, targetOwner, reassignReason.trim(), currentUser.id, currentItem));
    setReassignOpen(false);
    setReassignReason("");
    setReassignTarget("");
  }

  function openComposerForAction() {
    const sectionKey = actionSectionKey;
    setCurrentItem((current) => {
      const existingDraft = current.drafts[sectionKey] ?? {
        draftText: "",
        draftAttachments: [],
        isComposerOpen: false,
      };
      const nextItem = saveDraft(current.id, sectionKey, {
        ...existingDraft,
        isComposerOpen: true,
        replyToMessageId: current.sections[sectionKey]?.messages.at(-1)?.id,
      }, current) ?? current;
      onItemChange(nextItem);
      return nextItem;
    });
  }

  function handleTopAction(action: "approve" | "reject" | "clarify" | "upload" | "release" | "dispute" | "resolve" | "escalate" | "reassign") {
    if (action === "approve") handleApprove();
    if (action === "reject") handleReject();
    if (action === "clarify" || action === "upload" || action === "dispute") openComposerForAction();
    if (action === "release") handleReleasePayment();
    if (action === "resolve") handleResolveDispute();
    if (action === "escalate") setEscalationOpen(true);
    if (action === "reassign") setReassignOpen(true);
  }

  function toggleReadState() {
    const nextItem = markNotificationRead(currentItem.id, !(visualState.isRead ?? currentItem.isRead), currentItem);
    commitItem(nextItem);
  }

  function toggleResolvedState() {
    const nextItem = setNotificationResolved(currentItem.id, !(visualState.isResolved ?? currentItem.isResolved), currentItem);
    commitItem(nextItem);
  }

  const showWorkflowActions = currentUserAuthority === currentItem.currentAuthority;
  const fundingShortfall = useMemo(() => deriveFundingShortfall(currentItem), [currentItem]);
  const nextAction = useMemo(() => deriveNextRequiredAction(currentItem), [currentItem]);
  const evidenceStatus = useMemo(() => deriveEvidenceStatus(currentItem), [currentItem]);
  const missingEvidence = useMemo(() => deriveMissingEvidence(currentItem), [currentItem]);
  const userRole = currentUser.projectRole ?? currentUser.companyRoleTitle ?? currentUser.role;
  const releaseContext = useMemo(() => deriveReleaseContext(currentItem, userRole), [currentItem, userRole]);
  const disputeContext = useMemo(() => deriveDisputeContext(currentItem), [currentItem]);
  const fundingContext = useMemo(() => deriveFundingAssuranceContext(currentItem), [currentItem]);
  const releasedValue = releaseContext.releasedValue;
  const authorisedReleaseValue = releaseContext.authorisedReleaseValue;
  const remainingReleasableValue = releaseContext.remainingReleasableValue;
  const releaseStatus = releaseContext.releaseStatus;
  const disputedValue = disputeContext.disputedValue;
  const remainingUndisputedReleasableValue = disputeContext.remainingUndisputedReleasableValue;
  const disputeStatus = disputeContext.disputeStatus;
  const isFullyReleased = remainingReleasableValue === 0 && authorisedReleaseValue > 0;
  const isPartiallyReleased = releasedValue > 0 && remainingReleasableValue > 0;
  const fundingStatus = fundingContext.fundingStatus;
  const approvalStatus = currentItem.status === "approved" ? "approved" : "pending";
  const canSubmitEvidence = hasWorkflowAuthority({ userRole, actionType: "submit_evidence" });
  const canApprove = hasWorkflowAuthority({ userRole, actionType: "approve" }) && evidenceStatus === "clear" && approvalStatus !== "approved";
  const canRelease = hasWorkflowAuthority({ userRole, actionType: "release" }) &&
    evidenceStatus === "clear" &&
    fundingStatus === "clear" &&
    approvalStatus === "approved" &&
    remainingReleasableValue > 0 &&
    canCurrentUserRelease(currentItem, currentUser.id);
  const canDispute = hasWorkflowAuthority({ userRole, actionType: "dispute" });
  const canRaiseDispute = canDispute && disputedValue === 0;
  const canRespondToDispute = canDispute && disputeStatus === "open";
  const canMarkExternalResolution = canDispute && (disputeStatus === "open" || disputeStatus === "responded");
  const canEscalate = hasWorkflowAuthority({ userRole, actionType: "escalate" });
  const canReassign = hasWorkflowAuthority({ userRole, actionType: "reassign" });
  const isAuthorityBlocked = Boolean(nextAction.blockedReason) || (!canApprove && showWorkflowActions && currentItem.status !== "approved");
  const topSummary = useMemo(() => deriveExpandedTopSummary(currentItem), [currentItem]);
  const availableOwners = useMemo(() => Object.entries(currentItem.contractContext.contacts), [currentItem.contractContext.contacts]);
  const currentOwnerId = useMemo(
    () => currentItem.reassignment?.currentOwnerId ?? currentItem.requiredApprovals.find((id) => !currentItem.completedApprovals.includes(id)) ?? currentUser.id,
    [currentItem.completedApprovals, currentItem.reassignment?.currentOwnerId, currentItem.requiredApprovals, currentUser.id],
  );
  const topActionControls = useMemo(() => {
    if (nextAction.type === "funding_block") {
      return [
        { id: "review" as const, label: "Resolve funding", disabled: false, tone: "primary" as const },
        { id: "escalate" as const, label: "Escalate", disabled: !canEscalate, tone: "secondary" as const },
        { id: "reassign" as const, label: "Reassign", disabled: !canReassign, tone: "secondary" as const },
      ];
    }
    if (nextAction.type === "evidence_required") {
      return [
        { id: "upload" as const, label: canSubmitEvidence ? "Upload evidence" : "Request evidence", disabled: false, tone: "primary" as const },
        { id: "checklist" as const, label: "View checklist", disabled: false, tone: "secondary" as const },
        ...(!canSubmitEvidence ? [
          { id: "escalate" as const, label: "Escalate", disabled: !canEscalate, tone: "secondary" as const },
          { id: "reassign" as const, label: "Reassign", disabled: !canReassign, tone: "secondary" as const },
        ] : [{ id: "clarify" as const, label: "Clarify", disabled: false, tone: "secondary" as const }]),
      ];
    }
    if (nextAction.type === "dispute_active") {
      return [
        { id: "dispute" as const, label: canRespondToDispute ? "Respond" : "Add response", disabled: false, tone: "primary" as const },
        { id: "resolve" as const, label: "Mark external resolution", disabled: !canMarkExternalResolution, tone: "secondary" as const },
        { id: "escalate" as const, label: "Escalate", disabled: !canEscalate, tone: "secondary" as const },
      ];
    }
    if (nextAction.type === "approval_required") {
      return [
        { id: "approve" as const, label: "Approve", disabled: !canApprove, tone: "primary" as const },
        { id: "reject" as const, label: "Return", disabled: !canApprove, tone: "danger" as const },
        { id: "clarify" as const, label: "Clarify", disabled: false, tone: "secondary" as const },
        ...(canApprove ? [] : [{ id: "reassign" as const, label: "Reassign", disabled: !canReassign, tone: "secondary" as const }]),
      ];
    }
    if (nextAction.type === "release_ready") {
      return [
        { id: "release" as const, label: isConfirmingRelease ? "Confirm release" : "Release payment", disabled: !canRelease || releaseSubmitted, tone: "primary" as const },
        { id: "reassign" as const, label: "Reassign", disabled: !canReassign, tone: "secondary" as const },
        { id: "escalate" as const, label: "Escalate", disabled: !canEscalate, tone: "secondary" as const },
      ];
    }
    return [
      { id: "clarify" as const, label: "Add note", disabled: false, tone: "secondary" as const },
    ];
  }, [canApprove, canEscalate, canMarkExternalResolution, canReassign, canRelease, canRespondToDispute, canSubmitEvidence, isConfirmingRelease, nextAction.type, releaseSubmitted]);

  return (
    <div className="min-w-0 overflow-hidden border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4 transition-all duration-200 ease-out">
      <section className="min-w-0 overflow-hidden border-b border-[#E6E8EC] py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">{contextLabel(nextAction.type)}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {nextAction.urgency === "critical" ? <ReportProblemOutlined style={{ fontSize: 16 }} className="text-[#B42318]" /> : null}
              <p className={`min-w-0 break-words text-sm font-semibold ${nextAction.urgency === "critical" ? "text-[#B42318]" : "text-[#0B0F1A]"}`}>{nextAction.label || "No action"}</p>
            </div>
            <p className="mt-2 max-w-[42rem] break-words text-sm leading-6 text-[#4B5565]">{nextAction.reason || topSummary.nextActionReason || issueSummary}</p>
            <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {formatAuthorityLabel(currentItem.currentAuthority)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              {topActionControls.map((control) => (
                <button
                  key={control.id}
                  type="button"
                  disabled={control.disabled}
                  onClick={() => {
                    if (control.id === "checklist") {
                      setShowChecklist((current) => !current);
                      return;
                    }
                    if (control.id === "review") {
                      setShowFundingReview((current) => !current);
                      return;
                    }
                    handleTopAction(control.id as "approve" | "reject" | "clarify" | "upload" | "release" | "dispute" | "resolve" | "escalate" | "reassign");
                  }}
                  className={workflowButtonClass(control.tone, control.disabled)}
                >
                  {control.label}
                </button>
              ))}
            </div>
            {showChecklist && missingEvidence.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2.5 text-xs text-[#4B5565]">
                <p className="font-semibold text-[#0B0F1A]">Required evidence</p>
                <p className="mt-1 break-words">{missingEvidence.map(formatEvidenceRequirement).join(", ")}</p>
              </div>
            ) : null}
            {showFundingReview ? (
              <div className="mt-3 rounded-2xl border border-[#E6E8EC] bg-white px-3 py-2.5 text-xs text-[#4B5565]">
                <p className="font-semibold text-[#0B0F1A]">Funding review</p>
                <p className="mt-1 break-words">
                  Cover {currency(fundingContext.availableFundingCover)} against required {currency(fundingContext.totalRequiredWithBuffer)}.
                </p>
              </div>
            ) : null}
            {isConfirmingRelease ? (
              <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#E6E8EC] pt-3 text-xs">
                <span className="min-w-0 break-words text-[#4B5565]">
                  Confirm release of {currency(Math.min(remainingReleasableValue, currentItem.availableFunds))} to contractor under treasury authority.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingRelease(false);
                    setReleaseSubmitted(false);
                  }}
                  className="font-semibold text-[#667085] hover:text-[#102345]"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {isAuthorityBlocked ? (
              <p className="mt-2 break-words text-xs text-amber-500">If you cannot complete this action, reassign or escalate from here.</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={toggleReadState}
                className={workflowButtonClass("secondary", false)}
              >
                {(visualState.isRead ?? currentItem.isRead) ? "Mark unread" : "Mark read"}
              </button>
              <button
                type="button"
                onClick={toggleResolvedState}
                className={workflowButtonClass("secondary", false)}
              >
                {(visualState.isResolved ?? currentItem.isResolved) ? "Reopen" : "Resolve"}
              </button>
            </div>
            {(escalationOpen || reassignOpen) ? (
              <InlineWorkflowActions
                escalationOpen={escalationOpen}
                reassignOpen={reassignOpen}
                escalationReason={escalationReason}
                reassignReason={reassignReason}
                escalationTarget={escalationTarget}
                reassignTarget={reassignTarget}
                owners={availableOwners}
                onEscalationOpenChange={setEscalationOpen}
                onReassignOpenChange={setReassignOpen}
                onEscalationReasonChange={setEscalationReason}
                onReassignReasonChange={setReassignReason}
                onEscalationTargetChange={setEscalationTarget}
                onReassignTargetChange={setReassignTarget}
                onEscalate={handleEscalate}
                onReassign={handleReassign}
                canEscalate={canEscalate}
                canReassign={canReassign}
              />
            ) : null}
          </div>
          {currentItem.timeSensitive ? <PendingOutlined className="mt-0.5 text-[#F59E0B]" style={{ fontSize: 18 }} /> : null}
        </div>
      </section>

      <div className="section-thread mt-1 min-w-0 overflow-hidden [&_section]:rounded-none [&_section]:border-x-0 [&_section]:border-b [&_section]:border-t-0 [&_section]:border-[#E6E8EC] [&_section]:bg-transparent [&_section_button]:px-0 [&_section_button]:py-3.5 [&_section>div>div>div]:px-0 [&_section>div>div>div]:py-3.5">
        {currentItem.sections.qs ? (
          <DisclosureSection title={<SectionHeaderTitle icon={<GavelOutlined style={{ fontSize: 16 }} />} label="QS position" imageCount={countImages(currentItem.sections.qs)} />}>
            <DisputeThreadSection
              sectionKey="qs"
              item={currentItem}
              section={currentItem.sections.qs}
              contract={currentItem.contractContext}
              currentUserId={currentUser.id}
              showWarningIcon={currentItem.dispute.isActive}
              composerEnabled={actionSectionKey === "qs"}
              showWorkflowActions={showWorkflowActions && actionSectionKey === "qs"}
              canApprove={canApprove}
              canRaiseDispute={canRaiseDispute}
              canRespondToDispute={canRespondToDispute}
              canMarkExternalResolution={canMarkExternalResolution}
              onApprove={handleApprove}
              onReject={handleReject}
              onRaiseDispute={handleRaiseDispute}
              onResolveDispute={handleResolveDispute}
              disputeActive={currentItem.dispute.isActive}
              draftState={currentItem.drafts.qs}
              onSaveDraft={persistDraft}
              onDeleteDraft={removeDraft}
              onSendDraft={appendReply}
            />
          </DisclosureSection>
        ) : null}

        {currentItem.sections.contractor ? (
          <DisclosureSection title={<SectionHeaderTitle icon={<PersonOutlineOutlined style={{ fontSize: 16 }} />} label="Contractor response" imageCount={countImages(currentItem.sections.contractor)} />}>
            <DisputeThreadSection
              sectionKey="contractor"
              item={currentItem}
              section={currentItem.sections.contractor}
              contract={currentItem.contractContext}
              currentUserId={currentUser.id}
              showWarningIcon={currentItem.dispute.isActive}
              composerEnabled={actionSectionKey === "contractor"}
              showWorkflowActions={showWorkflowActions && actionSectionKey === "contractor"}
              canApprove={canApprove}
              canRaiseDispute={canRaiseDispute}
              canRespondToDispute={canRespondToDispute}
              canMarkExternalResolution={canMarkExternalResolution}
              onApprove={handleApprove}
              onReject={handleReject}
              onRaiseDispute={handleRaiseDispute}
              onResolveDispute={handleResolveDispute}
              disputeActive={currentItem.dispute.isActive}
              draftState={currentItem.drafts.contractor}
              onSaveDraft={persistDraft}
              onDeleteDraft={removeDraft}
              onSendDraft={appendReply}
            />
          </DisclosureSection>
        ) : null}
      </div>

      <section className="min-w-0 overflow-hidden border-b border-[#E6E8EC] py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Resolution path</p>
        <div className="mt-2 min-w-0 space-y-1 text-xs text-[#667085]">
          <p className="break-words"><span className="font-semibold text-[#0B0F1A]">Current:</span> {topSummary.currentPath}</p>
          {topSummary.nextPath ? <p className="break-words"><span className="font-semibold text-[#0B0F1A]">Next:</span> {topSummary.nextPath}</p> : null}
          {topSummary.outcome ? <p className="break-words"><span className="font-semibold text-[#0B0F1A]">Outcome:</span> {topSummary.outcome}</p> : null}
        </div>
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden border-b border-[#E6E8EC] py-4 text-xs text-[#667085]">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="font-semibold text-[#0B0F1A]">Release summary</span>
          <span className="min-w-0 truncate text-right">{isFullyReleased ? "Funds released" : formatReleaseStatus(releaseStatus)}</span>
        </div>
        <div className="min-w-0 space-y-1.5 overflow-hidden">
          <ReleaseMetric label="Approved value" value={currency(currentItem.approvedValue)} />
          <ReleaseMetric label="Held in dispute" value={currency(disputedValue)} />
          <ReleaseMetric label="Previously released" value={currency(releasedValue)} />
          <ReleaseMetric label="Authorised release" value={currency(authorisedReleaseValue)} />
          <ReleaseMetric label="Remaining releasable" value={currency(remainingUndisputedReleasableValue)} />
          <ReleaseMetric label="30-day WIP" value={currency(fundingContext.projectedWip30Days)} />
          <ReleaseMetric label="Reserve buffer" value={currency(fundingContext.reserveBuffer)} />
          <ReleaseMetric label="Total required" value={currency(fundingContext.totalRequiredWithBuffer)} />
          <ReleaseMetric label="Funding cover" value={currency(fundingContext.availableFundingCover)} />
          <ReleaseMetric label="Funding gap" value={currency(fundingContext.fundingGap)} />
          {fundingShortfall > 0 ? <ReleaseMetric label="Shortfall" value={currency(fundingShortfall)} /> : null}
        </div>
      </section>

      <div className="section-thread mt-1 min-w-0 overflow-hidden [&_section]:rounded-none [&_section]:border-x-0 [&_section]:border-b [&_section]:border-t-0 [&_section]:border-[#E6E8EC] [&_section]:bg-transparent [&_section_button]:px-0 [&_section_button]:py-3.5 [&_section>div>div>div]:px-0 [&_section>div>div>div]:py-3.5">
        <DisclosureSection title={<SectionHeaderTitle icon={<AttachFileOutlined style={{ fontSize: 16 }} />} label="Attachments" imageCount={countImages(currentItem.sections.qs) + countImages(currentItem.sections.contractor)} />}>
          <AttachmentSummary item={currentItem} />
        </DisclosureSection>

        <DisclosureSection title={<SectionHeaderTitle icon={<PendingOutlined style={{ fontSize: 16 }} />} label="Activity" />}>
          <TimelineEvents item={currentItem} mode="activity" />
        </DisclosureSection>

        <DisclosureSection title={<SectionHeaderTitle icon={<PendingOutlined style={{ fontSize: 16 }} />} label="Approval chain" />}>
          <ApprovalChainRows item={currentItem} />
        </DisclosureSection>

        <DisclosureSection title={<SectionHeaderTitle icon={<CheckCircle style={{ fontSize: 16 }} />} label="Approval history" />}>
          <TimelineEvents item={currentItem} mode="approval" />
        </DisclosureSection>
      </div>
    </div>
  );
}

function DisputeThreadSection({
  sectionKey,
  item,
  section,
  contract,
  currentUserId,
  showWarningIcon,
  composerEnabled: _composerEnabled,
  showWorkflowActions,
  canApprove,
  canRaiseDispute,
  canRespondToDispute,
  canMarkExternalResolution,
  onApprove,
  onReject,
  onRaiseDispute,
  onResolveDispute,
  disputeActive,
  draftState,
  onSaveDraft,
  onDeleteDraft,
  onSendDraft,
}: {
  sectionKey: SectionKey;
  item: ActionFeedItem;
  section: ThreadSection;
  contract: ActionFeedItem["contractContext"];
  currentUserId: string;
  showWarningIcon: boolean;
  composerEnabled: boolean;
  showWorkflowActions: boolean;
  canApprove: boolean;
  canRaiseDispute: boolean;
  canRespondToDispute: boolean;
  canMarkExternalResolution: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRaiseDispute: () => void;
  onResolveDispute: () => void;
  disputeActive: boolean;
  draftState?: ActionFeedItem["drafts"][SectionKey];
  onSaveDraft: (sectionKey: SectionKey, draftState: NonNullable<ActionFeedItem["drafts"][SectionKey]>) => void;
  onDeleteDraft: (sectionKey: SectionKey) => void;
  onSendDraft: (sectionKey: SectionKey, payload: SectionDraftPayload) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draft: NonNullable<ActionFeedItem["drafts"][SectionKey]> = draftState ?? {
    draftText: "",
    draftAttachments: [],
    isComposerOpen: false,
  };
  const fallbackReplyMessageId = section.messages[section.messages.length - 1]?.id;
  const activeReplyMessageId = draft.replyToMessageId ?? fallbackReplyMessageId;
  const draftImages = useMemo(() => draft.draftAttachments.filter((attachment) => attachment.type === "image").map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
  })), [draft.draftAttachments]);
  const draftFiles = useMemo(() => draft.draftAttachments.filter((attachment) => attachment.type === "file").map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    sizeLabel: getFileExtension(attachment.name),
    url: attachment.url,
  })), [draft.draftAttachments]);
  const hasDraftContent = draft.draftText.trim().length > 0 || draft.draftAttachments.length > 0;

  useEffect(() => {
    return () => {
      draft.draftAttachments.forEach((file) => {
        if (file.url.startsWith("blob:")) URL.revokeObjectURL(file.url);
      });
    };
  }, [draft.draftAttachments]);

  function updateDraft(next: Partial<typeof draft>) {
    onSaveDraft(sectionKey, {
      draftText: next.draftText ?? draft.draftText,
      draftAttachments: next.draftAttachments ?? draft.draftAttachments,
      isComposerOpen: next.isComposerOpen ?? draft.isComposerOpen,
      replyToMessageId: next.replyToMessageId ?? draft.replyToMessageId,
    });
  }

  function cancelDraft() {
    updateDraft({ isComposerOpen: false });
  }

  function deleteCurrentDraft() {
    draft.draftAttachments.forEach((attachment) => {
      if (attachment.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    });
    onDeleteDraft(sectionKey);
  }

  function addDraftImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const nextImages: Attachment[] = Array.from(fileList)
      .filter((file) => file.type.startsWith("image/"))
      .map((file, index) => ({
        id: `draft-image-${Date.now()}-${index}`,
        type: "image" as const,
        name: file.name,
        url: URL.createObjectURL(file),
        uploadedBy: currentUserId,
      }));
    if (nextImages.length === 0) return;
    updateDraft({ isComposerOpen: true, draftAttachments: [...draft.draftAttachments, ...nextImages] });
  }

  function addDraftFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const nextFiles: Attachment[] = Array.from(fileList).map((file, index) => ({
      id: `draft-file-${Date.now()}-${index}`,
      type: "file" as const,
      name: file.name,
      url: URL.createObjectURL(file),
      uploadedBy: currentUserId,
    }));
    updateDraft({ isComposerOpen: true, draftAttachments: [...draft.draftAttachments, ...nextFiles] });
  }

  function handleSend() {
    const trimmed = draft.draftText.trim();
    if (!trimmed && draft.draftAttachments.length === 0) return;
    onSendDraft(sectionKey, {
      message: trimmed,
      attachments: draft.draftAttachments,
    });
  }

  return (
    <div>
      <div className="divide-y divide-[#E6E8EC]">
        {section.messages.map((message) => (
          <div key={message.id}>
            <ThreadEntryRow
              message={message}
              item={item}
              contract={contract}
              showWarningIcon={showWarningIcon}
              onReply={() => updateDraft({ isComposerOpen: true, replyToMessageId: message.id })}
            />
            {draft.isComposerOpen && activeReplyMessageId === message.id ? (
              <DisputeSectionComposer
                message={draft.draftText}
                images={draftImages}
                files={draftFiles}
                showDeleteDraft={hasDraftContent}
                onMessageChange={(messageValue) => updateDraft({ draftText: messageValue, replyToMessageId: message.id })}
                onAddImages={() => imageInputRef.current?.click()}
                onAddFiles={() => fileInputRef.current?.click()}
                onCancel={cancelDraft}
                onDeleteDraft={deleteCurrentDraft}
                onRemoveImage={(imageId) => {
                  const attachment = draft.draftAttachments.find((item) => item.id === imageId);
                  if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
                  updateDraft({ draftAttachments: draft.draftAttachments.filter((item) => item.id !== imageId), replyToMessageId: message.id });
                }}
                onRemoveFile={(fileId) => {
                  const attachment = draft.draftAttachments.find((item) => item.id === fileId);
                  if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
                  updateDraft({ draftAttachments: draft.draftAttachments.filter((item) => item.id !== fileId), replyToMessageId: message.id });
                }}
                onSend={handleSend}
              />
            ) : null}
          </div>
        ))}
      </div>
      {section.messages.length === 0 ? <p className="py-2 text-sm text-[#667085]">No messages yet.</p> : null}
      {disputeActive && !canRespondToDispute ? (
        <p className="pt-2 text-xs text-[#98A2B3]">Dispute response requires authorised dispute role.</p>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          addDraftImages(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          addDraftFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {showWorkflowActions ? (
        <div className="mt-3 flex items-center gap-3 border-t border-[#E6E8EC] pt-3 text-[#102345]">
          <IconAction label="Approve" onClick={onApprove} disabled={!canApprove}>
            <CheckCircle style={{ fontSize: 18 }} />
          </IconAction>
          <IconAction label="Reject" onClick={onReject} disabled={!canApprove}>
            <CloseOutlined style={{ fontSize: 18 }} />
          </IconAction>
          {!disputeActive ? (
            <IconAction label="Raise dispute" onClick={onRaiseDispute} disabled={!canRaiseDispute}>
              <ReportProblemOutlined style={{ fontSize: 18 }} />
            </IconAction>
          ) : (
            <IconAction label="Resolve dispute" onClick={onResolveDispute} disabled={!canMarkExternalResolution}>
              <GavelOutlined style={{ fontSize: 18 }} />
            </IconAction>
          )}
        </div>
      ) : null}

    </div>
  );
}

function DisputeSectionComposer({
  message,
  images,
  files,
  showDeleteDraft,
  onMessageChange,
  onAddImages,
  onAddFiles,
  onCancel,
  onDeleteDraft,
  onRemoveImage,
  onRemoveFile,
  onSend,
}: {
  message: string;
  images: ComposerImageDraft[];
  files: ComposerFileDraft[];
  showDeleteDraft: boolean;
  onMessageChange: (value: string) => void;
  onAddImages: () => void;
  onAddFiles: () => void;
  onCancel: () => void;
  onDeleteDraft: () => void;
  onRemoveImage: (imageId: string) => void;
  onRemoveFile: (fileId: string) => void;
  onSend: () => void;
}) {
  const sendDisabled = !message.trim() && images.length === 0 && files.length === 0;

  return (
    <div className="min-w-0 overflow-hidden border-t border-[#E6E8EC] py-2.5">
      <textarea
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder="Write a reply…"
        className="min-h-[72px] w-full resize-y rounded-lg border border-[#D7DBE2] bg-white px-3 py-2 text-sm text-[#0B0F1A] outline-none placeholder:text-[#98A2B3] focus:border-[#A8B3C7]"
      />

      {images.length > 0 || files.length > 0 ? (
        <div className="mt-2 space-y-2">
          {images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image) => (
                <div key={image.id} className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-lg border border-[#D7DBE2]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => onRemoveImage(image.id)} className="absolute right-1 top-1 text-white">
                    <CloseOutlined style={{ fontSize: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((file) => (
                <div key={file.id} className="flex min-w-0 items-center justify-between gap-2 overflow-hidden text-sm text-[#4B5565]">
                  <span className="rounded-md bg-[#EEF0F3] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#667085]">{file.sizeLabel}</span>
                  <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                  <button type="button" onClick={() => onRemoveFile(file.id)} className="text-[#667085]">
                    <CloseOutlined style={{ fontSize: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex min-w-0 items-center justify-between gap-3 overflow-hidden text-[#667085]">
        <div className="flex shrink-0 items-center gap-3">
          <IconAction label="Add image" onClick={onAddImages}>
            <ImageOutlined style={{ fontSize: 18 }} />
          </IconAction>
          <IconAction label="Attach file" onClick={onAddFiles}>
            <AttachFileOutlined style={{ fontSize: 18 }} />
          </IconAction>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3">
          {showDeleteDraft ? (
            <IconAction label="Delete draft" onClick={onDeleteDraft}>
              <DeleteOutlineOutlined style={{ fontSize: 18 }} />
            </IconAction>
          ) : null}
          <IconAction label="Cancel" onClick={onCancel}>
            <CloseOutlined style={{ fontSize: 18 }} />
          </IconAction>
          <IconAction label="Send" onClick={onSend} disabled={sendDisabled}>
            <SendOutlined style={{ fontSize: 18 }} />
          </IconAction>
        </div>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center justify-center text-inherit transition hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function workflowButtonClass(
  tone: "primary" | "secondary" | "danger" | undefined,
  disabled: boolean,
) {
  const base = "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  if (disabled) return `${base} border-[#E6E8EC] bg-[#F7F8FA] text-[#98A2B3]`;
  if (tone === "primary") return `${base} border-[#102345] bg-[#102345] text-white hover:border-[#1D4ED8] hover:bg-[#1D4ED8]`;
  if (tone === "danger") return `${base} border-[#FECACA] bg-[#FEF2F2] text-[#B42318] hover:border-[#FCA5A5]`;
  return `${base} border-[#D7DBE2] bg-white text-[#102345] hover:border-[#A8B3C7] hover:text-[#1D4ED8]`;
}

function InlineWorkflowActions({
  escalationOpen,
  reassignOpen,
  escalationReason,
  reassignReason,
  escalationTarget,
  reassignTarget,
  owners,
  onEscalationOpenChange,
  onReassignOpenChange,
  onEscalationReasonChange,
  onReassignReasonChange,
  onEscalationTargetChange,
  onReassignTargetChange,
  onEscalate,
  onReassign,
  canEscalate,
  canReassign,
}: {
  escalationOpen: boolean;
  reassignOpen: boolean;
  escalationReason: string;
  reassignReason: string;
  escalationTarget: WorkflowAuthority;
  reassignTarget: string;
  owners: Array<[string, ActionFeedItem["contractContext"]["contacts"][string]]>;
  onEscalationOpenChange: (value: boolean) => void;
  onReassignOpenChange: (value: boolean) => void;
  onEscalationReasonChange: (value: string) => void;
  onReassignReasonChange: (value: string) => void;
  onEscalationTargetChange: (value: WorkflowAuthority) => void;
  onReassignTargetChange: (value: string) => void;
  onEscalate: () => void;
  onReassign: () => void;
  canEscalate: boolean;
  canReassign: boolean;
}) {
  return (
    <div className="mt-3 min-w-0 overflow-hidden border-t border-[#E6E8EC] pt-3 text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <button type="button" disabled={!canEscalate} onClick={() => onEscalationOpenChange(!escalationOpen)} className="font-semibold text-[#102345] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40">
          Escalate
        </button>
        <button type="button" disabled={!canReassign} onClick={() => onReassignOpenChange(!reassignOpen)} className="font-semibold text-[#102345] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40">
          Reassign owner
        </button>
      </div>

      {escalationOpen ? (
        <div className="mt-3 min-w-0 space-y-2 overflow-hidden border-t border-[#E6E8EC] pt-3">
          <select
            value={escalationTarget}
            onChange={(event) => onEscalationTargetChange(event.target.value as WorkflowAuthority)}
            className="w-full rounded-lg border border-[#D7DBE2] bg-white px-3 py-2 text-xs text-[#0B0F1A] outline-none"
          >
            <option value="qs">QS review</option>
            <option value="contractor">Contractor response</option>
            <option value="client">Commercial review</option>
            <option value="treasury">Treasury hold</option>
          </select>
          <input
            value={escalationReason}
            onChange={(event) => onEscalationReasonChange(event.target.value)}
            placeholder="Reason for escalation"
            className="w-full rounded-lg border border-[#D7DBE2] px-3 py-2 text-xs outline-none"
          />
          <div className="flex justify-end gap-3 whitespace-nowrap">
            <button type="button" onClick={() => onEscalationOpenChange(false)} className="text-[#667085]">Cancel</button>
            <button type="button" disabled={!canEscalate} onClick={onEscalate} className="font-semibold text-[#102345] disabled:cursor-not-allowed disabled:opacity-40">Save</button>
          </div>
        </div>
      ) : null}

      {reassignOpen ? (
        <div className="mt-3 min-w-0 space-y-2 overflow-hidden border-t border-[#E6E8EC] pt-3">
          <select
            value={reassignTarget}
            onChange={(event) => onReassignTargetChange(event.target.value)}
            className="w-full rounded-lg border border-[#D7DBE2] bg-white px-3 py-2 text-xs text-[#0B0F1A] outline-none"
          >
            <option value="">Select owner</option>
            {owners.map(([contactId, contact]) => (
              <option key={contactId} value={contactId}>{contact.name}</option>
            ))}
          </select>
          <input
            value={reassignReason}
            onChange={(event) => onReassignReasonChange(event.target.value)}
            placeholder="Reason for reassignment"
            className="w-full rounded-lg border border-[#D7DBE2] px-3 py-2 text-xs outline-none"
          />
          <div className="flex justify-end gap-3 whitespace-nowrap">
            <button type="button" onClick={() => onReassignOpenChange(false)} className="text-[#667085]">Cancel</button>
            <button type="button" disabled={!canReassign} onClick={onReassign} className="font-semibold text-[#102345] disabled:cursor-not-allowed disabled:opacity-40">Save</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReleaseMetric({ label, value, valueClassName = "text-[#0B0F1A]" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span title={value} className={`min-w-0 truncate text-right font-medium ${valueClassName}`}>{value || "—"}</span>
    </div>
  );
}

function ThreadEntryRow({
  message,
  item,
  contract,
  showWarningIcon,
  onReply,
}: {
  message: ThreadMessage;
  item: ActionFeedItem;
  contract: ActionFeedItem["contractContext"];
  showWarningIcon: boolean;
  onReply: () => void;
}) {
  const baseContact = getContactIdentity(message.senderId, contract);
  const contact = {
    ...baseContact,
    workflowContext: deriveContactWorkflowContext(message.senderId, item),
  };
  const messageMeta = deriveMessageMeta(message, item);
  const attachments = useMemo<PreviewAttachment[]>(
    () =>
      (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        url: attachment.url,
        fileType: getFileExtension(attachment.name).toUpperCase(),
      })),
    [message.attachments],
  );
  const showMeta = message.visibility === "internal_note" || message.actionIntent || message.authoredForRole || message.deliveryStatus === "updated";

  return (
    <div className="min-w-0 overflow-hidden py-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3 overflow-hidden">
          <ClickableAvatar contact={contact}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF0FF] text-xs font-semibold text-[#102345]">
              {getContactInitials(contact)}
            </div>
          </ClickableAvatar>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="min-w-0 max-w-full truncate text-sm font-semibold text-[#0B0F1A]" title={contact.name}>{contact.name}</p>
              <p className="min-w-0 max-w-full truncate text-xs text-[#667085]" title={contact.projectRole ?? contact.companyRoleTitle ?? contact.role}>{contact.projectRole ?? contact.companyRoleTitle ?? contact.role}</p>
              <p className="min-w-0 max-w-full truncate text-xs text-[#98A2B3]" title={contact.organisation}>{contact.organisation}</p>
            </div>
          </div>
        </div>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${showWarningIcon ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#EAF8EE] text-[#10B981]"}`}>
          {showWarningIcon ? <ReportProblemOutlined style={{ fontSize: 14 }} /> : <CheckCircle style={{ fontSize: 14 }} />}
        </span>
      </div>

      <p className="mt-2.5 whitespace-pre-line break-words text-sm leading-6 text-[#4B5565]">{message.text}</p>
      {showMeta ? (
        <p className={`mt-2 break-words text-[11px] font-medium ${message.visibility === "internal_note" ? "text-[#9A3412]" : "text-[#98A2B3]"}`}>
          {[messageMeta.visibilityLabel, messageMeta.statusLabel].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {attachments.length > 0 ? <div className="mt-2.5"><AttachmentGrid attachments={attachments} /></div> : null}

      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#98A2B3]">
        <span className="shrink-0 whitespace-nowrap">{formatTimestamp(message.timestamp)}</span>
        <button
          type="button"
          onClick={onReply}
          className="inline-flex items-center gap-1 font-medium text-[#102345] hover:text-[#1D4ED8]"
        >
          <ReplyOutlined style={{ fontSize: 14 }} />
          Reply
        </button>
      </div>
    </div>
  );
}

function AttachmentSummary({
  item,
}: {
  item: ActionFeedItem;
}) {
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>("all");
  const evidenceCounts = useMemo(() => deriveEvidenceCounts(item), [item]);
  const messageEntries = useMemo(() => (Object.entries(item.sections) as Array<[SectionKey, ThreadSection | undefined]>)
    .flatMap(([sectionKey, section]) =>
      (section?.messages ?? []).flatMap((message) =>
        (message.attachments ?? []).map((attachment) => ({
          sectionKey,
          attachment,
          message,
          sender: getContactIdentity(message.senderId, item.contractContext),
        })),
      ),
    ), [item.contractContext, item.sections]);
  const visibleAttachments = useMemo<PreviewAttachment[]>(
    () =>
      messageEntries
        .filter((entry) => {
          if (evidenceFilter === "all") return true;
          if (evidenceFilter === "images") return entry.attachment.type === "image";
          return getEvidenceBucketLabel(entry.attachment).toLowerCase() === evidenceFilter;
        })
        .map((entry) => ({
          id: entry.attachment.id,
          name: entry.attachment.name,
          type: entry.attachment.type,
          url: entry.attachment.url,
          fileType: getFileExtension(entry.attachment.name).toUpperCase(),
        })),
    [evidenceFilter, messageEntries],
  );

  if (evidenceCounts.total === 0) {
    return null;
  }

  return (
    <div className="min-w-0 divide-y divide-[#E6E8EC] overflow-hidden">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-3 text-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["all", "images", "plans", "contracts", "regulations", "files"] as EvidenceFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setEvidenceFilter(filter)}
            className={`shrink-0 rounded-full border px-2.5 py-1 font-medium capitalize ${
              evidenceFilter === filter ? "border-[#102345] bg-[#EAF0FF] text-[#102345]" : "border-[#D7DBE2] text-[#667085]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="py-3">
        <AttachmentGrid attachments={visibleAttachments} />
      </div>
    </div>
  );
}

function TimelineEvents({
  item,
  mode,
}: {
  item: ActionFeedItem;
  mode: "activity" | "approval";
}) {
  const rows = useMemo(() => deriveTimelineRows(item).filter((row) => row.kind === mode), [item, mode]);
  const events = mode === "approval" ? item.approvalHistory : item.activity;
  if (events.length === 0) {
    return <p className="py-2 text-sm text-[#667085]">{mode === "approval" ? "No approval events yet." : "No activity yet."}</p>;
  }

  return (
    <div className="min-w-0 divide-y divide-[#E6E8EC] overflow-hidden">
      {rows.map((row) => (
        <div key={row.id} className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 text-sm">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={`break-words ${row.emphasis === "warning" ? "text-[#B42318]" : row.emphasis === "positive" ? "text-[#047857]" : "text-[#0B0F1A]"}`}>
              <span className="font-semibold">{row.actorLabel}</span> · {row.primaryText}
            </p>
            {row.secondaryText ? <p className="mt-1 break-words text-xs text-[#98A2B3]">{row.secondaryText}</p> : null}
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs text-[#98A2B3]">{formatTimestamp(row.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

function ApprovalChainRows({ item }: { item: ActionFeedItem }) {
  const chain = useMemo(() => deriveApprovalChain(item), [item]);
  if (chain.length === 0) {
    return <p className="py-2 text-sm text-[#667085]">No approval chain configured.</p>;
  }

  return (
    <div className="min-w-0 divide-y divide-[#E6E8EC] overflow-hidden">
      {chain.map((step) => (
        <ApprovalChainRow key={step.stepId} step={step} item={item} />
      ))}
    </div>
  );
}

function ApprovalChainRow({
  step,
  item,
}: {
  step: ApprovalChainStep;
  item: ActionFeedItem;
}) {
  const actor = step.actorId ? getContactIdentity(step.actorId, item.contractContext) : null;

  return (
    <div className="min-w-0 overflow-hidden py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-[#0B0F1A]" title={step.role}>{step.role}</p>
          <p className="mt-1 truncate text-xs text-[#667085]" title={`${actor ? `${actor.name} · ` : ""}${formatChainStatus(step.status)}${step.timestamp ? ` · ${formatTimestamp(step.timestamp)}` : ""}`}>
            {actor ? `${actor.name} · ` : ""}
            {formatChainStatus(step.status)}
            {step.timestamp ? ` · ${formatTimestamp(step.timestamp)}` : ""}
          </p>
          {step.note ? <p className="mt-1 break-words text-xs leading-5 text-[#667085]">{step.note}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${chainStatusClass(step.status)}`}>
          {formatChainStatus(step.status)}
        </span>
      </div>
    </div>
  );
}

function SectionHeaderTitle({
  icon,
  label,
  imageCount,
}: {
  icon: ReactNode;
  label: string;
  imageCount?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="flex h-5 w-5 items-center justify-center text-[#667085]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
      {imageCount ? (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[11px] font-semibold text-[#102345]">
          <ImageOutlined style={{ fontSize: 12 }} />
          {imageCount}
        </span>
      ) : null}
    </div>
  );
}

function countImages(section?: ThreadSection) {
  return (section?.messages ?? []).reduce((total, message) => total + (message.attachments ?? []).filter((attachment) => attachment.type === "image").length, 0);
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatAuthorityLabel(authority: WorkflowAuthority) {
  switch (authority) {
    case "qs":
      return "Awaiting QS review";
    case "contractor":
      return "Awaiting contractor response";
    case "client":
      return "Awaiting commercial approval";
    default:
      return "Awaiting treasury release";
  }
}

function formatReleaseStatus(status: ActionFeedItem["releaseStatus"]) {
  switch (status) {
    case "ready":
      return "Release ready";
    case "partial_released":
      return "Part released";
    case "released":
      return "Released";
    default:
      return "Blocked";
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEvidenceRequirement(value: string) {
  return value.replace("_", " ");
}

function contextLabel(type: ReturnType<typeof deriveNextRequiredAction>["type"]) {
  if (type === "funding_block") return "Funding issue";
  if (type === "approval_required") return "Approval task";
  if (type === "dispute_active") return "Dispute case";
  if (type === "evidence_required") return "Evidence task";
  if (type === "release_ready") return "Release task";
  if (type === "authority_required") return "Authority required";
  return "Workflow task";
}

function mapRoleToAuthority(role: string): WorkflowAuthority {
  if (role === "qs") return "qs";
  if (role === "contractor") return "contractor";
  if (role === "funder") return "treasury";
  return "client";
}

function getFileExtension(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension : "file";
}

function getEvidenceBucketLabel(attachment: Attachment) {
  const name = attachment.name.toLowerCase();
  if (name.includes("plan") || name.includes("drawing")) return "Plans";
  if (name.includes("contract") || name.includes("scope") || name.includes("instruction")) return "Contracts";
  if (name.includes("regulation") || name.includes("compliance")) return "Regulations";
  return attachment.type === "image" ? "Images" : "Files";
}

function formatChainStatus(status: ApprovalChainStep["status"]) {
  return status.replace("_", " ");
}

function chainStatusClass(status: ApprovalChainStep["status"]) {
  switch (status) {
    case "complete":
      return "bg-[#EAF8EE] text-[#047857]";
    case "current":
      return "bg-[#EAF0FF] text-[#102345]";
    case "rejected":
    case "returned":
      return "bg-[#FEE2E2] text-[#B42318]";
    default:
      return "bg-[#F3F4F6] text-[#667085]";
  }
}
