import { FastifyInstance } from "fastify";
import { db } from "../db/index";
import { categories, subcategories, expenses } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function categoryRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // List all categories with their subcategories
  fastify.get("/categories", async () => {
    const cats = await db.select().from(categories).orderBy(categories.name);
    const subs = await db.select().from(subcategories).orderBy(subcategories.name);

    return cats.map((cat) => ({
      ...cat,
      subcategories: subs.filter((s) => s.categoryId === cat.id),
    }));
  });

  // Create category
  fastify.post<{ Body: { name: string } }>("/categories", async (request, reply) => {
    const { name } = request.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: "Name is required" });
    }

    const [inserted] = await db
      .insert(categories)
      .values({ name: name.trim() })
      .returning();

    return reply.code(201).send(inserted);
  });

  // Add subcategory to category
  fastify.post<{ Params: { id: string }; Body: { name: string } }>(
    "/categories/:id/subcategories",
    async (request, reply) => {
      const categoryId = parseInt(request.params.id);
      const { name } = request.body;

      if (!name?.trim()) {
        return reply.code(400).send({ error: "Name is required" });
      }

      const cat = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
      if (cat.length === 0) {
        return reply.code(404).send({ error: "Category not found" });
      }

      const [inserted] = await db
        .insert(subcategories)
        .values({ categoryId, name: name.trim() })
        .returning();

      return reply.code(201).send(inserted);
    }
  );

  // Delete category
  fastify.delete<{ Params: { id: string } }>("/categories/:id", async (request, reply) => {
    const id = parseInt(request.params.id);
    const cat = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (cat.length === 0) return reply.code(404).send({ error: "Not found" });

    const linked = await db.select().from(expenses).where(eq(expenses.categoryId, id)).limit(1);
    if (linked.length > 0) {
      return reply.code(409).send({ error: "Cannot delete — this category is used by existing expenses" });
    }

    await db.delete(categories).where(eq(categories.id, id));
    return { ok: true };
  });

  // Delete subcategory
  fastify.delete<{ Params: { id: string } }>(
    "/subcategories/:id",
    async (request, reply) => {
      const id = parseInt(request.params.id);
      const sub = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);

      if (sub.length === 0) return reply.code(404).send({ error: "Not found" });

      const linked = await db.select().from(expenses).where(eq(expenses.subcategoryId, id)).limit(1);
      if (linked.length > 0) {
        return reply.code(409).send({ error: "Cannot delete — this subcategory is used by existing expenses" });
      }

      await db.delete(subcategories).where(eq(subcategories.id, id));
      return { ok: true };
    }
  );
}
