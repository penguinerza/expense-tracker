import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { api, Category } from "../api/client";

type Step = "amount" | "category" | "subcategory" | "note";

interface FormState {
  amount: string;
  categoryId: number | null;
  subcategoryId: number | null;
  note: string;
  date: string;
}

const INITIAL: FormState = {
  amount: "",
  categoryId: null,
  subcategoryId: null,
  note: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

const STEPS: Step[] = ["amount", "category", "subcategory", "note"];

export default function Log() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("amount");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saved, setSaved] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/expenses", {
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        note: form.note || undefined,
        date: form.date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["views"] });
      setSaved(true);
      setTimeout(() => {
        setForm(INITIAL);
        setStep("amount");
        setSaved(false);
      }, 1400);
    },
  });

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

  if (saved) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-surface-0">
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
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-surface-0 safe-top">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 h-14">
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
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="text-xs font-mono text-ink-muted bg-transparent border-none outline-none tabular-nums"
        />
      </div>

      {/* Progress bar */}
      <div className="flex gap-0.5 px-5">
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
        <div className="flex-1 flex flex-col justify-between px-5 pb-8">
          <div className="pt-10">
            <h1 className="font-display text-3xl text-ink text-balance">Log Expense</h1>
            <p className="font-sans text-ink-muted text-sm mt-2">Enter the amount spent</p>
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
                className="font-mono text-7xl text-ink bg-transparent border-none outline-none w-52 text-right tabular-nums placeholder:text-surface-3"
              />
            </div>
            <div className={cn("h-px w-32 transition-colors", form.amount && parseFloat(form.amount) > 0 ? "bg-accent" : "bg-surface-3")} />
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
        <div className="flex-1 flex flex-col px-5">
          <div className="pt-8 pb-6">
            <p className="font-mono text-2xl text-ink tabular-nums">
              ¥{parseFloat(form.amount).toLocaleString()}
            </p>
            <h2 className="font-display text-xl text-ink-muted mt-1">Select category</h2>
          </div>

          <div className="flex-1 -mx-5">
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
        <div className="flex-1 flex flex-col px-5">
          <div className="pt-8 pb-6">
            <p className="font-mono text-2xl text-ink tabular-nums">
              ¥{parseFloat(form.amount).toLocaleString()}
            </p>
            <h2 className="font-display text-xl text-ink-muted mt-1">{selectedCategory.name}</h2>
          </div>

          <div className="flex-1 -mx-5">
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
        <div className="flex-1 flex flex-col justify-between px-5 pb-8">
          <div className="pt-8">
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
            {mutation.error && (
              <p className="text-red-400 text-sm font-sans text-pretty" role="alert">
                {String(mutation.error)}
              </p>
            )}
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-4 bg-accent hover:bg-accent-bright active:bg-accent-muted disabled:opacity-60 text-white font-sans font-medium rounded-xl text-[15px] transition-colors"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
