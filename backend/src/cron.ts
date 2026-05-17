import cron from "node-cron";
import { createSnapshot, pruneOldSnapshots } from "./services/r2";
import { ensureFresh } from "./services/holidays";

export function startCron() {
  // Refresh holiday cache daily at 01:00 (before snapshot at 02:00)
  cron.schedule("0 1 * * *", async () => {
    await ensureFresh();
    console.log("[cron] Holiday cache refreshed");
  });

  // Daily snapshot at 02:00 server time
  cron.schedule("0 2 * * *", async () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    console.log(`[cron] Starting daily snapshot for ${dateStr}`);
    try {
      await createSnapshot(dateStr);
      console.log(`[cron] Snapshot ${dateStr} created successfully`);
      // Prune old snapshots only after a successful create
      await pruneOldSnapshots(7);
      console.log("[cron] Old snapshots pruned");
    } catch (err) {
      console.error("[cron] Snapshot failed — skipping pruning:", err);
    }
  });

  console.log("[cron] Jobs scheduled: holiday refresh at 01:00, snapshot at 02:00");
}
