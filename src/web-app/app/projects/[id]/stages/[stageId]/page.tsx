import { Suspense } from "react";

import { StageDetailRouteScreen } from "../../../../components/RoutedMobileScreens";
import VisibleRouteFallback from "../../../../components/prototype/VisibleRouteFallback";

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;

  return (
    <Suspense
      fallback={
        <VisibleRouteFallback
          title="Preparing stage detail"
          detail="Preparing the current funding position and workflow view for this stage."
          actionLabel="Loading the selected package and contract position."
        />
      }
    >
      <StageDetailRouteScreen routeProjectId={id} routeStageId={stageId} />
    </Suspense>
  );
}
