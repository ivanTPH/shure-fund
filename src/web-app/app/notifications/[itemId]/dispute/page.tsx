import { notFound } from "next/navigation";

import { getActionFeedItem } from "@/lib/actionFeedData";

import DisputeReviewScreen from "../DisputeReviewScreen";

export default async function DisputeReviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getActionFeedItem(itemId);

  if (!item || item.actionType !== "dispute") {
    notFound();
  }

  return <DisputeReviewScreen item={item} />;
}
