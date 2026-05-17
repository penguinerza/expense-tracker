import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addWeeks, subWeeks } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";
import { colors } from "../lib/theme";
import { api, WeeklyView, Tag } from "../api/client";

function fmt(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function TagFilter({ tags, selected, onToggle }: { tags: Tag[]; selected: Set<number>; onToggle: (id: number) => void }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-5 pb-3">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onToggle(tag.id)}
          className={cn(
            "px-2.5 py-1 rounded-full font-sans text-xs transition-colors",
            selected.has(tag.id)
              ? "bg-accent text-white"
              : "border border-surface-3 text-ink-muted hover:text-ink"
          )}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

function tagParam(selected: Set<number>) {
  return selected.size > 0 ? `&tagIds=${Array.from(selected).join(",")}` : "";
}

export default function Weekly() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags"),
  });

  const { data, isLoading } = useQuery<WeeklyView>({
    queryKey: ["views", "weekly", date, Array.from(selectedTagIds).sort().join(",")],
    queryFn: () => api.get(`/views/weekly?date=${date}${tagParam(selectedTagIds)}`),
  });

  function toggleTag(id: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function prevWeek() {
    setDate(format(subWeeks(parseISO(date), 1), "yyyy-MM-dd"));
  }
  function nextWeek() {
    const next = addWeeks(parseISO(date), 1);
    if (next > new Date()) return;
    setDate(format(next, "yyyy-MM-dd"));
  }

  const isCurrentWeek = () => {
    if (!data) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    return today >= data.from && today <= data.to;
  };

  return (
    <div className="min-h-dvh bg-surface-0 safe-top">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button onClick={prevWeek} aria-label="Previous week" className="text-ink-muted hover:text-ink transition-colors p-1 -ml-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl text-ink text-balance">
            {data
              ? `${format(parseISO(data.from), "MMM d")} – ${format(parseISO(data.to), "MMM d, yyyy")}`
              : "—"}
          </h2>
        </div>
        <button onClick={nextWeek} disabled={isCurrentWeek()} aria-label="Next week" className="text-ink-muted hover:text-ink transition-colors p-1 -mr-1 disabled:opacity-25">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <TagFilter tags={allTags} selected={selectedTagIds} onToggle={toggleTag} />

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="size-5 border border-ink-muted border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </div>
      )}

      {data && (
        <div className="px-5 space-y-5">
          <div className="pt-2">
            <p className="font-sans text-xs text-ink-muted uppercase tracking-widest">Week Total</p>
            <p className="font-mono text-5xl text-ink tabular-nums mt-1">{fmt(data.total)}</p>
          </div>

          <div className="border border-surface-3 rounded-xl p-4 bg-surface-1">
            <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-4">Daily Spending</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={data.dailyTotals} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), "EEE")}
                  tick={{ fill: colors.inkMuted, fontSize: 10, fontFamily: "DM Sans" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [fmt(v), ""]}
                  labelFormatter={(d) => format(parseISO(d as string), "EEE, MMM d")}
                  contentStyle={{ background: colors.surface0, border: `1px solid ${colors.surface3}`, borderRadius: 8, fontFamily: "DM Sans" }}
                  labelStyle={{ color: colors.inkMuted, fontSize: 11 }}
                  itemStyle={{ color: colors.ink, fontFamily: "IBM Plex Mono", fontSize: 13 }}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {data.dailyTotals.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={data.payday === entry.date ? colors.amber : entry.amount > 0 ? colors.accent : colors.surface3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data.categories.length > 0 ? (
            <div>
              <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-3">By Category</p>
              <div className="space-y-3">
                {[...data.categories]
                  .sort((a, b) => b.total - a.total)
                  .map((cat) => {
                    const pct = data.total > 0 ? (cat.total / data.total) * 100 : 0;
                    return (
                      <div key={cat.categoryId}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="font-sans text-sm text-ink">{cat.categoryName}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-ink-muted tabular-nums">{pct.toFixed(0)}%</span>
                            <span className="font-mono text-sm text-ink tabular-nums">{fmt(cat.total)}</span>
                          </div>
                        </div>
                        <div className="h-px bg-surface-3 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="font-sans text-ink-muted text-sm">Nothing logged this week.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
