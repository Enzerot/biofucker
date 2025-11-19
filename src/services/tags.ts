import { db } from "@/db";
import { tags, Tag } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(tags.name);
}

export async function addTag(name: string): Promise<Tag> {
  const result = await db.insert(tags).values({ name }).returning();

  if (!result.length) {
    throw new Error("Не удалось добавить тег");
  }

  return result[0];
}

export async function deleteTag(id: number): Promise<void> {
  await db.delete(tags).where(eq(tags.id, id));
}
