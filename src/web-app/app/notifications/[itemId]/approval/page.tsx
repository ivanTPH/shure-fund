import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export default async function ApprovalDeepLinkPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const { data: n } = await service
    .from("notifications")
    .select("action_url, project_id, stage_id, entity_type, entity_id, type")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (!n) redirect("/inbox");

  await service
    .from("notifications")
    .update({ read: true })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (n.action_url) redirect(n.action_url);

  const pid = n.project_id;
  const sid = n.stage_id;
  const eid = n.entity_id;

  if (pid && sid) {
    if (n.type === "approval_required")                    redirect(`/projects/${pid}/stages/${sid}/approve`);
    if (n.type === "payment_ready")                        redirect(`/projects/${pid}/stages/${sid}/release`);
    if (n.type === "evidence_required")                    redirect(`/projects/${pid}/stages/${sid}/action`);
    if (n.type === "dispute_raised" && eid)                redirect(`/projects/${pid}/stages/${sid}/disputes/${eid}`);
    if ((n.type === "variation_submitted") && eid)         redirect(`/projects/${pid}/stages/${sid}/variations/${eid}`);
    redirect(`/projects/${pid}`);
  }

  if (pid) redirect(`/projects/${pid}`);
  redirect("/inbox");
}
