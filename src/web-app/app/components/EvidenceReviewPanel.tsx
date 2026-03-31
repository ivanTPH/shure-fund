
import React, { useEffect, useState } from "react";
import { statusConfig, StatusKey } from "@/lib/statusConfig";
import { systemIcons } from "@/lib/icons";
import { updateStageEvidence, type StageEvidenceItem } from "@/lib/stageStore";

type GroupedEvidence = Record<string, StageEvidenceItem[]>;

export interface EvidenceReviewPanelProps {
  stageId: string | null;
  evidenceItems: StageEvidenceItem[];
  onClose: () => void;
}

function EvidenceReviewPanel({ stageId, evidenceItems, onClose }: EvidenceReviewPanelProps) {
  const [items, setItems] = useState(() => evidenceItems.map(e => ({ ...e })));
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  useEffect(() => {
    const nextItems = evidenceItems.map((item) => ({ ...item }));
    setItems(nextItems);
    setSelectedId(nextItems[0]?.id || null);
  }, [evidenceItems]);
  if (!items || items.length === 0) return null;

  const grouped = items.reduce((acc, item) => {
    const key = item.status || "pending";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedEvidence);

  const selected = items.find(i => i.id === selectedId) || items[0];
  const selectItem = (id: string) => setSelectedId(id);

  const updateStatus = (status: string, note?: string) => {
    const nextItems: StageEvidenceItem[] = items.map((item) =>
      item.id === selected.id
        ? {
            ...item,
            status: status as StageEvidenceItem["status"],
            submissionState:
              status === "accepted"
                ? ("accepted" as const)
                : status === "rejected"
                ? ("rejected" as const)
                : ("request-more" as const),
            reviewerNote: note || item.reviewerNote,
          }
        : item
    );
    setItems(nextItems);
    if (stageId) {
      updateStageEvidence(stageId, nextItems);
    }
    setActionMessage(`Evidence marked as ${statusLabel(status as StageEvidenceItem["status"])}`);
    setTimeout(() => setActionMessage(null), 2000);
  };

  const statusLabel = (status: StageEvidenceItem["status"]) => {
    switch (status) {
      case "accepted":
        return "approved";
      case "rejected":
        return "blocked";
      case "pending":
        return "waiting";
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-neutral-900 rounded-lg shadow-lg max-w-3xl w-full p-6 relative flex flex-col md:flex-row gap-6">
        <button
          className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-200"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {/* Evidence List */}
        <div className="w-full md:w-1/2 border-r border-neutral-800 pr-4 overflow-y-auto max-h-[70vh]">
          <h3 className="text-lg font-bold mb-4 text-neutral-100">Evidence</h3>
          {(Object.entries(grouped) as [string, StageEvidenceItem[]][]).map(([status, group]) => {
            const config = statusConfig[status as StatusKey] || statusConfig["pending"];
            const Icon = systemIcons[config.icon];
            return (
              <div key={status} className="mb-3">
                <div className={`mb-1 text-xs font-bold flex items-center gap-1 ${config.textClass}`}>
                  {Icon && <Icon size={14} className="inline-block mr-1" />}
                  {config.label} ({group.length})
                </div>
                <ul className="divide-y divide-neutral-800">
                  {group.map((item: StageEvidenceItem) => (
                    <li
                      key={item.id}
                      className={`py-2 px-2 rounded cursor-pointer flex justify-between items-center ${selectedId === item.id ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                      onClick={() => selectItem(item.id)}
                    >
                      <span className="text-neutral-200 font-medium truncate max-w-[120px]">{item.name}</span>
                      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ml-2 ${config.badgeClass} ${config.borderClass ?? ''}`}>
                        {Icon && <Icon size={14} className="inline-block mr-1" />}
                        {config.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {/* Evidence Detail */}
        <div className="w-full md:w-1/2 pl-4">
          <h3 className="text-lg font-bold mb-4 text-neutral-100">Item details</h3>
          {selected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-200 text-base">{selected.name}</span>
                <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${statusConfig[selected.status as StatusKey]?.badgeClass ?? ''} ${statusConfig[selected.status as StatusKey]?.borderClass ?? ''}`}>
                  {systemIcons[statusConfig[selected.status as StatusKey]?.icon]?.({ size: 14, className: "inline-block mr-1" })}
                  {statusConfig[selected.status as StatusKey]?.label ?? selected.status}
                </span>
              </div>
              <div className="text-neutral-400 text-xs">Type: {selected.type}</div>
              <div className="text-neutral-400 text-xs">Required: {selected.required ? 'Yes' : 'No'}</div>
              <div className="text-neutral-400 text-xs">Sent by: {selected.uploadedBy}</div>
              {selected.reviewerNote && <div className="text-amber-300 text-xs">Note: {selected.reviewerNote}</div>}
              <div className="flex gap-2 mt-3">
                <button className="rounded bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-800" onClick={() => updateStatus('accepted')}>Accept</button>
                <button className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-800" onClick={() => updateStatus('rejected')}>Reject</button>
                <button className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700" onClick={() => updateStatus('pending', 'More evidence requested')}>Ask for more</button>
              </div>
              {actionMessage && <div className="mt-2 text-blue-300 text-xs font-semibold">{actionMessage}</div>}
            </div>
          ) : (
            <div className="text-neutral-400 text-sm">Select an item to see the details.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvidenceReviewPanel;
