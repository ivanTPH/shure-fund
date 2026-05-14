import DisputeDetailScreen from "./DisputeDetailScreen";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <DisputeDetailScreen projectId={id} contractId={contractId} />;
}
