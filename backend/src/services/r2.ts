import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { db } from "../db/index";
import { categories, subcategories, expenses } from "../db/schema";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;

export interface SnapshotData {
  timestamp: string;
  version: "1";
  categories: Array<{ id: number; name: string }>;
  subcategories: Array<{ id: number; categoryId: number; name: string }>;
  expenses: Array<{
    id: number;
    amount: number;
    categoryId: number;
    subcategoryId: number;
    note: string | null;
    date: string;
    createdAt: string;
  }>;
}

export async function createSnapshot(dateStr: string): Promise<void> {
  const [cats, subs, exps] = await Promise.all([
    db.select().from(categories),
    db.select().from(subcategories),
    db.select().from(expenses),
  ]);

  const payload: SnapshotData = {
    timestamp: new Date().toISOString(),
    version: "1",
    categories: cats.map((c) => ({ id: c.id, name: c.name })),
    subcategories: subs.map((s) => ({ id: s.id, categoryId: s.categoryId, name: s.name })),
    expenses: exps.map((e) => ({
      id: e.id,
      amount: e.amount,
      categoryId: e.categoryId,
      subcategoryId: e.subcategoryId,
      note: e.note ?? null,
      date: e.date,
      createdAt: e.createdAt,
    })),
  };

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: `snapshot-${dateStr}.json`,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
    })
  );
}

export async function listSnapshots(): Promise<{ key: string; date: string; size: number }[]> {
  const result = await getClient().send(
    new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: "snapshot-" })
  );

  return (result.Contents ?? [])
    .filter((obj) => obj.Key && obj.Size !== undefined)
    .map((obj) => ({
      key: obj.Key!,
      date: obj.Key!.replace("snapshot-", "").replace(".json", ""),
      size: obj.Size!,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSnapshot(key: string): Promise<SnapshotData> {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: BUCKET(), Key: key })
  );

  const body = await result.Body!.transformToString();
  return JSON.parse(body) as SnapshotData;
}

export async function deleteSnapshot(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

export async function pruneOldSnapshots(keepDays: number = 7): Promise<void> {
  const snapshots = await listSnapshots();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const toDelete = snapshots.filter((s) => s.date < cutoffStr);
  await Promise.all(toDelete.map((s) => deleteSnapshot(s.key)));
}
