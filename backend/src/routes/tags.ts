import { FastifyInstance } from "fastify";
import { db } from "../db/index";
import { tags, expenseTags } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function tagRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/tags", async () => {
    return db.select().from(tags).orderBy(tags.name);
  });

  fastify.post<{ Body: { name: string } }>("/tags", async (request, reply) => {
    const { name } = request.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: "Name is required" });
    }
    const [inserted] = await db
      .insert(tags)
      .values({ name: name.trim() })
      .returning();
    return reply.code(201).send(inserted);
  });

  fastify.delete<{ Params: { id: string } }>("/tags/:id", async (request, reply) => {
    const id = parseInt(request.params.id);
    const tag = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    if (tag.length === 0) return reply.code(404).send({ error: "Not found" });

    const linked = await db.select().from(expenseTags).where(eq(expenseTags.tagId, id)).limit(1);
    if (linked.length > 0) {
      return reply.code(409).send({ error: "Cannot delete — this tag is used by existing expenses" });
    }

    await db.delete(tags).where(eq(tags.id, id));
    return { ok: true };
  });
}
