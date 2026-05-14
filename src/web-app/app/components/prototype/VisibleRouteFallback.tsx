export default function VisibleRouteFallback({
  title,
  detail,
  actionLabel,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
}) {
  return (
    <div className="mobile-app-viewport text-white">
      <main className="mobile-app-frame flex flex-col justify-center">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-6 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-aqua)]">Shure.Fund workflow</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-3 max-w-[28ch] text-sm leading-6 text-neutral-300">{detail}</p>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Status</p>
            <p className="mt-2 text-sm font-medium text-white">{actionLabel ?? "Preparing the mobile workflow experience."}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
