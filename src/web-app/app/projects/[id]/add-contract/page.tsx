import AddContractClient from "./AddContractClient";

export default async function AddContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AddContractClient projectId={id} />;
}
