import { Suspense } from "react";

import ShureFundWorkspace from "../../components/ShureFundWorkspace";
import WorkspaceRouteFallback from "../../components/WorkspaceRouteFallback";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      <ShureFundWorkspace routeView="projects" routeProjectId={id} projectDetailMode />
    </Suspense>
  );
}
