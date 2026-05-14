import ReleaseConfirmationScreen from "./ReleaseConfirmationScreen";

export default async function ReleaseConfirmationPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  return <ReleaseConfirmationScreen projectId={id} contractId={contractId} />;
}
