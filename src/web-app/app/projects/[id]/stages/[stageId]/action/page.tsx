import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import UploadEvidenceClient from "./UploadEvidenceClient";

export default async function StageActionPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id: projectId, stageId } = await params;

  // Auth — redirect if not signed in
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirectTo=/projects/${projectId}/stages/${stageId}/action`);
  }

  // Fetch stage name for the header (best-effort; component still renders without it)
  const service = createServiceClient();
  const { data: stage } = await service
    .from("contract_stages")
    .select("name")
    .eq("id", stageId)
    .single();

  return (
    <UploadEvidenceClient
      projectId={projectId}
      stageId={stageId}
      stageName={stage?.name ?? undefined}
    />
  );
}
