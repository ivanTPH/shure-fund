import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import InboxClient from "./InboxClient";

export default async function InboxPage() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/inbox");

  const service = createServiceClient();
  const { data } = await service
    .from("notifications")
    .select(`
      id, type, required_action, message,
      entity_type, entity_name, action_url,
      read, created_at,
      project_id, stage_id, contract_id
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <InboxClient notifications={data ?? []} />;
}
