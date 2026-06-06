import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("notifications")
    .select("action_url")
    .eq("id", itemId)
    .single();

  redirect(data?.action_url ?? "/inbox");
}
