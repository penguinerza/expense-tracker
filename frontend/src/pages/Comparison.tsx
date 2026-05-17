import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";
import { colors } from "../lib/theme";
import { api, MonthComparisonView, WeeksView, Tag } from "../api/client";

function fmt(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function tagParam(selected: Set<number>) {
  return selected.size > 0 ? `&tagIds=${Array.from(selected).join(",")}` : "";
}

export default function Comparison() {
  const now = new Date();
  const [mode, setMode] = useState<"months" | "weeks">("months");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags"),
  });

  function toggleTag(id: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tagKey = Array.from(selectedTagIds).sort().join(",");

  const [m1Year, setM1Year] = useState(now.getFullYear());
  const [m1Month, setM1Month] = useState(now.getMonth() + 1);
  const prev = subMonths(new Date(m1Year, m1Month - 1), 1);
  const [m2Year, setM2Year] = useState(prev.getFullYear());
  const [m2Month, setM2Month] = useState(prev.getMonth() + 1);

  const [wYear, setWYear] = useState(now.getFullYear());
  const [wMonth, setWMonth] = useState(now.getMonth() + 1);

  const monthQuery = useQuery<MonthComparisonView>({
    queryKey: ["views", "comparison", "months", m1Year, m1Month, m2Year, m2Month, tagKey],
    queryFn: () =>
      api.get(`/views/comparison/months?year1=${m1Year}&month1=${m1Month}&year2=${m2Year}&month2=${m2Month}${tagParam(selectedTagIds)}`),
    enabled: mode === "months",
  });

  const weekQuery = useQuery<WeeksView>({
    queryKey: ["views", "comparison", "weeks", wYear, wMonth, tagKey],
    queryFn: () => api.get(`/views/comparison/weeks?year=${wYear}&month=${wMonth}${tagParam(selectedTagIds)}`),
    enabled: mode === "weeks",
  });

  const TOOLTIP_STYLE = {
    contentStyle: { background: colors.surface0, border: `1px solid ${colors.surface3}`, borderRadius: 8, fontFamily: "DM Sans" },
    labelStyle: { color: colors.inkMuted, fontSize: 11 },
    itemStyle: { color: colors.ink, fontFamily: "IBM Plex Mono", fontSize: 12 },
    cursor: { fill: "rgba(0,0,0,0.03)" },
  };

  return (
    <div className="min-h-dvh bg-surface-0 safe-top">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="font-display text-2xl text-ink text-balance">Compare</h1>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "px-2.5 py-1 rounded-full font-sans text-xs transition-colors",
                selectedTagIds.has(tag.id)
                  ? "bg-accent text-white"
                  : "border border-surface-3 text-ink-muted hover:text-ink"
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="px-5 mb-6">
        <div className="flex border border-surface-3 rounded-lg p-0.5">
          <button
            onClick={() => setMode("months")}
            className={cn(
              "flex-1 py-2 rounded text-sm font-sans font-medium transition-colors",
              mode === "months" ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            Month vs Month
          </button>
          <button
            onClick={() => setMode("weeks")}
            className={cn(
              "flex-1 py-2 rounded text-sm font-sans font-medium transition-colors",
              mode === "weeks" ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            Weeks in Month
          </button>
        </div>
      </div>

      {/* Month comparison */}
      {mode === "months" && (
        <div className="px-5 space-y-5">
          {/* Period pickers */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Period 1", year: m1Year, month: m1Month, setYear: setM1Year, setMonth: setM1Month },
              { label: "Period 2", year: m2Year, month: m2Month, setYear: setM2Year, setMonth: setM2Month },
            ].map((p) => (
              <div key={p.label} className="border border-surface-3 rounded-lg p-3 bg-surface-1">
                <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-2">{p.label}</p>
                <select
                  value={`${p.year}-${p.month}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    p.setYear(y);
                    p.setMonth(m);
                  }}
                  className="w-full bg-transparent text-ink font-sans text-sm focus:outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const d = subMonths(now, i);
                    return (
                      <option key={i} value={`${d.getFullYear()}-${d.getMonth() + 1}`} style={{ background: colors.surface0 }}>
                        {format(d, "MMM yyyy")}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>

          {monthQuery.isLoading && (
            <div className="flex justify-center py-12">
              <div className="size-5 border border-ink-muted border-t-transparent rounded-full animate-spin" aria-label="Loading" />
            </div>
          )}

          {monthQuery.data && (
            <>
              {/* Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-surface-3 rounded-lg p-3 bg-surface-1">
                  <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest">
                    {format(new Date(m1Year, m1Month - 1), "MMM yyyy")}
                  </p>
                  <p className="font-mono text-2xl text-accent tabular-nums mt-1">
                    {fmt(monthQuery.data.period1.total)}
                  </p>
                </div>
                <div className="border border-surface-3 rounded-lg p-3 bg-surface-1">
                  <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest">
                    {format(new Date(m2Year, m2Month - 1), "MMM yyyy")}
                  </p>
                  <p className="font-mono text-2xl text-ink-muted tabular-nums mt-1">
                    {fmt(monthQuery.data.period2.total)}
                  </p>
                </div>
              </div>

              {/* Category comparison chart */}
              {(() => {
                const allCats = new Map<string, { p1: number; p2: number }>();
                for (const c of monthQuery.data.period1.categories) {
                  allCats.set(c.categoryName, { p1: c.total, p2: 0 });
                }
                for (const c of monthQuery.data.period2.categories) {
                  const existing = allCats.get(c.categoryName);
                  if (existing) existing.p2 = c.total;
                  else allCats.set(c.categoryName, { p1: 0, p2: c.total });
                }
                const chartData = Array.from(allCats.entries())
                  .map(([name, v]) => ({ name, p1: v.p1, p2: v.p2 }))
                  .sort((a, b) => b.p1 + b.p2 - (a.p1 + a.p2));

                return (
                  <div className="border border-surface-3 rounded-xl bg-surface-1 p-4">
                    <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-4">By Category</p>
                    <div className="flex gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-accent" />
                        <span className="font-sans text-2xs text-ink-muted">{format(new Date(m1Year, m1Month - 1), "MMM")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-surface-3" />
                        <span className="font-sans text-2xs text-ink-muted">{format(new Date(m2Year, m2Month - 1), "MMM")}</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 40)}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: colors.inkMuted, fontSize: 11, fontFamily: "DM Sans" }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip
                          formatter={(v: number) => [fmt(v), ""]}
                          {...TOOLTIP_STYLE}
                        />
                        <Bar dataKey="p1" fill={colors.accent} radius={[0, 3, 3, 0]} barSize={8} />
                        <Bar dataKey="p2" fill={colors.inkFaint} radius={[0, 3, 3, 0]} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Weeks in month */}
      {mode === "weeks" && (
        <div className="px-5 space-y-5">
          <div className="border border-surface-3 rounded-lg bg-surface-1 px-3 py-2">
            <select
              value={`${wYear}-${wMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setWYear(y);
                setWMonth(m);
              }}
              className="w-full bg-transparent text-ink font-sans text-sm focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const d = subMonths(now, i);
                return (
                  <option key={i} value={`${d.getFullYear()}-${d.getMonth() + 1}`} style={{ background: colors.surface0 }}>
                    {format(d, "MMMM yyyy")}
                  </option>
                );
              })}
            </select>
          </div>

          {weekQuery.isLoading && (
            <div className="flex justify-center py-12">
              <div className="size-5 border border-ink-muted border-t-transparent rounded-full animate-spin" aria-label="Loading" />
            </div>
          )}

          {weekQuery.data && (
            <>
<div className="border border-surface-3 rounded-xl bg-surface-1 p-4">
                <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-4">Week Totals</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weekQuery.data.weeks} barCategoryGap="35%">
                    <XAxis
                      dataKey="weekNum"
                      tickFormatter={(n) => `W${n}`}
                      tick={{ fill: colors.inkMuted, fontSize: 10, fontFamily: "DM Sans" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [fmt(v), ""]}
                      labelFormatter={(n) => {
                        const w = weekQuery.data!.weeks.find((x) => x.weekNum === n);
                        return w ? `${w.from} – ${w.to}` : `Week ${n}`;
                      }}
                      {...TOOLTIP_STYLE}
                    />
                    <Bar dataKey="total" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {weekQuery.data.weeks.map((w) => (
                  <div key={w.weekNum} className="border border-surface-3 rounded-xl bg-surface-1 px-4 py-3">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="font-sans text-sm font-medium text-ink">Week {w.weekNum}</span>
                      <span className="font-mono text-sm text-ink tabular-nums">{fmt(w.total)}</span>
                    </div>
                    <p className="font-mono text-2xs text-ink-muted tabular-nums mb-2">{w.from} – {w.to}</p>
                    <div className="space-y-1">
                      {w.categories
                        .sort((a, b) => b.total - a.total)
                        .map((cat) => (
                          <div key={cat.categoryId} className="flex justify-between">
                            <span className="font-sans text-xs text-ink-muted">{cat.categoryName}</span>
                            <span className="font-mono text-xs text-ink-muted tabular-nums">{fmt(cat.total)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
