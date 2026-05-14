"use client";

import SearchOutlined from "@mui/icons-material/SearchOutlined";

const scopes = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "disputes", label: "Disputes" },
] as const;

export type NotificationFilterId = (typeof scopes)[number]["id"];
export type FilterScope<T extends string = string> = { id: T; label: string };

export default function NotificationFilters<T extends string = NotificationFilterId>({
  selected,
  query,
  counts,
  scopes: filterScopes,
  title,
  accent = "neutral",
  placeholder = "Search actions, jobs, sites, dates",
  onQueryChange,
  onSelect,
}: {
  selected: T;
  query: string;
  counts: Record<T, number>;
  scopes?: readonly FilterScope<T>[];
  title?: string;
  accent?: "neutral" | "blue" | "green" | "purple";
  placeholder?: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: T) => void;
}) {
  const visibleScopes = (filterScopes ?? scopes) as readonly FilterScope<T>[];
  const accentClass = getAccentClass(accent);

  return (
    <div className="sticky top-0 z-20 -mx-5 border-b border-[#E6E8EC] bg-[#F7F8FA]/95 px-5 py-3 backdrop-blur">
      {title ? (
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accentClass.dot}`} />
          <h1 className="text-sm font-semibold leading-5 text-[#0B0F1A]">{title}</h1>
        </div>
      ) : null}
      <div className="rounded-2xl border border-[#D7DBE2] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <SearchOutlined style={{ fontSize: 18, color: "#667085" }} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-[#0B0F1A] outline-none placeholder:text-[#98A2B3]"
          />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full rounded-2xl border border-[#D7DBE2] bg-white p-1">
          {visibleScopes.map((scope) => {
            const active = scope.id === selected;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => onSelect(scope.id)}
                className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? `${accentClass.active} shadow-[0_1px_2px_rgba(16,35,69,0.08)]`
                    : "text-[#4B5565] hover:bg-[#F8FAFC]"
                }`}
              >
                <span>{scope.label}</span>
                <span className={`ml-1.5 text-[11px] ${active ? accentClass.count : "text-[#98A2B3]"}`}>{counts[scope.id]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getAccentClass(accent: "neutral" | "blue" | "green" | "purple") {
  if (accent === "blue") return { active: "bg-[#EAF0FF] text-[#102345]", count: "text-[#315276]", dot: "bg-[#5B7FD8]" };
  if (accent === "green") return { active: "bg-[#EAF8EE] text-[#0F3D2E]", count: "text-[#047857]", dot: "bg-[#10B981]" };
  if (accent === "purple") return { active: "bg-[#F1EDFF] text-[#2F275F]", count: "text-[#6D5BD0]", dot: "bg-[#8B7CF6]" };
  return { active: "bg-[#EEF2F6] text-[#102345]", count: "text-[#4B5565]", dot: "bg-[#667085]" };
}
