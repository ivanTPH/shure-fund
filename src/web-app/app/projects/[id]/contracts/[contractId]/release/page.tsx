import ReleaseDecisionScreen from "./ReleaseDecisionScreen";

export default async function ReleaseDecisionPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <ReleaseDecisionScreen projectId={id} contractId={contractId} />;
}
