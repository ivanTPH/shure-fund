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
}: {
  fundingSummary: FundingSummary;
  depositAmount: string;
  fundingSource: FundingSourceType;
  selectedWorkPackageName: string;
  onDepositAmountChange: (value: string) => void;
  onFundingSourceChange: (value: FundingSourceType) => void;
  onAddFunds: () => void;
  canAddFunds: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Ledger Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drawdown visibility for Ringfenced Funds, allocation, reserve, and payable value.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total Balance</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.totalBalance)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Allocated Funds</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.allocatedFunds)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Reserve / Contingency</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.reserveBuffer)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Ringfenced Funds</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.ringfencedFunds)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Releasable Funds</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.releasableFunds)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Shortfall</p>
          <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.gapToRequiredCover)}</p>
        </div>
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
            onChange={(event) => onFundingSourceChange(event.target.value as FundingSourceType)}
            aria-label="Funding source"
          >
            <option value="funder">funder</option>
            <option value="contractor">contractor</option>
          </select>
          <button
            type="button"
            onClick={onAddFunds}
            disabled={!canAddFunds}
            className="min-h-12 rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add Funds
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Treasury only. Contractor contributions are restricted to the selected Work Package: {selectedWorkPackageName}.
        </p>
      </div>
    </section>
  );
}
