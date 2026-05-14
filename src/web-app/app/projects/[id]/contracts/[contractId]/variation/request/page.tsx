import VariationRequestScreen from "./VariationRequestScreen";

export default async function VariationRequestPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <VariationRequestScreen projectId={id} contractId={contractId} />;
}
