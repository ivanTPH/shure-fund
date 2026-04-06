import type { LedgerTransactionItem } from "@/lib/systemState";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default function LedgerTransactionsList({
  transactions,
}: {
  transactions: LedgerTransactionItem[];
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Ledger Transactions</h2>
        <p className="mt-1 text-sm text-slate-500">Recent money movements, tagged by source and restricted use.</p>
      </div>
      <div className="grid gap-3">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{transaction.reference}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {transaction.accountName}
                  {transaction.workPackageName ? ` · ${transaction.workPackageName}` : ""}
                </p>
              </div>
              <p className={`text-sm font-semibold ${transaction.amount >= 0 ? "text-teal-800" : "text-slate-900"}`}>
                {currency.format(transaction.amount)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1">{transaction.type.replaceAll("_", " ")}</span>
              {transaction.sourceType ? (
                <span className="rounded-full bg-white px-3 py-1">source: {transaction.sourceType}</span>
              ) : null}
              {transaction.restrictedUse ? (
                <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-900">restricted use</span>
              ) : null}
              <span className="rounded-full bg-white px-3 py-1">
                {new Date(transaction.timestamp).toLocaleString("en-GB")}
              </span>
            </div>
          </article>
        ))}
        {transactions.length === 0 ? <p className="text-sm text-slate-500">No ledger transactions recorded yet.</p> : null}
      </div>
    </section>
  );
}
