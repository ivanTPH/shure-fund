import type { ReactNode } from "react";

export default function DecisionActionBar({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>{primary}</div>
      <div>{secondary}</div>
    </div>
  );
}
