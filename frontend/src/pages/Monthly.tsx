import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";
import { colors, pieColor } from "../lib/theme";
import { api, MonthlyView, CategoryBreakdown, Tag } from "../api/client";

function fmt(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function CategoryRow({ cat, total }: { cat: CategoryBreakdown; total: number }) {
  const [open, setOpen] = useState(false);
  const pct = total > 0 ? (cat.total / total) * 100 : 0;

  return (
    <div className="border-b border-surface-3 last:border-0">
      <button
        className="w-full flex items-center gap-3 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${cat.categoryName} ${fmt(cat.total)}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={cn("size-3.5 text-ink-muted shrink-0 transition-transform", open && "rotate-90")}
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="flex-1 font-sans text-sm text-ink">{cat.categoryName}</span>
        <span className="font-mono text-xs text-ink-muted tabular-nums">{pct.toFixed(0)}%</span>
        <span className="font-mono text-sm text-ink tabular-nums">{fmt(cat.total)}</span>
      </button>

      {open && (
        <div className="pb-3 pl-7 space-y-1">
          {cat.subcategories
            .sort((a, b) => b.total - a.total)
            .map((sub) => (
              <details key={sub.subcategoryId} className="group">
                <summary className="flex justify-between py-2 cursor-pointer list-none">
                  <span className="font-sans text-sm text-ink-muted">{sub.subcategoryName}</span>
                  <span className="font-mono text-xs text-ink-muted tabular-nums">{fmt(sub.total)}</span>
                </summary>
                <div className="pl-3 pb-1 space-y-1.5">
                  {sub.expenses
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((exp) => (
                      <div key={exp.id} className="flex justify-between text-xs">
                        <span className="font-sans text-ink-faint text-pretty">
                          {format(parseISO(exp.date), "MMM d")}
                          {exp.note ? <span className="ml-1.5">— {exp.note}</span> : null}
                        </span>
                        <span className="font-mono text-ink-muted tabular-nums ml-3">{fmt(exp.amount)}</span>
                      </div>
                    ))}
                </div>
              </details>
            ))}
        </div>
      )}
    </div>
  );
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

export default function Monthly() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags"),
  });

  const { data, isLoading } = useQuery<MonthlyView>({
    queryKey: ["views", "monthly", year, month, Array.from(selectedTagIds).sort().join(",")],
    queryFn: () => api.get(`/views/monthly?year=${year}&month=${month}${tagParam(selectedTagIds)}`),
  });

  function toggleTag(id: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function prev() {
    const d = subMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }
  function next() {
    const d = addMonths(new Date(year, month - 1), 1);
    if (d > now) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const pieData = data?.categories
    .sort((a, b) => b.total - a.total)
    .map((c, i) => ({ name: c.categoryName, value: c.total, color: pieColor(i) })) ?? [];

  return (
    <div className="min-h-dvh bg-surface-0 safe-top">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button onClick={prev} aria-label="Previous month" className="text-ink-muted hover:text-ink transition-colors p-1 -ml-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl text-ink text-balance">
            {format(new Date(year, month - 1), "MMMM yyyy")}
          </h2>
        </div>
        <button onClick={next} disabled={isCurrentMonth} aria-label="Next month" className="text-ink-muted hover:text-ink transition-colors p-1 -mr-1 disabled:opacity-25">
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
        <div className="px-5 space-y-6">
          {pieData.length > 0 ? (
            <div className="border border-surface-3 rounded-xl bg-surface-1 p-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={46} innerRadius={28} strokeWidth={0}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [fmt(v), ""]}
                        contentStyle={{ background: colors.surface0, border: `1px solid ${colors.surface3}`, borderRadius: 8, fontFamily: "DM Sans" }}
                        itemStyle={{ color: colors.ink, fontFamily: "IBM Plex Mono", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest">Month Total</p>
                  <p className="font-mono text-3xl text-ink tabular-nums mt-1">{fmt(data.total)}</p>
                  <div className="mt-3 space-y-1">
                    {pieData.slice(0, 3).map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="font-sans text-xs text-ink-muted truncate">{d.name}</span>
                      </div>
                    ))}
                    {pieData.length > 3 && (
                      <p className="font-sans text-xs text-ink-faint">+{pieData.length - 3} more</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest">Month Total</p>
              <p className="font-mono text-5xl text-ink tabular-nums mt-1">{fmt(0)}</p>
            </div>
          )}

          {data.categories.length > 0 ? (
            <div>
              <p className="font-sans text-2xs text-ink-muted uppercase tracking-widest mb-1">Breakdown</p>
              <div className="-mx-5 px-5">
                {[...data.categories]
                  .sort((a, b) => b.total - a.total)
                  .map((cat) => (
                    <CategoryRow key={cat.categoryId} cat={cat} total={data.total} />
                  ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="font-sans text-ink-muted text-sm">Nothing logged this month.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
