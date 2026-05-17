import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { initDb } from "./db/index";
import { seedIfEmpty } from "./db/seed";
import { initHolidays } from "./services/holidays";
import { authRoutes } from "./routes/auth";
import { expenseRoutes } from "./routes/expenses";
import { categoryRoutes } from "./routes/categories";
import { viewRoutes } from "./routes/views";
import { snapshotRoutes } from "./routes/snapshots";
import { tagRoutes } from "./routes/tags";
import { startCron } from "./cron";

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
});

async function main() {
  // Init DB
  await initDb();
  await seedIfEmpty();

  // Load Japanese holidays from API
  await initHolidays();

  // Plugins
  await fastify.register(cookie);
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  });

  // Routes under /api prefix
  await fastify.register(
    async (api) => {
      // Each module is registered as its own encapsulated plugin so a
      // `preHandler` hook (e.g. requireAuth) added inside a protected
      // module does NOT leak onto the public auth routes. Calling them
      // as bare functions shares one context and gates /auth/google +
      // /auth/callback behind requireAuth, making login impossible.
      await api.register(authRoutes);
      await api.register(expenseRoutes);
      await api.register(categoryRoutes);
      await api.register(viewRoutes);
      await api.register(snapshotRoutes);
      await api.register(tagRoutes);
    },
    { prefix: "/api" }
  );

  // Health check
  fastify.get("/health", async () => ({ status: "ok" }));

  // Start cron
  startCron();

  const port = parseInt(process.env.PORT ?? "3001");
  await fastify.listen({ port, host: "0.0.0.0" });
  console.log(`Backend listening on port ${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
