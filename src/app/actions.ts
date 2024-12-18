"use server";

import { db, sqlitePath } from "../db";
import {
  supplements,
  dailyEntries,
  supplementsTaken,
  tags,
  supplementTags,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { DailyEntry, Supplement, Tag } from "./types";
import { startOfDay, addDays, getUnixTime } from "date-fns";

export async function addSupplement(
  name: string,
  description?: string
): Promise<Supplement> {
  const [result] = await db
    .insert(supplements)
    .values({ name, description })
    .returning();

  return {
    ...result,
    tags: [],
  };
}

export async function addDailyEntry({
  dateTs,
  rating,
  notes,
  supplementIds,
}: {
  dateTs: number;
  rating: number;
  notes: string;
  supplementIds: number[];
}): Promise<DailyEntry> {
  const date = startOfDay(new Date(dateTs));
  const nextDay = addDays(date, 1);
  const timestamp = getUnixTime(date);
  const nextDayTimestamp = getUnixTime(nextDay);

  const existingEntry = await db
    .select()
    .from(dailyEntries)
    .where(
      sql`${dailyEntries.date} >= ${timestamp} AND ${dailyEntries.date} < ${nextDayTimestamp}`
    )
    .get();

  let entry;
  if (existingEntry) {
    entry = await db
      .update(dailyEntries)
      .set({
        rating,
        notes,
      })
      .where(eq(dailyEntries.id, existingEntry.id))
      .returning()
      .get();

    await db
      .delete(supplementsTaken)
      .where(eq(supplementsTaken.entryId, existingEntry.id));
  } else {
    entry = await db
      .insert(dailyEntries)
      .values({
        date: timestamp,
        rating,
        notes,
      })
      .returning()
      .get();
  }

  for (const supplementId of supplementIds) {
    await db.insert(supplementsTaken).values({
      supplementId,
      entryId: entry.id,
    });
  }

  await updateSupplementRatings(supplementIds);

  const fullEntry = await getDailyEntry(entry.id);
  if (!fullEntry) {
    throw new Error("Failed to create entry");
  }

  return fullEntry;
}

export async function updateDailyEntry(
  entryId: number,
  data: {
    rating?: number;
    notes?: string;
    supplementIds?: number[];
  }
): Promise<DailyEntry> {
  // Обновляем основные данные записи
  if (data.rating !== undefined || data.notes !== undefined) {
    await db
      .update(dailyEntries)
      .set({
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.notes !== undefined && { notes: data.notes }),
      })
      .where(eq(dailyEntries.id, entryId));
  }

  // Если переданы новые добавки, обновляем их
  if (data.supplementIds !== undefined) {
    // Удаляем старые связи
    await db
      .delete(supplementsTaken)
      .where(eq(supplementsTaken.entryId, entryId));

    // Добавляем новые связи
    for (const supplementId of data.supplementIds) {
      await db.insert(supplementsTaken).values({
        supplementId,
        entryId,
      });
    }

    // Обновляем рейтинги добавок
    await updateSupplementRatings(data.supplementIds);
  }

  const updatedEntry = await getDailyEntry(entryId);
  if (!updatedEntry) {
    throw new Error("Failed to update entry");
  }

  return updatedEntry;
}

export async function getDailyEntry(
  entryId: number
): Promise<DailyEntry | null> {
  const entry = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.id, entryId))
    .get();

  if (!entry) return null;

  const supplementsForEntry = await db
    .select({
      supplement: {
        id: supplements.id,
        name: supplements.name,
        description: supplements.description,
        hidden: supplements.hidden,
        averageRating: supplements.averageRating,
        ratingDifference: supplements.ratingDifference,
      },
    })
    .from(supplementsTaken)
    .innerJoin(supplements, eq(supplements.id, supplementsTaken.supplementId))
    .where(eq(supplementsTaken.entryId, entryId));

  const supplementsWithTags = await Promise.all(
    supplementsForEntry.map(async ({ supplement }) => ({
      supplement: {
        ...supplement,
        tags: await getSupplementTags(supplement.id),
      },
    }))
  );

  return {
    ...entry,
    date: entry.date * 1000,
    supplements: supplementsWithTags,
  };
}

export async function getSupplements(
  filterHidden: boolean = false
): Promise<Supplement[]> {
  const result = await db
    .select()
    .from(supplements)
    .where(filterHidden ? eq(supplements.hidden, 0) : undefined);

  const supplementsWithTags = await Promise.all(
    result.map(async (supplement) => ({
      ...supplement,
      tags: await getSupplementTags(supplement.id),
    }))
  );

  return supplementsWithTags;
}

export async function getDailyEntries(): Promise<DailyEntry[] | any[]> {
  try {
    const entries = await db
      .select()
      .from(dailyEntries)
      .orderBy(sql`${dailyEntries.date} DESC`);

    const entriesWithSupplements = await Promise.all(
      entries.map(async (entry) => {
        const supplementsForEntry = await db
          .select({
            supplement: {
              id: supplements.id,
              name: supplements.name,
              description: supplements.description,
              hidden: supplements.hidden,
              averageRating: supplements.averageRating,
              ratingDifference: supplements.ratingDifference,
            },
          })
          .from(supplementsTaken)
          .innerJoin(
            supplements,
            eq(supplements.id, supplementsTaken.supplementId)
          )
          .where(eq(supplementsTaken.entryId, entry.id));

        const supplementsWithTags = await Promise.all(
          supplementsForEntry.map(async ({ supplement }) => ({
            supplement: {
              ...supplement,
              tags: await getSupplementTags(supplement.id),
            },
          }))
        );

        return {
          ...entry,
          date: entry.date * 1000,
          supplements: supplementsWithTags,
        };
      })
    );

    return entriesWithSupplements;
  } catch (error) {
    return [error, sqlitePath];
  }
}

async function updateSupplementRatings(supplementIds: number[]) {
  for (const id of supplementIds) {
    const withSupplementResult = await db
      .select({
        avgRating: sql<number>`ROUND(AVG(${dailyEntries.rating}), 1)`,
      })
      .from(dailyEntries)
      .innerJoin(
        supplementsTaken,
        eq(supplementsTaken.entryId, dailyEntries.id)
      )
      .where(eq(supplementsTaken.supplementId, id))
      .get();

    const withoutSupplementResult = await db
      .select({
        avgRating: sql<number>`ROUND(AVG(${dailyEntries.rating}), 1)`,
      })
      .from(dailyEntries)
      .leftJoin(
        supplementsTaken,
        sql`${supplementsTaken.entryId} = ${dailyEntries.id} AND ${supplementsTaken.supplementId} = ${id}`
      )
      .where(sql`${supplementsTaken.entryId} IS NULL`)
      .get();

    const avgWithSupplement = withSupplementResult?.avgRating ?? null;
    const avgWithoutSupplement = withoutSupplementResult?.avgRating ?? null;

    const ratingDifference =
      avgWithSupplement !== null && avgWithoutSupplement !== null
        ? Number((avgWithSupplement - avgWithoutSupplement).toFixed(1))
        : null;

    if (avgWithSupplement !== null) {
      await db
        .update(supplements)
        .set({
          averageRating: avgWithSupplement,
          ratingDifference: ratingDifference,
        })
        .where(eq(supplements.id, id));
    }
  }
}

export async function updateSupplement(
  id: number,
  data: Partial<Supplement>
): Promise<Supplement> {
  await db.update(supplements).set(data).where(eq(supplements.id, id));

  return getFullSupplement(id);
}

export async function deleteSupplement(id: number): Promise<void> {
  // Сначала удаляем все связи с записями
  await db
    .delete(supplementsTaken)
    .where(eq(supplementsTaken.supplementId, id));

  // Затем удаляем добавку
  await db.delete(supplements).where(eq(supplements.id, id));
}

export async function toggleSupplementVisibility(
  id: number
): Promise<Supplement> {
  const supplement = await db
    .select()
    .from(supplements)
    .where(eq(supplements.id, id))
    .get();

  if (!supplement) {
    throw new Error("Supplement not found");
  }

  await db
    .update(supplements)
    .set({ hidden: supplement.hidden === 0 ? 1 : 0 })
    .where(eq(supplements.id, id));

  return getFullSupplement(id);
}

export async function deleteDailyEntry(id: number): Promise<void> {
  // Получаем список добавок, которые были в этот день
  const supplementsInEntry = await db
    .select({
      supplementId: supplementsTaken.supplementId,
    })
    .from(supplementsTaken)
    .where(eq(supplementsTaken.entryId, id));

  // Сначала удаляем все связи с добавками
  await db.delete(supplementsTaken).where(eq(supplementsTaken.entryId, id));

  // Затем удаляем саму запись
  await db.delete(dailyEntries).where(eq(dailyEntries.id, id));

  // Обновляем рейтинги всех добавок, которые были в удаленном дне
  await updateSupplementRatings(
    supplementsInEntry
      .map((s) => s.supplementId)
      .filter((id): id is number => id !== null)
  );
}

export async function getTags(): Promise<Tag[]> {
  return await db.select().from(tags).orderBy(tags.name);
}

export async function addTag(name: string): Promise<Tag> {
  const [result] = await db.insert(tags).values({ name }).returning();
  return result;
}

export async function deleteTag(id: number): Promise<void> {
  await db.delete(tags).where(eq(tags.id, id));
}

export async function getSupplementTags(supplementId: number): Promise<Tag[]> {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(supplementTags)
    .innerJoin(tags, eq(tags.id, supplementTags.tagId))
    .where(eq(supplementTags.supplementId, supplementId));
  return result;
}

export async function updateSupplementTags(
  supplementId: number,
  tagIds: number[]
): Promise<Supplement> {
  await db
    .delete(supplementTags)
    .where(eq(supplementTags.supplementId, supplementId));

  if (tagIds.length > 0) {
    await db.insert(supplementTags).values(
      tagIds.map((tagId) => ({
        supplementId,
        tagId,
      }))
    );
  }

  return getFullSupplement(supplementId);
}

export async function getSupplementRatings(
  supplementId: number
): Promise<{ date: number; rating: number }[]> {
  const result = await db
    .select({
      date: dailyEntries.date,
      rating: dailyEntries.rating,
    })
    .from(dailyEntries)
    .innerJoin(supplementsTaken, eq(supplementsTaken.entryId, dailyEntries.id))
    .where(eq(supplementsTaken.supplementId, supplementId))
    .orderBy(dailyEntries.date);

  return result;
}

export async function hideSupplement(id: number): Promise<Supplement> {
  await db.update(supplements).set({ hidden: 1 }).where(eq(supplements.id, id));

  return getFullSupplement(id);
}

async function getFullSupplement(id: number): Promise<Supplement> {
  const [supplement] = await db
    .select()
    .from(supplements)
    .where(eq(supplements.id, id));

  return {
    ...supplement,
    tags: await getSupplementTags(id),
  };
}
