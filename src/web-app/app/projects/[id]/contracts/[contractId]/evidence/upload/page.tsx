import EvidenceUploadClient from "./EvidenceUploadClient";

export default async function EvidenceUploadPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <EvidenceUploadClient projectId={id} contractId={contractId} />;
}
