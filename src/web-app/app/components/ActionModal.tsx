

import React, { useState } from "react";
import { actionTypeConfig, ActionType } from "@/lib/actionConfig";
import { systemIcons } from "@/lib/icons";

export interface ActionModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  actionType?: ActionType;
  children?: React.ReactNode;
}

export default function ActionModal({ open, title, onClose, actionType, children }: ActionModalProps) {
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  if (!open) return null;
  const config = actionType ? actionTypeConfig[actionType] : undefined;
  const Icon = config ? systemIcons[config.icon] : null;

  // Example structured content for each action type
  const issueSummary = config?.description || "Review this item.";
  const whyItMatters = `This ${config?.label?.toLowerCase() || 'action'} is important for project integrity and compliance.`;
  const recommendedNextStep = config?.ctaLabel || "Review";

  // Local-state actions
  const handlePrimary = () => setActionTaken("primary");
  const handleSecondary = () => setActionTaken("secondary");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-neutral-900 rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-200"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={20} className="text-blue-300" />}
          <h3 className="text-lg font-bold text-neutral-100">{config?.label ?? title}</h3>
        </div>
        <div className="mb-2 text-neutral-400 text-sm font-semibold">{issueSummary}</div>
        <div className="mb-2 text-neutral-400 text-xs">{whyItMatters}</div>
        <div className="mb-4 text-blue-300 text-xs font-semibold">Recommended next step: {recommendedNextStep}</div>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex gap-2 mt-2">
          <button
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 text-xs font-semibold"
            onClick={handlePrimary}
            disabled={actionTaken === "primary"}
          >
            {config?.ctaLabel || "Review"}
          </button>
          <button
            className="rounded border border-neutral-700 px-4 py-2 text-neutral-200 hover:bg-neutral-800 text-xs font-semibold"
            onClick={handleSecondary}
            disabled={actionTaken === "secondary"}
          >
            Secondary Action
          </button>
        </div>
        {actionTaken && (
          <div className="mt-3 text-center text-blue-300 text-xs font-semibold">
            {actionTaken === "primary" ? "Primary action taken." : "Secondary action taken."}
          </div>
        )}
      </div>
    </div>
  );
}
