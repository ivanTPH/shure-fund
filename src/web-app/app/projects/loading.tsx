export default function ProjectsLoading() {
  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}
    >
      <div className="mx-auto max-w-4xl animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-7 w-28 rounded-xl bg-neutral-200" />
            <div className="mt-2 h-4 w-44 rounded-lg bg-neutral-100" />
          </div>
          <div className="h-9 w-28 rounded-2xl bg-neutral-200" />
        </div>

        {/* Filter skeleton */}
        <div className="mb-6 flex gap-2">
          {[60, 80, 72, 68, 76].map((w, i) => (
            <div key={i} className="h-8 rounded-2xl bg-neutral-200" style={{ width: `${w}px` }} />
          ))}
        </div>

        {/* Card skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] p-5"
              style={{ backgroundColor: "#fff", border: "1px solid #e4e7f0" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/5 rounded-lg bg-neutral-200" />
                  <div className="h-3.5 w-2/5 rounded-lg bg-neutral-100" />
                </div>
                <div className="h-6 w-16 rounded-full bg-neutral-100" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 rounded-xl bg-neutral-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
