import type { ReactNode } from "react";

export default function ReviewActionBar({
  primary,
  secondary,
  tertiary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>{primary}</div>
      {secondary ? <div>{secondary}</div> : null}
      {tertiary ? <div>{tertiary}</div> : null}
    </div>
  );
}
