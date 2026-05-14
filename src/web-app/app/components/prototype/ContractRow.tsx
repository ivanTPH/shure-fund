import Link from "next/link";

import type { ContractRecord } from "@/lib/prototypeData";

import StatusBadge from "./StatusBadge";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ContractRow({
  projectId,
  contract,
}: {
  projectId: string;
  contract: ContractRecord;
}) {
  return (
    <Link
      href={`/projects/${projectId}/contracts/${contract.id}`}
      className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{contract.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm text-neutral-300">{currency(contract.value)}</p>
          <span className="text-neutral-600">·</span>
          <p className="text-sm text-neutral-400">{contract.nextAction}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={contract.status} />
        <span className="text-lg leading-none text-neutral-500">›</span>
      </div>
    </Link>
  );
}
