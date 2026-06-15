"use client";

/**
 * /search — Global search page
 *
 * Debounced search across projects, contracts, and stages.
 * Renders a unified result list with type badges and direct links.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { SearchResult } from "@/app/api/search/route";

const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  project:  "Project",
  contract: "Contract",
  stage:    "Stage",
};

const TYPE_COLORS: Record<SearchResult["type"], string> = {
  project:  "#2563eb",
  contract: "#7c3aed",
  stage:    "#059669",
};

export default function SearchPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed]     = useState(false);
  const [query, setQuery]       = useState(searchParams.get("q") ?? "");
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const role = getRole(user);
      if (!role) { router.push("/auth/login"); return; }
      setAuthed(true);
    });
  }, [router]);

  const runSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json() as { results: SearchResult[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Search failed.");
        setResults([]);
      } else {
        setResults(data.results);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void runSearch(query); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, authed, runSearch]);

  // Update URL without full navigation
  useEffect(() => {
    if (!authed) return;
    const url = query.trim().length >= 2
      ? `/search?q=${encodeURIComponent(query.trim())}`
      : "/search";
    window.history.replaceState({}, "", url);
  }, [query, authed]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Search input */}
          <div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: navy }}>Search</h1>
            <div className="relative">
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, stages, contracts…"
                className="w-full rounded-2xl px-5 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-offset-1"
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  backgroundColor: "#fff",
                  color: navy,
                }}
              />
              {loading && (
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: muted }}
                >
                  Searching…
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl px-5 py-3 text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              {error}
            </div>
          )}

          {/* Results */}
          {!loading && searched && results.length === 0 && !error && (
            <div className="rounded-2xl px-6 py-10 text-center" style={card}>
              <p className="text-sm font-semibold" style={{ color: navy }}>No results found</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>Try a different search term.</p>
            </div>
          )}

          {(["project", "contract", "stage"] as const).map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            return (
              <div key={type}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  {TYPE_LABELS[type]}s ({items.length})
                </p>
                <div className="rounded-[20px] overflow-hidden divide-y" style={{ ...card, borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="flex items-center justify-between px-5 py-4 gap-4 transition hover:bg-neutral-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: TYPE_COLORS[r.type] + "18",
                              color: TYPE_COLORS[r.type],
                              border: `1px solid ${TYPE_COLORS[r.type]}33`,
                            }}
                          >
                            {TYPE_LABELS[r.type]}
                          </span>
                          <p className="text-sm font-semibold truncate" style={{ color: navy }}>{r.title}</p>
                        </div>
                        <p className="text-xs truncate" style={{ color: muted }}>{r.subtitle}</p>
                      </div>
                      <span style={{ color: "rgba(13,17,68,0.25)", flexShrink: 0 }}>›</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty state before search */}
          {!searched && !loading && !query.trim() && (
            <div className="rounded-[20px] px-6 py-10 text-center" style={card}>
              <p className="text-sm font-semibold" style={{ color: navy }}>Start typing to search</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>
                Search across projects, contracts, and payment stages.
              </p>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
