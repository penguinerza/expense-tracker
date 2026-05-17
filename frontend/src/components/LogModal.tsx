import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isAfter, startOfDay,
} from "date-fns";
import { cn } from "../lib/utils";
import { api, Category, Tag } from "../api/client";

// ── Inline calendar ───────────────────────────────────────────────────────────

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function DateCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
}) {
  const today = startOfDay(new Date());
  const selected = parseISO(value);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  const firstDay = startOfMonth(viewMonth);
  const lastDay = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startOffset = getDay(firstDay); // 0 = Sunday
  const canGoNext = !isAfter(startOfMonth(addMonths(viewMonth, 1)), startOfMonth(today));

  return (
    <>
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={onClose}
          aria-label="Cancel date selection"
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm font-sans">Back</span>
        </button>
        <span className="font-display text-base text-ink">Select date</span>
        <div className="w-12" />
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-surface-3">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          aria-label="Previous month"
          className="text-ink-muted hover:text-ink transition-colors p-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-mono text-sm text-ink tabular-nums">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          disabled={!canGoNext}
          aria-label="Next month"
          className="text-ink-muted hover:text-ink transition-colors p-1 disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day grid */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center py-1 text-2xs font-sans text-ink-faint uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            const isFuture = isAfter(day, today);

            return (
              <button
                key={day.toISOString()}
                disabled={isFuture}
                onClick={() => onChange(format(day, "yyyy-MM-dd"))}
                aria-label={format(day, "MMMM d, yyyy")}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex items-center justify-center w-full aspect-square rounded-full font-mono text-sm tabular-nums transition-colors",
                  isSelected
                    ? "bg-accent text-white"
                    : isToday
                    ? "text-accent hover:bg-surface-2"
                    : "text-ink hover:bg-surface-2",
                  isFuture && "opacity-20 cursor-not-allowed"
                )}
              >
                {format(day, "d")}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-0.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

type Step = "amount" | "category" | "subcategory" | "note";

interface FormState {
  amount: string;
  categoryId: number | null;
  subcategoryId: number | null;
  note: string;
  tagIds: number[];
  date: string;
}

const INITIAL: FormState = {
  amount: "",
  categoryId: null,
  subcategoryId: null,
  note: "",
  tagIds: [],
  date: format(new Date(), "yyyy-MM-dd"),
};

const STEPS: Step[] = ["amount", "category", "subcategory", "note"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LogModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("amount");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
    enabled: open,
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags"),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/expenses", {
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        note: form.note || undefined,
        tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
        date: form.date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["views"] });
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    },
  });

  // Animate in/out
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setStep("amount");
        setForm({ ...INITIAL, date: format(new Date(), "yyyy-MM-dd") });
        setSaved(false);
        setCalendarOpen(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedSub = selectedCategory?.subcategories.find((s) => s.id === form.subcategoryId);

  function handleAmountSubmit() {
    const n = parseFloat(form.amount);
    if (isNaN(n) || n <= 0) return;
    setStep("category");
  }

  function handleCategorySelect(id: number) {
    setForm((f) => ({ ...f, categoryId: id, subcategoryId: null }));
    setStep("subcategory");
  }

  function handleSubcategorySelect(id: number) {
    setForm((f) => ({ ...f, subcategoryId: id }));
    setStep("note");
  }

  function goBack() {
    if (step === "category") setStep("amount");
    else if (step === "subcategory") setStep("category");
    else if (step === "note") setStep("subcategory");
  }

  function toggleTag(id: number) {
    setForm((f) =>
      f.tagIds.includes(id)
        ? { ...f, tagIds: f.tagIds.filter((t) => t !== id) }
        : { ...f, tagIds: [...f.tagIds, id] }
    );
  }

  if (!open && !visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center transition-all duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Log expense"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full lg:max-w-md flex flex-col",
          "bg-surface-0 rounded-t-2xl lg:rounded-2xl border-t lg:border border-surface-3",
          "max-h-[90dvh] safe-bottom",
          "transition-transform duration-300 ease-out",
          visible ? "translate-y-0 lg:scale-100" : "translate-y-8 lg:scale-95"
        )}
      >
        {saved ? (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-6">
            <div className="size-14 rounded-full border border-success/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-6 text-success" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl text-ink tabular-nums">
                ¥{parseFloat(form.amount).toLocaleString()}
              </p>
              <p className="text-ink-muted text-sm font-sans mt-1">Recorded</p>
            </div>
          </div>
        ) : calendarOpen ? (
          <DateCalendar
            value={form.date}
            onChange={(d) => {
              setForm((f) => ({ ...f, date: d }));
              setCalendarOpen(false);
            }}
            onClose={() => setCalendarOpen(false)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              {step !== "amount" ? (
                <button
                  onClick={goBack}
                  aria-label="Go back"
                  className="flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span className="text-sm font-sans">Back</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setCalendarOpen(true)}
                aria-label="Change date"
                className="font-mono text-xs text-ink-muted hover:text-ink transition-colors tabular-nums"
              >
                {format(parseISO(form.date), "MMM d, yyyy")}
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-ink-muted hover:text-ink transition-colors -mr-1 p-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-0.5 px-5 mb-1">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-px flex-1 transition-colors",
                    STEPS.indexOf(step) >= i ? "bg-accent" : "bg-surface-3"
                  )}
                />
              ))}
            </div>

            {/* Step: Amount */}
            {step === "amount" && (
              <div className="flex flex-col px-5 pt-6 pb-6 gap-8">
                <div>
                  <h2 className="font-display text-2xl text-ink">Log Expense</h2>
                  <p className="font-sans text-ink-muted text-sm mt-1">Enter the amount spent</p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-end gap-2">
                    <span className="font-mono text-ink-muted text-2xl pb-2" aria-hidden="true">¥</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAmountSubmit()}
                      aria-label="Amount in yen"
                      className="font-mono text-6xl text-ink bg-transparent border-none outline-none w-44 text-right tabular-nums placeholder:text-surface-3"
                    />
                  </div>
                  <div className={cn("h-px w-28 transition-colors", form.amount && parseFloat(form.amount) > 0 ? "bg-accent" : "bg-surface-3")} />
                </div>

                <button
                  onClick={handleAmountSubmit}
                  disabled={!form.amount || parseFloat(form.amount) <= 0}
                  className="w-full py-4 bg-accent hover:bg-accent-bright active:bg-accent-muted disabled:opacity-30 disabled:cursor-not-allowed text-white font-sans font-medium rounded-xl text-[15px] transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step: Category */}
            {step === "category" && (
              <div className="flex flex-col overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  <p className="font-mono text-2xl text-ink tabular-nums">
                    ¥{parseFloat(form.amount).toLocaleString()}
                  </p>
                  <p className="font-display text-lg text-ink-muted mt-0.5">Select category</p>
                </div>
                <div className="overflow-y-auto border-t border-surface-3">
                  {categories.map((cat, i) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 hover:bg-surface-1 active:bg-surface-2 transition-colors text-left",
                        i > 0 && "border-t border-surface-3"
                      )}
                    >
                      <span className="font-sans font-medium text-ink">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-muted tabular-nums">
                          {cat.subcategories.length}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 text-ink-faint" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Subcategory */}
            {step === "subcategory" && selectedCategory && (
              <div className="flex flex-col overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  <p className="font-mono text-2xl text-ink tabular-nums">
                    ¥{parseFloat(form.amount).toLocaleString()}
                  </p>
                  <p className="font-display text-lg text-ink-muted mt-0.5">{selectedCategory.name}</p>
                </div>
                <div className="overflow-y-auto border-t border-surface-3">
                  {selectedCategory.subcategories.map((sub, i) => (
                    <button
                      key={sub.id}
                      onClick={() => handleSubcategorySelect(sub.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 hover:bg-surface-1 active:bg-surface-2 transition-colors text-left",
                        i > 0 && "border-t border-surface-3"
                      )}
                    >
                      <span className="font-sans font-medium text-ink">{sub.name}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 text-ink-faint" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Note */}
            {step === "note" && (
              <div className="flex flex-col px-5 pt-5 pb-6 gap-6">
                <div>
                  <p className="font-mono text-2xl text-ink tabular-nums">
                    ¥{parseFloat(form.amount).toLocaleString()}
                  </p>
                  <p className="font-sans text-sm text-ink-muted mt-1">
                    {selectedCategory?.name}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    {selectedSub?.name}
                  </p>
                </div>

                <div className="space-y-3">
                  <label htmlFor="expense-note" className="block text-xs font-sans text-ink-muted uppercase tracking-widest">
                    Note
                  </label>
                  <input
                    id="expense-note"
                    type="text"
                    autoFocus
                    placeholder="Optional — what was this for?"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && mutation.mutate()}
                    maxLength={200}
                    className="w-full py-3 bg-transparent border-b border-surface-3 focus:border-accent outline-none font-sans text-ink placeholder:text-ink-faint text-[15px] transition-colors"
                  />
                </div>

                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-sans text-ink-muted uppercase tracking-widest">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((tag) => {
                        const selected = form.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-sans font-medium transition-colors",
                              selected
                                ? "bg-accent/15 text-accent"
                                : "border border-surface-3 text-ink-muted hover:border-accent hover:text-accent"
                            )}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mutation.error && (
                  <p className="text-red-400 text-sm font-sans text-pretty" role="alert">
                    {String(mutation.error)}
                  </p>
                )}

                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="w-full py-4 bg-accent hover:bg-accent-bright active:bg-accent-muted disabled:opacity-60 text-white font-sans font-medium rounded-xl text-[15px] transition-colors"
                >
                  {mutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
