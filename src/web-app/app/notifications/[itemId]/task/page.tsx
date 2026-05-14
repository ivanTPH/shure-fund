import { notFound } from "next/navigation";

import { getActionFeedItem } from "@/lib/actionFeedData";

import TaskReviewScreen from "../TaskReviewScreen";

export default async function TaskReviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getActionFeedItem(itemId);

  if (!item || item.actionType !== "task") {
    notFound();
  }

  return <TaskReviewScreen item={item} />;
}
