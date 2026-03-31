import { Suspense } from "react";

import ShureFundWorkspace from "../components/ShureFundWorkspace";
import WorkspaceRouteFallback from "../components/WorkspaceRouteFallback";

export default function ContractsPage() {
  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      <ShureFundWorkspace routeView="contracts" />
    </Suspense>
  );
}
