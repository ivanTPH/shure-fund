import { StageDetailRouteScreen } from "../../../../components/ProjectStageRouteScreens";

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;

  return <StageDetailRouteScreen routeProjectId={id} routeStageId={stageId} />;
}
