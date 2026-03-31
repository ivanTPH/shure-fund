export default function WorkspaceRouteFallback() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-3xl bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
