import { StageListRouteScreen } from "../../components/ProjectStageRouteScreens";

export default async function ProjectStagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <StageListRouteScreen routeProjectId={id} />;
}
