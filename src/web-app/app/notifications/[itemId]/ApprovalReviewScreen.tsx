import Link from "next/link";

import type { ActionFeedItem } from "@/lib/actionFeedData";
import { getApprovalReleaseRecord } from "@/lib/approvalReleaseData";

import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import EvidenceItemCard from "../../components/prototype/EvidenceItemCard";
import ApprovalContextCard from "../../components/prototype/ApprovalContextCard";
import AuditPreviewList from "../../components/prototype/AuditPreviewList";
import ReviewActionBar from "../../components/prototype/ReviewActionBar";

const approvalPreviewEvidence = [
  {
    id: "approval-preview-1",
    group: "Photos" as const,
    title: "Completion photos - bay 4",
    type: "Photo" as const,
    uploadedBy: "Liam Price",
    role: "Site Manager",
    timestamp: "10 Apr 2026, 08:45",
    status: "Reviewed" as const,
  },
  {
    id: "approval-preview-2",
    group: "Certificates / PDFs" as const,
    title: "Fire treatment certificate",
    type: "Certificate" as const,
    uploadedBy: "Martha Webb",
    role: "Commercial Manager",
    timestamp: "09 Apr 2026, 16:20",
    status: "Reviewed" as const,
  },
];

export default function ApprovalReviewScreen({
  item,
}: {
  item: ActionFeedItem;
}) {
  const record = getApprovalReleaseRecord(item.contractId);
  const approveHref = record?.releaseEligible || record?.approvalStage === "treasury"
    ? `/projects/${item.projectId}/contracts/${item.contractId}/release`
    : `/projects/${item.projectId}/contracts/${item.contractId}/approval-chain`;

  return (
    <MobileShell title="Approval review" subtitle="Review the submitted package, confirm the approved value, and move it to the next approver." backHref="/notifications">
      <ActionCard eyebrow="Approval task" title={item.title} detail={item.projectName}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Package reference</p>
            <p className="mt-1 text-sm font-semibold text-white">{record?.packageReference ?? "Package reference"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-neutral-500">Approved value</p>
            <p className="mt-1 text-sm font-semibold text-white">{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(item.value)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Status explanation</p>
          <p className="mt-2 text-sm font-medium text-white">{record?.explanation ?? item.summary}</p>
        </div>
      </ActionCard>

      {record ? <ApprovalContextCard record={record} /> : null}

      <ActionCard eyebrow="Evidence preview" title="Submitted proof">
        <div className="space-y-3">
          {approvalPreviewEvidence.map((evidence) => (
            <EvidenceItemCard key={evidence.id} item={evidence} />
          ))}
        </div>
        <Link
          href={`/projects/${item.projectId}/contracts/${item.contractId}/evidence`}
          className="mt-4 block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          View full evidence
        </Link>
      </ActionCard>

      <ActionCard eyebrow="Timeline" title="Audit preview">
        <AuditPreviewList events={record?.audit ?? []} />
      </ActionCard>

      <ReviewActionBar
        primary={
          <Link
            href={approveHref}
            className="block rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e]"
          >
            Approve
          </Link>
        }
        secondary={
          <Link
            href={`/projects/${item.projectId}/contracts/${item.contractId}?source=action-feed&task=${item.id}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Return for amendment
          </Link>
        }
        tertiary={
          <Link
            href={`/projects/${item.projectId}/contracts/${item.contractId}?source=action-feed&task=${item.id}`}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Request clarification
          </Link>
        }
      />

      <Link
        href={`/projects/${item.projectId}/contracts/${item.contractId}/approval-chain`}
        className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm font-semibold text-neutral-100"
      >
        View approval chain
      </Link>
    </MobileShell>
  );
}
