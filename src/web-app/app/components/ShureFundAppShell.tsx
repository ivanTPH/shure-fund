"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FolderKanban, LayoutGrid, ReceiptPoundSterling, UserCircle2 } from "lucide-react";

import { initialSystemState } from "@/lib/demoData";
import {
  getRoleInboxItems,
  getProjectWorkspaceSummary,
  getUserFacingRoleLabel,
  initializeSystemState,
  setCurrentUser,
  type DashboardAudienceMode,
  type StageDetailSectionKey,
} from "@/lib/systemState";
import type { SystemStateRecord } from "@/lib/shureFundModels";
import type { WorkspaceDecisionCue } from "@/lib/systemState";
import { activeControl, isControlActive, uiControlChecklist } from "./uiCapability";

export type AppSection = "actions" | "summary" | "payments" | "packages" | "activity" | "settings";

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
  if (pathname === "/summary") return "summary";
  if (pathname === "/payments") return "payments";
  if (pathname === "/packages") return "packages";
  if (pathname === "/activity" || pathname === "/audit-log") return "activity";
  if (pathname === "/settings") return "settings";
  return "actions";
}

const navItems: Array<{
  section: AppSection;
  label: string;
  shortLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { section: "actions", label: "Requests", shortLabel: "Requests", href: "/", icon: Bell },
  { section: "summary", label: "Overview", shortLabel: "Overview", href: "/summary", icon: LayoutGrid },
  { section: "payments", label: "Payments", shortLabel: "Payments", href: "/payments", icon: ReceiptPoundSterling },
  { section: "packages", label: "Projects", shortLabel: "Projects", href: "/packages", icon: FolderKanban },
  { section: "activity", label: "Activity", shortLabel: "Activity", href: "/activity", icon: Bell },
  { section: "settings", label: "Account", shortLabel: "Account", href: "/settings", icon: UserCircle2 },
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
  const requestCount = useMemo(() => getRoleInboxItems(state, currentUser.role).length, [state, currentUser.role]);
  const projectSelectorControl = activeControl("Switches the project context and the requests shown for it.");
  const roleSelectorControl = activeControl("Switches the prototype role within the selected project context.");
  const settingsEntryControl = activeControl("Opens the prototype settings and truth-state guidance.");

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
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Image src="/favicon.ico" alt="Shure.Fund" width={34} height={34} className="h-8 w-8 rounded-[10px]" priority />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-950">Shure.Fund</p>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {activeSection === "actions" ? "Requests are your working inbox" : "Financial operations"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="truncate text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Acting as {getUserFacingRoleLabel(currentUser.role)}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/"
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      requestCount > 0 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    Requests{requestCount > 0 ? ` (${requestCount})` : ""}
                  </Link>
                  <Link
                    href="/settings"
                    aria-label={uiControlChecklist.settingsEntry.label}
                    className={`rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition ${
                      isControlActive(settingsEntryControl) ? "hover:border-slate-300 hover:bg-slate-50" : "pointer-events-none opacity-60"
                    }`}
                  >
                    Account
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">My projects</p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950"
                    value={selectedProjectId}
                    disabled={!isControlActive(projectSelectorControl)}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    aria-label={uiControlChecklist.projectSelector.label}
                  >
                    {state.projects.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2 md:min-w-[18rem]">
                  <label className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Acting as</p>
                    <select
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950"
                      value={state.currentUserId}
                      disabled={!isControlActive(roleSelectorControl)}
                      onChange={(event) => setState((current) => setCurrentUser(current, event.target.value))}
                      aria-label={uiControlChecklist.roleSelector.label}
                    >
                      {roleSwitchUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getUserFacingRoleLabel(user.role)} · {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="px-1 text-xs text-slate-500">{roleSelectorControl.reason}</p>
                </div>
              </div>

              <nav className="hidden gap-2 md:flex md:flex-wrap">
                {navItems.map((item) => {
                  const active = activeSection === item.section;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.section}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                        active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.section === "actions" && requestCount > 0 ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
                          {requestCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6">{children}</div>
          </main>

          <nav className="sticky bottom-0 z-30 border-t border-slate-200/80 bg-white/96 px-3 py-3 backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-xl grid-cols-5 gap-2">
              {navItems.map((item) => {
                const active = activeSection === item.section;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                      active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="relative">
                      <Icon className="h-4 w-4" />
                      {item.section === "actions" && requestCount > 0 ? (
                        <span className={`absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${active ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
                          {requestCount}
                        </span>
                      ) : null}
                    </div>
                    <span>{item.shortLabel}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </ShellStateContext.Provider>
  );
}
