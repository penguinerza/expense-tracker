// Single, app-wide currency, configured at build time.
// Override with VITE_CURRENCY (ISO 4217 code, e.g. "USD") and
// VITE_LOCALE (BCP 47 tag, e.g. "en-US"). Defaults to Japanese Yen.
const CURRENCY = import.meta.env.VITE_CURRENCY ?? "JPY";
const LOCALE = import.meta.env.VITE_LOCALE ?? "ja-JP";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

// Formats an amount with the configured currency: symbol, grouping, and the
// correct number of decimal places (0 for JPY, 2 for USD/EUR, …).
export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

// Bare currency symbol (e.g. "¥", "$", "€") for input prefixes and branding.
export const currencySymbol: string =
  formatter.formatToParts(0).find((p) => p.type === "currency")?.value ?? CURRENCY;
