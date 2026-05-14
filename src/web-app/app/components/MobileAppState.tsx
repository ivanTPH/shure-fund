"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { initialSystemState } from "@/lib/demoData";
import { fetchSystemState } from "@/lib/supabaseQueries";
import { initializeSystemState, type StageDetailSectionKey } from "@/lib/systemState";
import type { SystemStateRecord } from "@/lib/shureFundModels";

type MobileAppStateValue = {
  state: SystemStateRecord;
  setState: React.Dispatch<React.SetStateAction<SystemStateRecord>>;
  selectedProjectId: string;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>;
  selectedStageId: string;
  setSelectedStageId: React.Dispatch<React.SetStateAction<string>>;
  selectedStageSection: StageDetailSectionKey;
  setSelectedStageSection: React.Dispatch<React.SetStateAction<StageDetailSectionKey>>;
  isLoading: boolean;
  loadError: string | null;
};

const MobileAppStateContext = createContext<MobileAppStateValue | null>(null);

export function useMobileAppState() {
  const context = useContext(MobileAppStateContext);
  if (!context) {
    throw new Error("useMobileAppState must be used within MobileAppStateProvider");
  }
  return context;
}

export default function MobileAppStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seed from initialSystemState so hooks never run with empty arrays (prevents crashes
  // in useProjectContext which does `state.projects[0]` as a fallback).
  const [state, setState] = useState<SystemStateRecord>(() => initializeSystemState(initialSystemState));
  const [selectedProjectId, setSelectedProjectId] = useState(initialSystemState.projects[0]?.id ?? "");
  const [selectedStageId, setSelectedStageId] = useState(initialSystemState.stages[0]?.id ?? "");
  const [selectedStageSection, setSelectedStageSection] = useState<StageDetailSectionKey>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSystemState(initialSystemState.currentUserId)
      .then((fetched) => {
        if (cancelled) return;
        setState(initializeSystemState(fetched));
        // Sync selected IDs to first project/stage from live data when available
        if (fetched.projects.length > 0) {
          setSelectedProjectId((prev) =>
            fetched.projects.some((p) => p.id === prev) ? prev : fetched.projects[0].id,
          );
        }
        if (fetched.stages.length > 0) {
          setSelectedStageId((prev) =>
            fetched.stages.some((s) => s.id === prev) ? prev : fetched.stages[0].id,
          );
        }
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load project data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      setState,
      selectedProjectId,
      setSelectedProjectId,
      selectedStageId,
      setSelectedStageId,
      selectedStageSection,
      setSelectedStageSection,
      isLoading,
      loadError,
    }),
    [isLoading, loadError, selectedProjectId, selectedStageId, selectedStageSection, state],
  );

  return <MobileAppStateContext.Provider value={value}>{children}</MobileAppStateContext.Provider>;
}
