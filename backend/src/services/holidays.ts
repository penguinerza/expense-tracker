import https from "https";

const HOLIDAYS_API = "https://holidays-jp.github.io/api/v1/date.json";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // refresh cache daily

let cache: Set<string> = new Set();
let lastFetchedAt = 0;

async function fetchHolidays(): Promise<Set<string>> {
  return new Promise((resolve, reject) => {
    https.get(HOLIDAYS_API, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body) as Record<string, string>;
          resolve(new Set(Object.keys(json)));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

export async function initHolidays(): Promise<void> {
  try {
    cache = await fetchHolidays();
    lastFetchedAt = Date.now();
    console.log(`[holidays] Loaded ${cache.size} Japanese holidays from API`);
  } catch (err) {
    console.error("[holidays] Failed to fetch holidays — payday calculation will fall back to weekends only:", err);
  }
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS) {
    try {
      cache = await fetchHolidays();
      lastFetchedAt = Date.now();
    } catch {
      // keep stale cache rather than crashing
    }
  }
}

export function isJapaneseHoliday(date: Date): boolean {
  const iso = toISODate(date);
  return cache.has(iso);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isJapaneseHoliday(date);
}

// Call this once a day to keep the cache warm (optional — init covers most cases)
export { ensureFresh };

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
