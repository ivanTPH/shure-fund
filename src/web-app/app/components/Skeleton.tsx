"use client";

/**
 * Skeleton loading primitives.
 *
 * Usage:
 *   <Skeleton.Line />           — a single shimmer line
 *   <Skeleton.Card>…</Skeleton.Card>  — a card wrapper
 *   <Skeleton.Stage />          — a full stage-detail skeleton
 *   <Skeleton.NotificationList />— inbox skeleton
 */

function shimmer() {
  return {
    background: "linear-gradient(90deg, #f0f2f8 25%, #e4e7f0 50%, #f0f2f8 75%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.4s ease-in-out infinite",
  } as React.CSSProperties;
}

function Line({ width = "100%", height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        ...shimmer(),
        width,
        height,
        borderRadius: 6,
        display: "block",
      }}
    />
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid var(--surface-border, #e4e7f0)",
        borderRadius: 20,
        backgroundColor: "#fff",
        padding: "20px",
      }}
    >
      {children}
    </div>
  );
}

function Stage() {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Line width={60} height={11} />
        <Line width={6} height={11} />
        <Line width={100} height={11} />
        <Line width={6} height={11} />
        <Line width={140} height={11} />
      </div>

      {/* Task banner */}
      <div
        style={{
          ...shimmer(),
          borderRadius: 20,
          height: 80,
        }}
      />

      {/* Stepper */}
      <Card>
        <div className="flex items-center justify-between gap-1 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <Line width={28} height={28} />
              <Line width="80%" height={9} />
            </div>
          ))}
        </div>
      </Card>

      {/* Header card */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Line width={80} height={20} />
          </div>
          <Line width="70%" height={28} />
          <Line height={13} />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Line width="60%" height={10} />
                <Line width="80%" height={16} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Action buttons row */}
      <div className="flex gap-2">
        <Line width={140} height={40} />
        <Line width={120} height={40} />
      </div>

      {/* Evidence section */}
      <div className="space-y-2">
        <Line width={80} height={11} />
        {[1, 2].map((i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <Line width={36} height={36} />
              <div className="flex-1 space-y-1.5">
                <Line width="60%" height={13} />
                <Line width="40%" height={11} />
              </div>
              <Line width={50} height={22} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--surface-border, #e4e7f0)",
            borderRadius: 18,
            backgroundColor: "#fff",
            padding: "16px",
          }}
        >
          <div className="flex items-start gap-3">
            <Line width={36} height={36} />
            <div className="flex-1 space-y-2">
              <Line width="40%" height={11} />
              <Line width="75%" height={14} />
              <Line height={12} />
              <Line width="30%" height={10} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const Skeleton = { Line, Card, Stage, NotificationList };

// Inject keyframe once — safe to call multiple times
if (typeof document !== "undefined") {
  const id = "skeleton-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes skeleton-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
