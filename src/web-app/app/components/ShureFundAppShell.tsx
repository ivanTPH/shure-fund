"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { initialSystemState } from "@/lib/demoData";
import {
  getRoleInboxItems,
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
  activeRequestId: string | null;
  setActiveRequestId: React.Dispatch<React.SetStateAction<string | null>>;
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
  iconSrc: string;
}> = [{ section: "actions", label: "Requests", shortLabel: "Requests", href: "/", iconSrc: "/brand/icons/Notifications.svg" }];

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
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [showStageDetail, setShowStageDetail] = useState(false);
  const [selectedWorkspaceCue, setSelectedWorkspaceCue] = useState<{ stageId: string; cue: WorkspaceDecisionCue } | null>(null);
  const pathname = usePathname();
  const activeSection = getSectionFromPath(pathname);

  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const roleSwitchUsers = state.users.filter((entry) => ["contractor", "commercial", "professional", "treasury", "executive"].includes(entry.role));
  const requestCount = useMemo(() => getRoleInboxItems(state, currentUser.role).length, [state, currentUser.role]);
  const projectSelectorControl = activeControl("Switches the project context and the requests shown for it.");
  const roleSelectorControl = activeControl("Switches the prototype role within the selected project context.");

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
      activeRequestId,
      setActiveRequestId,
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
      activeRequestId,
      showStageDetail,
      selectedWorkspaceCue,
    ],
  );

  return (
    <ShellStateContext.Provider value={contextValue}>
      <div className="flex h-screen bg-transparent text-[var(--foreground)]">
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: "var(--surface-border)" }}>
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/brand/shure-fund-icon.png"
                      alt="Shure.Fund"
                      width={40}
                      height={40}
                      className="h-9 w-9 rounded-[12px]"
                      priority
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-[0.18em]" style={{ color: "var(--brand-navy-strong)" }}>
                        SHURE.FUND
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "rgba(13, 17, 68, 0.62)" }}>
                        {activeSection === "actions" ? "Requests are your working inbox" : "Financial operations"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="truncate text-xl font-semibold tracking-[-0.03em] sm:text-2xl" style={{ color: "var(--brand-navy)" }}>
                      {project.name}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "rgba(13, 17, 68, 0.66)" }}>
                      Acting as {getUserFacingRoleLabel(currentUser.role)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
                    style={{
                      backgroundColor: requestCount > 0 ? "var(--brand-navy)" : "rgba(13, 17, 68, 0.08)",
                      color: requestCount > 0 ? "var(--brand-white)" : "var(--brand-navy)",
                    }}
                  >
                    <Image src="/brand/icons/Notifications.svg" alt="" width={18} height={18} className="h-[18px] w-[18px]" aria-hidden />
                    Requests{requestCount > 0 ? ` (${requestCount})` : ""}
                  </Link>
                  <Link
                    href="/settings"
                    aria-label="Account"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white"
                    style={{ border: "1px solid var(--surface-border)" }}
                  >
                    <Image src="/brand/icons/Account.svg" alt="" width={18} height={20} className="h-5 w-5" aria-hidden />
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="rounded-[24px] bg-white px-4 py-3" style={{ border: "1px solid var(--surface-border)" }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(13, 17, 68, 0.62)" }}>
                    My projects
                  </p>
                  <select
                    className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--surface-muted)",
                      color: "var(--brand-navy)",
                    }}
                    value={selectedProjectId}
                    disabled={!isControlActive(projectSelectorControl)}
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value);
                      setActiveRequestId(null);
                    }}
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
                  <label className="rounded-[24px] px-4 py-3" style={{ border: "1px solid var(--surface-border)", backgroundColor: "var(--surface-muted)" }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(13, 17, 68, 0.62)" }}>
                      Acting as
                    </p>
                    <select
                      className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{
                        border: "1px solid var(--surface-border)",
                        backgroundColor: "var(--brand-white)",
                        color: "var(--brand-navy)",
                      }}
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
                  <p className="px-1 text-xs" style={{ color: "rgba(13, 17, 68, 0.62)" }}>
                    {roleSelectorControl.reason}
                  </p>
                </div>
              </div>

              <nav className="hidden gap-2 md:flex md:flex-wrap">
                {navItems.map((item) => {
                  const active = activeSection === item.section;
                  return (
                    <Link
                      key={item.section}
                      href={item.href}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: active ? "var(--brand-navy)" : "var(--brand-white)",
                        color: active ? "var(--brand-white)" : "var(--brand-navy)",
                        border: active ? "1px solid transparent" : "1px solid var(--surface-border)",
                      }}
                    >
                      <Image src={item.iconSrc} alt="" width={16} height={16} className="h-4 w-4" aria-hidden />
                      <span>{item.label}</span>
                      {item.section === "actions" && requestCount > 0 ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: active ? "var(--brand-aqua)" : "var(--brand-navy)",
                            color: active ? "var(--brand-navy)" : "var(--brand-white)",
                          }}
                        >
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
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium"
                    style={{
                      backgroundColor: active ? "var(--brand-navy)" : "transparent",
                      color: active ? "var(--brand-white)" : "rgba(13, 17, 68, 0.68)",
                    }}
                  >
                    <div className="relative">
                      <Image src={item.iconSrc} alt="" width={16} height={16} className="h-4 w-4" aria-hidden />
                      {item.section === "actions" && requestCount > 0 ? (
                        <span
                          className="absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                          style={{
                            backgroundColor: active ? "var(--brand-aqua)" : "var(--brand-navy)",
                            color: active ? "var(--brand-navy)" : "var(--brand-white)",
                          }}
                        >
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
