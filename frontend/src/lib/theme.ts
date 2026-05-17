function cssVar(name: string): string {
  const channels = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `rgb(${channels})`;
}

export const colors = {
  get surface0() { return cssVar("--color-surface-0"); },
  get surface1() { return cssVar("--color-surface-1"); },
  get surface3() { return cssVar("--color-surface-3"); },
  get ink()      { return cssVar("--color-ink"); },
  get inkMuted() { return cssVar("--color-ink-muted"); },
  get accent()   { return cssVar("--color-accent"); },
  get inkFaint() { return cssVar("--color-ink-faint"); },
  get amber()    { return cssVar("--color-amber"); },
};

export const PIE_COLORS = [
  () => cssVar("--color-accent"),
  "#c9a227", "#3b82f6", "#22c55e", "#e8541a", "#06b6d4", "#f97316", "#84cc16",
] as const;

export function pieColor(index: number): string {
  const c = PIE_COLORS[index % PIE_COLORS.length];
  return typeof c === "function" ? c() : c;
}
