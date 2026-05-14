import VariationReviewScreen from "./VariationReviewScreen";

export default async function VariationReviewPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <VariationReviewScreen projectId={id} contractId={contractId} />;
}
