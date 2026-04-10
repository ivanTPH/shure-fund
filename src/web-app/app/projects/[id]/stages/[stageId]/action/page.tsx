import { StageActionRouteScreen } from "../../../../../components/ProjectStageRouteScreens";

export default async function StageActionPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;

  return <StageActionRouteScreen routeProjectId={id} routeStageId={stageId} />;
}
