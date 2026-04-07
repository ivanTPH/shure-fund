"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { initialSystemState } from "@/lib/demoData";
import {
  getProjectWorkspaceSummary,
  getUserFacingRoleLabel,
  initializeSystemState,
  setCurrentUser,
  type DashboardAudienceMode,
  type StageDetailSectionKey,
} from "@/lib/systemState";
import type { SystemStateRecord } from "@/lib/shureFundModels";
import type { WorkspaceDecisionCue } from "@/lib/systemState";

export type AppSection = "overview" | "payments" | "packages" | "activity" | "settings";

type ShellState = {
  state: SystemStateRecord;
  setState: React.Dispatch<React.SetStateAction<SystemStateRecord>>;
  audienceMode: DashboardAudienceMode;
  setAudienceMode: React.Dispatch<React.SetStateAction<DashboardAudienceMode>>;
  selectedProjectId: string;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>;
  selectedStageId: string;
  setSelectedStageId: React.Dispatch<React.SetStateAction<string>>;
  selectedStageSection: StageDetailSectionKey;
  setSelectedStageSection: React.Dispatch<React.SetStateAction<StageDetailSectionKey>>;
  showStageDetail: boolean;
  setShowStageDetail: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWorkspaceCue: { stageId: string; cue: WorkspaceDecisionCue } | null;
  setSelectedWorkspaceCue: React.Dispatch<React.SetStateAction<{ stageId: string; cue: WorkspaceDecisionCue } | null>>;
};

const ShellStateContext = createContext<ShellState | null>(null);

function getSectionFromPath(pathname: string): AppSection {
  if (pathname === "/payments") return "payments";
  if (pathname === "/packages") return "packages";
  if (pathname === "/activity" || pathname === "/audit-log") return "activity";
  if (pathname === "/settings") return "settings";
  return "overview";
}

const navItems: Array<{ section: AppSection; label: string; href: string }> = [
  { section: "overview", label: "Overview", href: "/" },
  { section: "payments", label: "Payments", href: "/payments" },
  { section: "packages", label: "Packages", href: "/packages" },
  { section: "activity", label: "Activity", href: "/activity" },
  { section: "settings", label: "Settings", href: "/settings" },
];

export function useShureFundShellState() {
  const context = useContext(ShellStateContext);
  if (!context) {
    throw new Error("useShureFundShellState must be used within ShureFundAppShell");
  }
  return context;
}

export default function ShureFundAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SystemStateRecord>(() => initializeSystemState(initialSystemState));
  const [audienceMode, setAudienceMode] = useState<DashboardAudienceMode>("operations");
  const [selectedProjectId, setSelectedProjectId] = useState(initialSystemState.projects[0]?.id ?? "");
  const [selectedStageId, setSelectedStageId] = useState("stage-foundation");
  const [selectedStageSection, setSelectedStageSection] = useState<StageDetailSectionKey>("overview");
  const [showStageDetail, setShowStageDetail] = useState(false);
  const [selectedWorkspaceCue, setSelectedWorkspaceCue] = useState<{ stageId: string; cue: WorkspaceDecisionCue } | null>(null);
  const pathname = usePathname();
  const activeSection = getSectionFromPath(pathname);

  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const roleSwitchUsers = state.users.filter((entry) => ["contractor", "commercial", "professional", "treasury", "executive"].includes(entry.role));
  const projectSummary = useMemo(() => getProjectWorkspaceSummary(state, project.id), [state, project.id]);

  const contextValue = useMemo<ShellState>(
    () => ({
      state,
      setState,
      audienceMode,
      setAudienceMode,
      selectedProjectId,
      setSelectedProjectId,
      selectedStageId,
      setSelectedStageId,
      selectedStageSection,
      setSelectedStageSection,
      showStageDetail,
      setShowStageDetail,
      selectedWorkspaceCue,
      setSelectedWorkspaceCue,
    }),
    [
      state,
      audienceMode,
      selectedProjectId,
      selectedStageId,
      selectedStageSection,
      showStageDetail,
      selectedWorkspaceCue,
    ],
  );

  return (
    <ShellStateContext.Provider value={contextValue}>
      <div className="flex h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.08),_transparent_28%),linear-gradient(180deg,#fbfcfc_0%,#f8fafc_44%,#f1f5f4_100%)] text-slate-900">
        <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/96 px-5 py-6 xl:flex xl:flex-col xl:justify-between">
          <div>
            <div className="rounded-2xl bg-slate-950 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Shure.Fund</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-white">Platform</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Payment control for construction packages.</p>
            </div>

            <nav className="mt-8 grid gap-2">
              {navItems.map((item) => {
                const active = activeSection === item.section;
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Organisation</p>
            <p className="mt-2 text-sm font-medium text-slate-950">Shure.Fund workspace</p>
            <p className="mt-1 text-xs text-slate-500">Settings, invitations, and access controls live here.</p>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/92 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current project</p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{projectSummary.postureReason}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Project</p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  >
                    {state.projects.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Current role</p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950"
                    value={state.currentUserId}
                    onChange={(event) => setState((current) => setCurrentUser(current, event.target.value))}
                  >
                    {roleSwitchUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserFacingRoleLabel(user.role)} · {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Link href="/settings" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white">
                  <p className="text-xs text-slate-500">Account</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{currentUser.name}</p>
                </Link>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </ShellStateContext.Provider>
  );
}
