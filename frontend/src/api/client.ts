const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(options?.body != null ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Types
export interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
}

export interface Expense {
  id: number;
  amount: number;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  note: string | null;
  date: string;
  createdAt: string;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  total: number;
  subcategories: {
    subcategoryId: number;
    subcategoryName: string;
    total: number;
    expenses: Expense[];
  }[];
}

export interface WeeklyView {
  from: string;
  to: string;
  total: number;
  dailyTotals: { date: string; amount: number }[];
  categories: CategoryBreakdown[];
}

export interface MonthlyView {
  year: number;
  month: number;
  from: string;
  to: string;
  total: number;
  categories: CategoryBreakdown[];
}

export interface WeeksView {
  year: number;
  month: number;
  weeks: Array<{
    weekNum: number;
    from: string;
    to: string;
    total: number;
    categories: CategoryBreakdown[];
  }>;
}

export interface MonthComparisonView {
  period1: { year: number; month: number; total: number; categories: CategoryBreakdown[] };
  period2: { year: number; month: number; total: number; categories: CategoryBreakdown[] };
}

export interface Snapshot {
  key: string;
  date: string;
  size: number;
}

export interface User {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}
