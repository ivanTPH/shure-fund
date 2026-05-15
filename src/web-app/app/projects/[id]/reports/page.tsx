"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type FundingPosition = {
  status: "funded" | "warning" | "gap";
  walletBalance: number;
  totalRequired: number;
  totalReleased: number;
  bufferPct: number;
};

type Stage = { id: string; name: string; value: number; status: string };
type Contract = { id: string; title: string; contractor_name: string; status: string; contract_stages: Stage[] };
type Project = { id: string; name: string; location: string; status: string };

export default function ProjectReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [funding, setFunding] = useState<FundingPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [projRes, contractsRes, fundingRes] = await Promise.all([
          fetch(`/api/projects`),
          fetch(`/api/projects/${projectId}/contracts`),
          fetch(`/api/projects/${projectId}/funding-position`),
        ]);
        const [projData, contractsData, fundingData] = await Promise.all([
          projRes.json(), contractsRes.json(), fundingRes.json(),
        ]);
        const proj = (projData.projects ?? []).find((p: Project) => p.id === projectId) ?? null;
        setProject(proj);
        setContracts(contractsData.contracts ?? []);
        setFunding(fundingData ?? null);
      } catch { /* non-fatal */ } finally { setLoading(false); }
    }
    load();
  }, [projectId]);

  function exportPDF() {
    window.print();
  }

  const allStages = contracts.flatMap((c) =>
    (c.contract_stages ?? []).map((s) => ({ ...s, contractTitle: c.title }))
  );
  const totalValue = allStages.reduce((sum, s) => sum + Number(s.value), 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
      <p className="text-neutral-400">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      {/* Print styles */}
      <style>{`@media print { body { background: white !important; color: black !important; } .no-print { display: none !important; } .print-area { color: black !important; } }`}</style>

      <div className="no-print">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Back to project
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-white">Financial summary</h1>
        <button
          onClick={exportPDF}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Export PDF
        </button>
      </div>

      <div ref={printRef} className="print-area mt-6 max-w-2xl space-y-6">
        {/* Project header */}
        <div className="rounded-[20px] p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Project</p>
          <p className="mt-1 text-xl font-bold text-white">{project?.name ?? "—"}</p>
          <p className="mt-0.5 text-sm text-neutral-400">{project?.location ?? "—"}</p>
          <p className="mt-1 text-xs text-neutral-500">Report generated: {fmt.format(new Date())}</p>
        </div>

        {/* Funding summary */}
        {funding && (
          <div className="rounded-[20px] p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Funding position</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Wallet balance</p>
                <p className="mt-1 text-lg font-bold text-white">{gbp.format(funding.walletBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Total required</p>
                <p className="mt-1 text-lg font-bold text-white">{gbp.format(funding.totalRequired)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Released to date</p>
                <p className="mt-1 text-lg font-bold text-white">{gbp.format(funding.totalReleased)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Buffer</p>
                <p className="mt-1 text-lg font-bold" style={{ color: funding.status === "funded" ? "#34d399" : funding.status === "warning" ? "#fbbf24" : "#f87171" }}>
                  {funding.bufferPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage table */}
        <div className="rounded-[20px] p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Payment stages</p>
            <p className="text-sm font-bold text-white">{gbp.format(totalValue)}</p>
          </div>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{s.name}</p>
                  <p className="text-xs text-neutral-500">{s.contractTitle}</p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end">
                  <p className="text-sm font-semibold text-white">{gbp.format(Number(s.value))}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
