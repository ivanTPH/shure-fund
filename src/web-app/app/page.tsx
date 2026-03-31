import { Suspense } from "react";

import ShureFundWorkspace from "./components/ShureFundWorkspace";
import WorkspaceRouteFallback from "./components/WorkspaceRouteFallback";

export default function HomePage() {
  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      <ShureFundWorkspace routeView="home" />
    </Suspense>
  );
}
