import cron from "node-cron";
import { createSnapshot, pruneOldSnapshots, isBackupEnabled } from "./services/r2";

export function startCron() {
  if (!isBackupEnabled()) {
    console.log("[cron] R2 backup disabled — no jobs scheduled");
    return;
  }

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

  console.log("[cron] Jobs scheduled: snapshot at 02:00");
}
