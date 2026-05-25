import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "expenses.db");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const client = createClient({ url: `file:${DB_PATH}` });
export const db = drizzle(client, { schema });

export async function initDb() {
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id)`,
    ],
    "write"
  );
}
