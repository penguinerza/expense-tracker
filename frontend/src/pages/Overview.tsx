import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { cn } from "../lib/utils";
import { colors, pieColor } from "../lib/theme";
import { api, MonthlyView, WeeklyView, CategoryBreakdown } from "../api/client";

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

function WeekView() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery<WeeklyView>({
    queryKey: ["views", "weekly", date],
    queryFn: () => api.get(`/views/weekly?date=${date}`),
  });

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
    <>
      <div className="flex items-center justify-between px-5 pb-4">
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
              <a href="/log" className="mt-2 inline-block font-sans text-accent text-sm">Log an expense →</a>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function MonthView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery<MonthlyView>({
    queryKey: ["views", "monthly", year, month],
    queryFn: () => api.get(`/views/monthly?year=${year}&month=${month}`),
  });

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
    <>
      <div className="flex items-center justify-between px-5 pb-4">
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
              <a href="/log" className="mt-2 inline-block font-sans text-accent text-sm">Log an expense →</a>
            </div>
          )}
        </div>
      )}
    </>
  );
}

type ViewMode = "week" | "month";

export default function Overview() {
  const [view, setView] = useState<ViewMode>("week");

  return (
    <div className="min-h-dvh bg-surface-0 safe-top">
      <div className="px-5 pt-5 pb-3">
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-surface-2 p-0.5 gap-0.5">
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-5 py-1.5 rounded-md font-sans text-xs font-medium tracking-wide uppercase transition-colors",
                view === "week" ? "bg-surface-0 text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-5 py-1.5 rounded-md font-sans text-xs font-medium tracking-wide uppercase transition-colors",
                view === "month" ? "bg-surface-0 text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {view === "week" ? <WeekView /> : <MonthView />}
    </div>
  );
}
