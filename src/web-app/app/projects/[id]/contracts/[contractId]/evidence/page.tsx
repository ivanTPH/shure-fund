import EvidenceApprovalClient from "./EvidenceApprovalClient";

export default async function EvidenceApprovalPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <EvidenceApprovalClient projectId={id} contractId={contractId} />;
}
