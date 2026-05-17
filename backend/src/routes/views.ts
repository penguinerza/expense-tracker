import { FastifyInstance } from "fastify";
import { db } from "../db/index";
import { expenses, categories, subcategories, expenseTags } from "../db/schema";
import { eq, and, gte, lte, inArray, SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getPaydayString } from "../services/payday";

function isoWeekBounds(year: number, week: number): { from: string; to: string } {
  // ISO week: Monday=1, Sunday=7
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    from: weekStart.toISOString().slice(0, 10),
    to: weekEnd.toISOString().slice(0, 10),
  };
}

function mondayOfDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function sundayOfDate(dateStr: string): string {
  const d = new Date(mondayOfDate(dateStr));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

async function fetchExpensesInRange(from: string, to: string, tagIds?: number[]) {
  const conditions: SQL[] = [gte(expenses.date, from), lte(expenses.date, to)];

  if (tagIds && tagIds.length > 0) {
    const tagged = db
      .select({ expenseId: expenseTags.expenseId })
      .from(expenseTags)
      .where(inArray(expenseTags.tagId, tagIds));
    conditions.push(inArray(expenses.id, tagged));
  }

  return db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      date: expenses.date,
      note: expenses.note,
      createdAt: expenses.createdAt,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      subcategoryId: expenses.subcategoryId,
      subcategoryName: subcategories.name,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .where(and(...conditions));
}

function groupByCategory(rows: Awaited<ReturnType<typeof fetchExpensesInRange>>) {
  const map = new Map<
    number,
    {
      categoryId: number;
      categoryName: string;
      total: number;
      subcategories: Map<number, { subcategoryId: number; subcategoryName: string; total: number; expenses: typeof rows }>;
    }
  >();

  for (const row of rows) {
    if (!row.categoryId || !row.categoryName) continue;
    if (!map.has(row.categoryId)) {
      map.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        total: 0,
        subcategories: new Map(),
      });
    }
    const cat = map.get(row.categoryId)!;
    cat.total += row.amount;

    if (!cat.subcategories.has(row.subcategoryId)) {
      cat.subcategories.set(row.subcategoryId, {
        subcategoryId: row.subcategoryId,
        subcategoryName: row.subcategoryName ?? "",
        total: 0,
        expenses: [],
      });
    }
    const sub = cat.subcategories.get(row.subcategoryId)!;
    sub.total += row.amount;
    sub.expenses.push(row);
  }

  return Array.from(map.values()).map((cat) => ({
    ...cat,
    subcategories: Array.from(cat.subcategories.values()),
  }));
}

export async function viewRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // Weekly view: ?date=YYYY-MM-DD (any date within the desired week)
  fastify.get<{ Querystring: { date?: string; tagIds?: string } }>("/views/weekly", async (request) => {
    const dateStr = request.query.date ?? new Date().toISOString().slice(0, 10);
    const tagIds = request.query.tagIds ? request.query.tagIds.split(",").map(Number).filter(Boolean) : undefined;
    const from = mondayOfDate(dateStr);
    const to = sundayOfDate(dateStr);

    const [year, month] = from.split("-").map(Number);
    const toDate = new Date(to);
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth() + 1;

    // Check if payday falls in this week range
    const paydays = new Set<string>();
    for (const [y, m] of [
      [year, month],
      [toYear, toMonth],
    ]) {
      const pd = getPaydayString(y, m);
      if (pd >= from && pd <= to) paydays.add(pd);
    }

    const rows = await fetchExpensesInRange(from, to, tagIds);

    // Daily totals
    const dailyMap = new Map<string, number>();
    for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of rows) {
      dailyMap.set(row.date, (dailyMap.get(row.date) ?? 0) + row.amount);
    }

    const total = rows.reduce((sum, r) => sum + r.amount, 0);

    return {
      from,
      to,
      total,
      payday: paydays.size > 0 ? Array.from(paydays)[0] : null,
      dailyTotals: Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount })),
      categories: groupByCategory(rows),
    };
  });

  // Monthly view: ?year=2026&month=5
  fastify.get<{ Querystring: { year?: string; month?: string; tagIds?: string } }>(
    "/views/monthly",
    async (request) => {
      const year = parseInt(request.query.year ?? String(new Date().getFullYear()));
      const month = parseInt(request.query.month ?? String(new Date().getMonth() + 1));
      const tagIds = request.query.tagIds ? request.query.tagIds.split(",").map(Number).filter(Boolean) : undefined;

      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const payday = getPaydayString(year, month);
      const rows = await fetchExpensesInRange(from, to, tagIds);
      const total = rows.reduce((sum, r) => sum + r.amount, 0);

      return {
        year,
        month,
        from,
        to,
        total,
        payday,
        categories: groupByCategory(rows),
      };
    }
  );

  // Comparison: month-to-month
  fastify.get<{
    Querystring: {
      year1?: string; month1?: string;
      year2?: string; month2?: string;
      tagIds?: string;
    };
  }>("/views/comparison/months", async (request) => {
    const now = new Date();
    const y1 = parseInt(request.query.year1 ?? String(now.getFullYear()));
    const m1 = parseInt(request.query.month1 ?? String(now.getMonth() + 1));
    const prevMonth = m1 === 1 ? 12 : m1 - 1;
    const prevYear = m1 === 1 ? y1 - 1 : y1;
    const y2 = parseInt(request.query.year2 ?? String(prevYear));
    const m2 = parseInt(request.query.month2 ?? String(prevMonth));
    const tagIds = request.query.tagIds ? request.query.tagIds.split(",").map(Number).filter(Boolean) : undefined;

    async function getMonthData(year: number, month: number) {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const rows = await fetchExpensesInRange(from, to, tagIds);
      const total = rows.reduce((sum, r) => sum + r.amount, 0);
      return { year, month, total, categories: groupByCategory(rows) };
    }

    const [period1, period2] = await Promise.all([
      getMonthData(y1, m1),
      getMonthData(y2, m2),
    ]);

    return { period1, period2 };
  });

  // Comparison: week-to-week within a month (calendar weeks Mon-Sun)
  fastify.get<{ Querystring: { year?: string; month?: string; tagIds?: string } }>(
    "/views/comparison/weeks",
    async (request) => {
      const now = new Date();
      const year = parseInt(request.query.year ?? String(now.getFullYear()));
      const month = parseInt(request.query.month ?? String(now.getMonth() + 1));
      const tagIds = request.query.tagIds ? request.query.tagIds.split(",").map(Number).filter(Boolean) : undefined;

      const monthFrom = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Build calendar weeks that overlap this month
      const weeks: { weekNum: number; from: string; to: string }[] = [];
      let cursor = new Date(mondayOfDate(monthFrom));
      let weekNum = 1;

      while (cursor.toISOString().slice(0, 10) <= monthTo) {
        const wFrom = cursor.toISOString().slice(0, 10);
        const wEnd = new Date(cursor);
        wEnd.setDate(cursor.getDate() + 6);
        const wTo = wEnd.toISOString().slice(0, 10);

        // Clamp to month boundaries for display
        const clampedFrom = wFrom < monthFrom ? monthFrom : wFrom;
        const clampedTo = wTo > monthTo ? monthTo : wTo;

        weeks.push({ weekNum, from: clampedFrom, to: clampedTo });
        cursor.setDate(cursor.getDate() + 7);
        weekNum++;
      }

      const weekData = await Promise.all(
        weeks.map(async (w) => {
          const rows = await fetchExpensesInRange(w.from, w.to, tagIds);
          const total = rows.reduce((sum, r) => sum + r.amount, 0);
          return { ...w, total, categories: groupByCategory(rows) };
        })
      );

      const payday = getPaydayString(year, month);
      return { year, month, payday, weeks: weekData };
    }
  );
}
