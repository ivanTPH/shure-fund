import ApprovalChainScreen from "./ApprovalChainScreen";

export default async function ApprovalChainPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <ApprovalChainScreen projectId={id} contractId={contractId} />;
}
