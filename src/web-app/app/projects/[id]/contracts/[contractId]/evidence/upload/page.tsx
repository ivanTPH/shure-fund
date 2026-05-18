import { redirect } from "next/navigation";
export default async function EvidenceUploadPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  redirect(`/projects/${id}/contracts/${contractId}`);
}
