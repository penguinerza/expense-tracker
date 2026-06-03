import { FastifyInstance } from "fastify";
import { client } from "../db/index";
import { requireAuth } from "../middleware/auth";
import { listSnapshots, getSnapshot, isBackupEnabled } from "../services/r2";

export async function snapshotRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // Whether R2 backups are configured/enabled — lets the UI hide the section
  fastify.get("/snapshots/status", async () => ({ enabled: isBackupEnabled() }));

  // List available snapshots
  fastify.get("/snapshots", async (_request, reply) => {
    if (!isBackupEnabled()) return [];
    try {
      return await listSnapshots();
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: "Failed to list snapshots from R2" });
    }
  });

  // Restore from a snapshot
  fastify.post<{ Body: { key: string } }>("/snapshots/restore", async (request, reply) => {
    if (!isBackupEnabled()) {
      return reply.code(404).send({ error: "R2 backup is disabled" });
    }

    const { key } = request.body;
    if (!key || !key.startsWith("snapshot-") || !key.endsWith(".json")) {
      return reply.code(400).send({ error: "Invalid snapshot key" });
    }

    try {
      const data = await getSnapshot(key);
      const now = new Date().toISOString();

      await client.batch(
        [
          { sql: "DELETE FROM expenses", args: [] },
          { sql: "DELETE FROM subcategories", args: [] },
          { sql: "DELETE FROM categories", args: [] },
          { sql: "DELETE FROM sqlite_sequence WHERE name IN ('expenses','subcategories','categories')", args: [] },
          ...data.categories.map((cat) => ({
            sql: "INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)",
            args: [cat.id, cat.name, now],
          })),
          ...data.subcategories.map((sub) => ({
            sql: "INSERT INTO subcategories (id, category_id, name, created_at) VALUES (?, ?, ?, ?)",
            args: [sub.id, sub.categoryId, sub.name, now],
          })),
          ...data.expenses.map((exp) => ({
            sql: "INSERT INTO expenses (id, amount, category_id, subcategory_id, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            args: [exp.id, exp.amount, exp.categoryId, exp.subcategoryId, exp.note ?? null, exp.date, exp.createdAt],
          })),
        ],
        "write"
      );

      return {
        ok: true,
        restored: {
          categories: data.categories.length,
          subcategories: data.subcategories.length,
          expenses: data.expenses.length,
          snapshotDate: data.timestamp,
        },
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: "Restore failed" });
    }
  });
}
