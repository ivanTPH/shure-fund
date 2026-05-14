export default function PermissionRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-sm font-medium text-white">{label}</p>
      <span
        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
          enabled ? "bg-[var(--brand-aqua)]/15 text-[var(--brand-aqua)]" : "bg-white/5 text-neutral-400"
        }`}
      >
        {enabled ? "Allowed" : "Not allowed"}
      </span>
    </div>
  );
}
