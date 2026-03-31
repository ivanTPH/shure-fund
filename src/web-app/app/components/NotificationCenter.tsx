"use client";

import React, { useMemo, useState } from "react";
import { badgePatterns, buttonPatterns, inputPatterns, layoutPatterns, surfacePatterns, typographyScale } from "@/lib/designSystem";
import type { PriorityKey } from "@/lib/priorityConfig";
import type { ContractRecord, NotificationRecord, NotificationStatus, StageRecord, UserRole } from "@/lib/stageStore";

const notificationTimestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

type NotificationCenterProps = {
  notifications: NotificationRecord[];
  contracts: ContractRecord[];
  stages: StageRecord[];
  onUpdateStatus: (notificationId: string, status: NotificationStatus) => void;
  defaultRoleFilter?: UserRole | "all";
  compact?: boolean;
};

function formatNotificationTime(timestamp: string) {
  return notificationTimestampFormatter.format(new Date(timestamp));
}

const panelShellClass = surfacePatterns.shell;
const itemCardClass = `${surfacePatterns.interactive} px-4 py-4`;
const footerRowClass = layoutPatterns.cardFooterRow;

export default function NotificationCenter({
  notifications,
  contracts,
  stages,
  onUpdateStatus,
  defaultRoleFilter = "all",
  compact = false,
}: NotificationCenterProps) {
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">(defaultRoleFilter);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityKey | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all");

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (roleFilter !== "all" && notification.assignedRole !== roleFilter) return false;
        if (projectFilter !== "all" && notification.projectId !== projectFilter) return false;
        if (contractFilter !== "all" && notification.contractId !== contractFilter) return false;
        if (stageFilter !== "all" && notification.stageId !== stageFilter) return false;
        if (priorityFilter !== "all" && notification.priority !== priorityFilter) return false;
        if (statusFilter !== "all" && notification.status !== statusFilter) return false;
        return true;
      }),
    [contractFilter, notifications, priorityFilter, projectFilter, roleFilter, stageFilter, statusFilter],
  );

  return (
    <section className={`${panelShellClass} ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className={typographyScale.sectionTitle}>Notification Centre</h3>
          <p className={typographyScale.helper}>Role-routed tasks and notifications sourced from shared queue assignments.</p>
        </div>
        <span className={badgePatterns.neutral}>
          {filteredNotifications.length} item(s)
        </span>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2" : "md:grid-cols-3 xl:grid-cols-6"}`}>
        <select className={inputPatterns.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}>
          <option value="all">All roles</option>
          <option value="delivery">Delivery</option>
          <option value="professional">Professional</option>
          <option value="commercial">Commercial</option>
          <option value="treasury">Treasury</option>
          <option value="funder">Funder</option>
          <option value="admin">Admin</option>
        </select>
        <select className={inputPatterns.select} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {Array.from(new Set(notifications.map((notification) => notification.projectId))).map((projectId) => (
            <option key={projectId} value={projectId}>{projectId}</option>
          ))}
        </select>
        <select className={inputPatterns.select} value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
          <option value="all">All contracts</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.title}</option>
          ))}
        </select>
        <select className={inputPatterns.select} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          ))}
        </select>
        <select className={inputPatterns.select} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityKey | "all")}>
          <option value="all">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className={inputPatterns.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | "all")}>
          <option value="all">All statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="dismissed">Dismissed</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl bg-neutral-950/80 px-4 py-4 text-sm text-neutral-400">No notifications match the current filters.</div>
        ) : (
          filteredNotifications.map((notification) => (
            <div key={notification.id} className={itemCardClass}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-100">{notification.title}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={badgePatterns.neutral}>{notification.status}</span>
                  </div>
                </div>
                <div className="text-base font-bold text-neutral-100">{notification.assignedRole}</div>
                <div className="text-sm text-neutral-400">{notification.detail}</div>
                <div className={footerRowClass}>
                  <div className="text-xs text-neutral-500">
                    {notification.contractId ? `${contracts.find((contract) => contract.id === notification.contractId)?.title ?? notification.contractId} · ` : ""}
                    {notification.stageId ? `${stages.find((stage) => stage.id === notification.stageId)?.name ?? notification.stageId} · ` : ""}
                    {formatNotificationTime(notification.updatedAt)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-right">
                    <span className={`${badgePatterns.base} border-blue-700 bg-blue-950/60 text-blue-300`}>{notification.priority}</span>
                    {notification.status === "unread" ? (
                      <button className={buttonPatterns.subtle} onClick={() => onUpdateStatus(notification.id, "read")}>Mark read</button>
                    ) : null}
                    {notification.status !== "dismissed" ? (
                      <button className={buttonPatterns.subtle} onClick={() => onUpdateStatus(notification.id, "dismissed")}>Dismiss</button>
                    ) : null}
                    {notification.status !== "resolved" ? (
                      <button className={buttonPatterns.success} onClick={() => onUpdateStatus(notification.id, "resolved")}>Resolve</button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
