/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ISO 4217 currency code (e.g. "USD", "EUR"). Defaults to "JPY". */
  readonly VITE_CURRENCY?: string;
  /** BCP 47 locale for number/currency formatting (e.g. "en-US"). Defaults to "ja-JP". */
  readonly VITE_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
