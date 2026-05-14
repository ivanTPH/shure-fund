import { notFound } from "next/navigation";

import { getActionFeedItem } from "@/lib/actionFeedData";

import ApprovalReviewScreen from "../ApprovalReviewScreen";

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getActionFeedItem(itemId);

  if (!item || item.actionType !== "approval") {
    notFound();
  }

  return <ApprovalReviewScreen item={item} />;
}
