import MobileShell from "./MobileShell";
import ActionCard from "./ActionCard";

export default function PrototypePlaceholderScreen({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <MobileShell title={title} subtitle="Placeholder screen for the first mobile workflow prototype.">
      <ActionCard title={title} detail={detail} />
    </MobileShell>
  );
}
