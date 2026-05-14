import ContractDetailClient from "./ContractDetailClient";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; contractId: string }>;
  searchParams?: Promise<{ source?: string; task?: string }>;
}) {
  const { id, contractId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <ContractDetailClient projectId={id} contractId={contractId} source={resolvedSearchParams?.source} taskId={resolvedSearchParams?.task} />;
}
