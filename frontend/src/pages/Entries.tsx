import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { api, Expense, MonthlyView } from "../api/client";
import { cn } from "../lib/utils";

function fmt(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function groupByDate(list: Expense[]): { date: string; items: Expense[] }[] {
  const map = new Map<string, Expense[]>();
  for (const e of list) {
    const g = map.get(e.date) ?? [];
    g.push(e);
    map.set(e.date, g);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default function Entries() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const from = format(month, "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  const isCurrentMonth = format(month, "yyyy-MM") === format(new Date(), "yyyy-MM");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", from, to],
    queryFn: () => api.get(`/expenses?from=${from}&to=${to}`),
  });

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: monthlyView } = useQuery<MonthlyView>({
    queryKey: ["views", "monthly", year, monthNum],
    queryFn: () => api.get(`/views/monthly?year=${year}&month=${monthNum}`),
  });
  const payday = monthlyView?.payday ?? null;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["views"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  function handleDeleteTap(id: number) {
    if (pendingDelete === id) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingDelete(null);
      deleteMutation.mutate(id);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingDelete(id);
      timerRef.current = setTimeout(() => setPendingDelete(null), 2500);
    }
  }

  const groups = groupByDate(expenses);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-dvh bg-surface-0 safe-top">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          aria-label="Previous month"
          className="text-ink-muted hover:text-ink transition-colors p-1 -ml-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="font-display text-xl text-ink">{format(month, "MMMM yyyy")}</h1>
          {!isLoading && expenses.length > 0 && (
            <p className="font-mono text-xs text-ink-muted tabular-nums mt-0.5">
              {fmt(total)} · {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
            </p>
          )}
        </div>

        <button
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="text-ink-muted hover:text-ink transition-colors p-1 -mr-1 disabled:opacity-25"
        >
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

      {!isLoading && groups.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-sans text-ink-muted text-sm">No expenses for {format(month, "MMMM yyyy")}.</p>
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <div className="pb-8">
          {groups.map(({ date, items }) => (
            <div key={date}>
              {/* Date group header — editorial rule with display font */}
              <div className="flex items-center gap-3 px-5 pt-6 pb-1">
                <span className={cn("font-display text-sm shrink-0", date === payday ? "text-amber" : "text-ink-muted")}>
                  {format(parseISO(date), "EEE, MMM d")}
                </span>
                <div className="flex-1 h-px bg-surface-2" />
                <span className="font-mono text-2xs text-ink-faint tabular-nums shrink-0">
                  {fmt(items.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>

              {/* Entries — edge-to-edge rows */}
              <div>
                {items.map((expense, i) => {
                  const isPending = pendingDelete === expense.id;
                  return (
                    <div
                      key={expense.id}
                      className={cn(
                        "relative flex items-center gap-4 px-5 py-3.5 transition-colors",
                        i < items.length - 1 && "border-b border-surface-2",
                        isPending ? "bg-accent-dim" : "active:bg-surface-1"
                      )}
                    >
                      {isPending && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-[15px] font-medium text-ink leading-snug truncate">
                          {expense.categoryName}
                        </p>
                        <p className="font-sans text-xs text-ink-muted mt-0.5 truncate">
                          {expense.subcategoryName}
                          {expense.note && (
                            <span className="text-ink-faint"> — {expense.note}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-base text-ink tabular-nums">
                          {fmt(expense.amount)}
                        </span>

                        <button
                          onClick={() => handleDeleteTap(expense.id)}
                          aria-label={isPending ? "Confirm delete" : "Delete expense"}
                          disabled={deleteMutation.isPending}
                          className={cn(
                            "shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40",
                            isPending
                              ? "text-accent bg-accent/10"
                              : "text-ink-faint hover:text-ink-muted"
                          )}
                        >
                          {isPending ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
