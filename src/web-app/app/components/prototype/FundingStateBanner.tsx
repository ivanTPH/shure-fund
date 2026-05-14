export default function FundingStateBanner({
  title,
  detail,
  tone = "neutral",
}: {
  title: string;
  detail: string;
  tone?: "positive" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "border-teal-400/25 bg-teal-500/10 text-teal-50"
      : tone === "warning"
        ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
        : "border-white/10 bg-white/5 text-neutral-100";

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 opacity-90">{detail}</p>
    </div>
  );
}
