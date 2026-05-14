import Link from "next/link";

import type { ActionFeedItem } from "@/lib/actionFeedData";

import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import PrimaryCTA from "../../components/prototype/PrimaryCTA";
import TaskSummaryCard from "../../components/prototype/TaskSummaryCard";

export default function TaskReviewScreen({
  item,
}: {
  item: ActionFeedItem;
}) {
  const primaryHref =
    item.actionLabel === "Upload evidence"
      ? `/projects/${item.projectId}/contracts/${item.contractId}/evidence/upload`
      : `/projects/${item.projectId}/contracts/${item.contractId}?source=action-feed&task=${item.id}`;

  return (
    <MobileShell title="Task review" subtitle="Move this contract task forward with the next required workflow step." backHref="/notifications">
      <TaskSummaryCard
        title={item.title}
        projectName={item.projectName}
        value={item.value}
        status={item.status}
        explanation={item.summary}
      />

      <ActionCard eyebrow="Files" title="Related files" detail="Supporting files for this task will appear here, including package documents and uploaded proof." />
      <ActionCard eyebrow="Timeline" title="Activity preview" detail="Recent workflow events, reviews, and comments will appear here before you move into the full contract." />

      <PrimaryCTA href={primaryHref}>
        {item.actionLabel}
      </PrimaryCTA>

      <Link
        href={`/projects/${item.projectId}/contracts/${item.contractId}?source=action-feed&task=${item.id}`}
        className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white"
      >
        View full contract
      </Link>
    </MobileShell>
  );
}
