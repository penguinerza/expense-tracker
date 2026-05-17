import { FastifyInstance } from "fastify";
import { db } from "../db/index";
import { expenses, categories, subcategories, tags, expenseTags } from "../db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

interface ExpenseBody {
  amount: number;
  categoryId: number;
  subcategoryId: number;
  note?: string;
  tagIds?: number[];
  date?: string; // YYYY-MM-DD, defaults to today
}

async function getTagsForExpenses(ids: number[]) {
  if (ids.length === 0) return new Map<number, { id: number; name: string }[]>();
  const rows = await db
    .select({ expenseId: expenseTags.expenseId, tagId: tags.id, tagName: tags.name })
    .from(expenseTags)
    .innerJoin(tags, eq(expenseTags.tagId, tags.id))
    .where(inArray(expenseTags.expenseId, ids));
  const map = new Map<number, { id: number; name: string }[]>();
  for (const r of rows) {
    const list = map.get(r.expenseId) ?? [];
    list.push({ id: r.tagId, name: r.tagName });
    map.set(r.expenseId, list);
  }
  return map;
}

async function setExpenseTags(expenseId: number, tagIds: number[]) {
  await db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId));
  if (tagIds.length > 0) {
    await db.insert(expenseTags).values(tagIds.map((tagId) => ({ expenseId, tagId })));
  }
}

export async function expenseRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // List expenses with optional date range
  fastify.get<{
    Querystring: { from?: string; to?: string; categoryId?: string };
  }>("/expenses", async (request) => {
    const { from, to, categoryId } = request.query;

    const conditions = [];
    if (from) conditions.push(gte(expenses.date, from));
    if (to) conditions.push(lte(expenses.date, to));
    if (categoryId) conditions.push(eq(expenses.categoryId, parseInt(categoryId)));

    const rows = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    const tagMap = await getTagsForExpenses(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, tags: tagMap.get(r.id) ?? [] }));
  });

  // Create expense
  fastify.post<{ Body: ExpenseBody }>("/expenses", async (request, reply) => {
    const { amount, categoryId, subcategoryId, note, tagIds, date } = request.body;

    if (!amount || amount <= 0) {
      return reply.code(400).send({ error: "Amount must be positive" });
    }
    if (!categoryId || !subcategoryId) {
      return reply.code(400).send({ error: "Category and subcategory are required" });
    }
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dateToUse = date ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateToUse)) {
      return reply.code(400).send({ error: "Date must be YYYY-MM-DD" });
    }

    const sub = await db
      .select()
      .from(subcategories)
      .where(and(eq(subcategories.id, subcategoryId), eq(subcategories.categoryId, categoryId)))
      .limit(1);
    if (sub.length === 0) {
      return reply.code(400).send({ error: "Subcategory does not belong to category" });
    }

    const [inserted] = await db
      .insert(expenses)
      .values({ amount, categoryId, subcategoryId, note: note || null, date: dateToUse })
      .returning();

    await setExpenseTags(inserted.id, tagIds ?? []);

    const tagMap = await getTagsForExpenses([inserted.id]);
    return reply.code(201).send({ ...inserted, tags: tagMap.get(inserted.id) ?? [] });
  });

  // Update expense
  fastify.put<{ Params: { id: string }; Body: Partial<ExpenseBody> }>(
    "/expenses/:id",
    async (request, reply) => {
      const id = parseInt(request.params.id);
      const { amount, categoryId, subcategoryId, note, tagIds, date } = request.body;

      const existing = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.code(404).send({ error: "Expense not found" });
      }

      const updates: Partial<typeof expenses.$inferInsert> = {};
      if (amount !== undefined) updates.amount = amount;
      if (categoryId !== undefined) updates.categoryId = categoryId;
      if (subcategoryId !== undefined) updates.subcategoryId = subcategoryId;
      if (note !== undefined) updates.note = note || null;
      if (date !== undefined) updates.date = date;

      const [updated] = await db
        .update(expenses)
        .set(updates)
        .where(eq(expenses.id, id))
        .returning();

      if (tagIds !== undefined) {
        await setExpenseTags(id, tagIds);
      }

      const tagMap = await getTagsForExpenses([id]);
      return { ...updated, tags: tagMap.get(id) ?? [] };
    }
  );

  // Delete expense
  fastify.delete<{ Params: { id: string } }>("/expenses/:id", async (request, reply) => {
    const id = parseInt(request.params.id);
    const deleted = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    if (deleted.length === 0) {
      return reply.code(404).send({ error: "Expense not found" });
    }
    return { ok: true };
  });
}
