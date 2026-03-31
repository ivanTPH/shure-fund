import { Suspense } from "react";

import ShureFundWorkspace from "../components/ShureFundWorkspace";
import WorkspaceRouteFallback from "../components/WorkspaceRouteFallback";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      <ShureFundWorkspace routeView="payments" />
    </Suspense>
  );
}
