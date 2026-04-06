import type { FundingSourceType } from "@/lib/shureFundModels";
import type { FundingSummary } from "@/lib/systemState";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default function LedgerSummaryCard({
  fundingSummary,
  depositAmount,
  fundingSource,
  selectedWorkPackageName,
  onDepositAmountChange,
  onFundingSourceChange,
  onAddFunds,
  canAddFunds,
  addFundsHelperText,
}: {
  fundingSummary: FundingSummary;
  depositAmount: string;
  fundingSource: FundingSourceType | "";
  selectedWorkPackageName: string;
  onDepositAmountChange: (value: string) => void;
  onFundingSourceChange: (value: FundingSourceType | "") => void;
  onAddFunds: () => void;
  canAddFunds: boolean;
  addFundsHelperText: string;
}) {
  const parsedAmount = Number(depositAmount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const fundingSourceSelected = fundingSource === "funder" || fundingSource === "contractor";
  const addFundsEnabled = canAddFunds && validAmount && fundingSourceSelected;
  const shortfallActive = fundingSummary.shortfall > 0;
  const metricCards = [
    {
      label: "Balance",
      value: fundingSummary.projectBalance,
      helper: "Total cash currently held for the project across project and Work Package accounts.",
      tone: "default",
    },
    {
      label: "Allocated",
      value: fundingSummary.allocatedFunds,
      helper: "Funds already assigned to specific Work Packages.",
      tone: "default",
    },
    {
      label: "Ringfenced",
      value: fundingSummary.ringfencedFunds,
      helper: "Protected funds held for project use after the reserve is set aside.",
      tone: "default",
    },
    {
      label: "Required Cover",
      value: fundingSummary.requiredCover,
      helper: "Projected 30-day work requirement plus the reserve buffer.",
      tone: "default",
    },
    {
      label: "Frozen",
      value: fundingSummary.frozenFunds,
      helper: "Funds held back because the related value is disputed and not releasable.",
      tone: "frozen",
    },
    {
      label: "Releasable",
      value: fundingSummary.releasableFunds,
      helper: "Protected funds currently available for controlled drawdown.",
      tone: "positive",
    },
    {
      label: "Shortfall",
      value: fundingSummary.shortfall,
      helper: shortfallActive
        ? "Additional protected funds are needed to meet required cover."
        : "No funding shortfall is currently recorded.",
      tone: shortfallActive ? "warning" : "default",
    },
  ] as const;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Ledger Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Clear visibility of protected cash, required cover, frozen value, and releasable funds.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-2xl border p-4 ${
              metric.tone === "positive"
                ? "border-teal-200 bg-teal-50"
                : metric.tone === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : metric.tone === "frozen"
                    ? "border-slate-300 bg-slate-100"
                    : "border-slate-200 bg-slate-50"
            }`}
          >
            <p
              className={`text-sm ${
                metric.tone === "positive"
                  ? "text-teal-900"
                  : metric.tone === "warning"
                    ? "text-amber-900"
                    : "text-slate-500"
              }`}
            >
              {metric.label}
            </p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                metric.tone === "positive"
                  ? "text-teal-950"
                  : metric.tone === "warning"
                    ? "text-amber-950"
                    : metric.tone === "frozen"
                      ? "text-slate-900"
                      : "text-slate-950"
              }`}
            >
              {currency.format(metric.value)}
            </p>
            <p
              className={`mt-2 text-xs leading-5 ${
                metric.tone === "positive"
                  ? "text-teal-900"
                  : metric.tone === "warning"
                    ? "text-amber-900"
                    : metric.tone === "frozen"
                      ? "text-slate-700"
                      : "text-slate-500"
              }`}
            >
              {metric.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Add Funds</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
          <input
            inputMode="numeric"
            className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3"
            value={depositAmount}
            onChange={(event) => onDepositAmountChange(event.target.value)}
            aria-label="Add funds amount"
          />
          <select
            className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3"
            value={fundingSource}
            onChange={(event) => onFundingSourceChange(event.target.value as FundingSourceType | "")}
            aria-label="Funding source"
          >
            <option value="">Select source</option>
            <option value="funder">funder</option>
            <option value="contractor">contractor</option>
          </select>
          <button
            type="button"
            onClick={onAddFunds}
            disabled={!addFundsEnabled}
            className="min-h-12 rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add Funds
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {addFundsHelperText} Contractor contributions are restricted to the selected Work Package: {selectedWorkPackageName}.
        </p>
      </div>
    </section>
  );
}
