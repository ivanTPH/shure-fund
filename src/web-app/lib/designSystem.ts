export const spacingScale = {
  section: "gap-5",
  card: "gap-3",
  compact: "gap-2",
  panelPadding: "px-4 py-4",
  compactPanelPadding: "px-3 py-3",
  sectionPadding: "px-4 py-5",
} as const;

export const radiusScale = {
  card: "rounded-2xl",
  pill: "rounded-full",
  panel: "rounded-xl",
} as const;

export const borderStyles = {
  muted: "border border-neutral-800",
  strong: "border border-neutral-700",
} as const;

export const shadowStyles = {
  card: "shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
  hover: "hover:shadow-[0_18px_44px_rgba(0,0,0,0.28)]",
  innerCard: "shadow-[0_10px_26px_rgba(0,0,0,0.16)]",
  selected: "shadow-[0_0_0_1px_rgba(59,130,246,0.18)]",
} as const;

export const transitionTimings = {
  fast: "duration-150 ease-out",
  standard: "duration-200 ease-in-out",
  state: "duration-300",
} as const;

export const typographyScale = {
  pageTitle: "text-[1.75rem] font-black tracking-tight text-neutral-50",
  sectionTitle: "text-lg font-semibold text-neutral-100",
  cardTitle: "text-sm font-semibold text-neutral-100",
  primaryMetric: "text-3xl font-black tracking-tight text-neutral-50",
  heroMetric: "text-4xl font-black tracking-tight text-neutral-50",
  metadata: "text-xs text-neutral-500",
  helper: "text-sm text-neutral-400",
  overline: "text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500",
} as const;

export const statusToneClasses = {
  healthy: "border-green-700 bg-green-950/70 text-green-300",
  "at-risk": "border-amber-700 bg-amber-950/70 text-amber-300",
  blocked: "border-red-700 bg-red-950/70 text-red-300",
  critical: "border-red-700 bg-red-950/30 text-red-200",
  informational: "border-blue-700 bg-blue-950/25 text-blue-200",
  safe: "border-green-800/80 bg-green-950/30 text-green-200",
  attention: "border-amber-800/80 bg-amber-950/25 text-amber-200",
  action: "border-red-800/80 bg-red-950/25 text-red-200",
  info: "border-blue-800/80 bg-blue-950/20 text-blue-200",
} as const;

export const surfacePatterns = {
  shell:
    "rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:border-neutral-700 hover:shadow-[0_18px_44px_rgba(0,0,0,0.28)]",
  interactive:
    "rounded-2xl border border-neutral-800 bg-neutral-950/70 transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-950/90 hover:shadow-[0_20px_45px_rgba(0,0,0,0.24)] active:scale-[0.99]",
  inner: "rounded-2xl border border-neutral-800 bg-neutral-950/60",
  compactCard: "rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
} as const;

export const layoutPatterns = {
  cardBody: "flex flex-col gap-3 px-4 py-4",
  cardHeaderRow: "flex items-start justify-between gap-3",
  cardFooterRow: "flex items-center justify-between gap-3 border-t border-neutral-800 pt-3 text-xs text-neutral-500",
  panelTransition: "overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out motion-reduce:transition-none",
  mainColumn: "mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6",
  topSummary: "mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 sm:px-6",
} as const;

export const buttonPatterns = {
  pill:
    "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 ease-out active:scale-[0.98]",
  subtle:
    "rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 transition-colors duration-150 ease-out hover:bg-neutral-800",
  primary:
    "rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out hover:bg-blue-800 active:scale-[0.98]",
  success:
    "rounded-full border border-green-700 px-3 py-1 text-xs font-semibold text-green-200 transition-colors duration-150 ease-out hover:bg-green-950/40",
} as const;

export const badgePatterns = {
  base: "rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
  neutral: "rounded-full bg-neutral-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300",
} as const;

export const inputPatterns = {
  select: "mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100",
  mobileSelect: "mt-1 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100",
} as const;
