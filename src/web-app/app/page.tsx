import { Suspense } from "react";

import VisibleRouteFallback from "./components/prototype/VisibleRouteFallback";
import ProjectsListScreen from "./projects/ProjectsListScreen";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <VisibleRouteFallback
          title="Preparing your action feed"
          detail="Loading the live contracts and project actions that need attention now."
          actionLabel="Building the workflow queue."
        />
      }
    >
      <ProjectsListScreen />
    </Suspense>
  );
}
