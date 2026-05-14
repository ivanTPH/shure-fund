import ProjectSummaryClient from "./ProjectSummaryClient";

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSummaryClient projectId={id} />;
}
