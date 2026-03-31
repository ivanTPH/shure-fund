"use client";

import React from "react";
import type { ProjectOverviewModel, Role } from "@/lib/systemState";

type ProjectsIndexScreenProps = {
  projects: ProjectOverviewModel[];
  selectedRole: Role;
  onOpenProject: (projectId: string) => void;
  formatGBP: (value: number) => string;
};

function healthTone(state: ProjectOverviewModel["healthState"]) {
  switch (state) {
    case "healthy":
      return "border-green-200 bg-green-50 text-green-700";
    case "at-risk":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export default function ProjectsIndexScreen({
  projects,
  selectedRole,
  onOpenProject,
  formatGBP,
}: ProjectsIndexScreenProps) {
  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
        <p className="mt-1 text-sm text-slate-500">Open a project to see stage status and next steps.</p>
      </div>
      <div className="space-y-3">
        {projects.map((projectModel) => {
          const nextAction = projectModel.actionQueue[0] ?? null;

          return (
            <button
              key={projectModel.project.id}
              type="button"
              onClick={() => onOpenProject(projectModel.project.id)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{projectModel.project.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{projectModel.project.code} · {projectModel.contracts.length} contracts · {projectModel.stages.length} stages</div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-medium ${healthTone(projectModel.healthState)}`}>
                  {projectModel.healthState === "healthy" ? "Approved" : projectModel.healthState === "at-risk" ? "Waiting" : "Blocked"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Owner view</div>
                  <div className="mt-1 text-sm text-slate-700">{selectedRole === "All" ? "Owner" : selectedRole}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ready to release</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatGBP(projectModel.metrics.releasableValue)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Blocked value</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatGBP(projectModel.metrics.blockedValue)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next action</div>
                  <div className="mt-1 text-sm text-slate-700">{nextAction?.title ?? "Nothing needed right now"}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
