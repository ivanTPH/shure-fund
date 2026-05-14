export default function ChecklistItem({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-sm text-white">{label}</p>
      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${done ? "bg-teal-500/15 text-teal-50" : "bg-white/8 text-neutral-300"}`}>
        {done ? "Submitted" : "Missing"}
      </span>
    </div>
  );
}
