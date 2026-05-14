import type { ReactNode } from "react";

export default function StickyContractCTA({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="sticky bottom-24 z-20">{children}</div>;
}
