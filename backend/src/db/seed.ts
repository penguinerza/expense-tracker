import { db } from "./index";
import { categories, subcategories } from "./schema";
import { eq } from "drizzle-orm";

const PRESET_CATEGORIES: { name: string; subs: string[] }[] = [
  { name: "Food", subs: ["Groceries", "Dining Out", "Coffee"] },
  { name: "Transport", subs: ["Fuel", "Public Transit", "Parking"] },
  { name: "Bills", subs: ["Rent", "Electricity", "Internet"] },
  { name: "Shopping", subs: ["Clothes", "Electronics", "Household"] },
  { name: "Health", subs: ["Medicine", "Gym", "Doctor"] },
  { name: "Entertainment", subs: ["Streaming", "Events", "Hobbies"] },
];

export async function seedIfEmpty() {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) return;

  for (const cat of PRESET_CATEGORIES) {
    const [inserted] = await db
      .insert(categories)
      .values({ name: cat.name })
      .returning();

    await db.insert(subcategories).values(
      cat.subs.map((name) => ({
        categoryId: inserted.id,
        name,
      }))
    );
  }
}
