"use server";

import { db } from "../db";
import {
  supplements,
  tags,
  dailyEntries,
  supplementsTaken,
  supplementTags,
  Supplement,
  Tag,
  DailyEntry,
  InsertDailyEntry,
} from "../db/schema";
import { and, eq, gte, lt, sql as drizzleSql } from "drizzle-orm";
import { startOfDay, addDays, getUnixTime } from "date-fns";

export async function addSupplement(
  name: string,
  description?: string,
  hidden: boolean = false
): Promise<Supplement> {
  const insertedSupplements = await db
    .insert(supplements)
    .values({
      name,
      description,
      hidden: hidden ? 1 : 0,
    })
    .returning();

  if (!insertedSupplements.length) {
    throw new Error("Не удалось добавить добавку");
  }

  return {
    ...insertedSupplements[0],
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

  const existingEntries = await db
    .select()
    .from(dailyEntries)
    .where(
      and(
        gte(dailyEntries.date, timestamp),
        lt(dailyEntries.date, nextDayTimestamp)
      )
    )
    .limit(1);

  let entryId: number;

  if (existingEntries.length > 0) {
    const existingEntry = existingEntries[0];
    entryId = existingEntry.id;

    await db
      .update(dailyEntries)
      .set({ rating, notes })
      .where(eq(dailyEntries.id, entryId));

    await db
      .delete(supplementsTaken)
      .where(eq(supplementsTaken.entryId, entryId));
  } else {
    const insertResult = await db
      .insert(dailyEntries)
      .values({ date: timestamp, rating, notes })
      .returning();

    if (!insertResult.length) {
      throw new Error("Не удалось создать запись");
    }

    entryId = insertResult[0].id;
  }

  // Добавляем связи с добавками
  if (supplementIds.length > 0) {
    await Promise.all(
      supplementIds.map((supplementId) =>
        db
          .insert(supplementsTaken)
          .values({
            supplementId,
            entryId,
          })
          .onConflictDoNothing()
      )
    );
  }

  await updateSupplementRatings(supplementIds);

  const fullEntry = await getDailyEntry(entryId);
  if (!fullEntry) {
    throw new Error("Не удалось получить созданную запись");
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
  if (data.rating !== undefined || data.notes !== undefined) {
    const updateData: Partial<InsertDailyEntry> = {};

    if (data.rating !== undefined) {
      updateData.rating = data.rating;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    await db
      .update(dailyEntries)
      .set(updateData)
      .where(eq(dailyEntries.id, entryId));
  }

  if (data.supplementIds !== undefined) {
    if (data.supplementIds!.length > 0) {
      const insertValues = data
        .supplementIds!.map((supplementId) => {
          return `(${supplementId}, ${entryId})`;
        })
        .join(", ");

      await db.execute(drizzleSql`
        WITH deleted AS (
          DELETE FROM supplements_taken
          WHERE entry_id = ${entryId}
        )
        INSERT INTO supplements_taken (supplement_id, entry_id)
        VALUES ${drizzleSql.raw(insertValues)}
        ON CONFLICT DO NOTHING
      `);
    } else {
      await db
        .delete(supplementsTaken)
        .where(eq(supplementsTaken.entryId, entryId));
    }

    await updateSupplementRatings(data.supplementIds);
  }

  const updatedEntry = await getDailyEntry(entryId);
  if (!updatedEntry) {
    throw new Error("Не удалось получить обновленную запись");
  }

  return updatedEntry;
}

export async function getDailyEntry(
  entryId: number
): Promise<DailyEntry | null> {
  const entries = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.id, entryId))
    .limit(1);

  if (entries.length === 0) return null;
  const entry = entries[0];

  const supplementsWithTags = await getSupplementsForEntry(entryId);

  return {
    ...entry,
    date: entry.date * 1000,
    supplements: supplementsWithTags.map((supplement) => ({
      supplement,
    })),
  };
}

export async function getSupplements(
  filterHidden: boolean = false
): Promise<Supplement[]> {
  const result = filterHidden
    ? await db.select().from(supplements).where(eq(supplements.hidden, 0))
    : await db.select().from(supplements);

  const supplementsWithTags = await Promise.all(
    result.map(async (supplement) => ({
      ...supplement,
      tags: await getSupplementTags(supplement.id),
    }))
  );

  return supplementsWithTags;
}

export async function getDailyEntries(): Promise<DailyEntry[]> {
  try {
    const entries = await db
      .select()
      .from(dailyEntries)
      .orderBy(drizzleSql`${dailyEntries.date} DESC`);

    const entriesWithSupplements = await Promise.all(
      entries.map(async (entry) => {
        const supplementsWithTags = await getSupplementsForEntry(entry.id);

        return {
          ...entry,
          date: entry.date * 1000,
          supplements: supplementsWithTags.map((supplement) => ({
            supplement,
          })),
        };
      })
    );

    return entriesWithSupplements;
  } catch (error) {
    console.error("Ошибка при получении записей:", error);
    throw error;
  }
}

async function updateSupplementRatings(supplementIds: number[]) {
  for (const id of supplementIds) {
    const withSupplementResult = await db.execute(
      drizzleSql`
        SELECT ROUND(AVG(${dailyEntries.rating}::numeric), 1) as "avgRating"
        FROM ${dailyEntries}
        INNER JOIN ${supplementsTaken} ON ${supplementsTaken.entryId} = ${dailyEntries.id}
        WHERE ${supplementsTaken.supplementId} = ${id}
      `
    );

    const avgWithSupplement =
      (withSupplementResult.rows[0]?.avgRating as string) ?? null;

    if (avgWithSupplement !== null) {
      await db
        .update(supplements)
        .set({ average_rating: Math.round(+avgWithSupplement) })
        .where(eq(supplements.id, id));
    }
  }

  const allSupplementsList = await db.select().from(supplements);

  for (const supplement of allSupplementsList) {
    const withSupplementResult = await db.execute(
      drizzleSql`
        SELECT ROUND(AVG(${dailyEntries.rating}::numeric), 1) as "avgRating"
        FROM ${dailyEntries}
        INNER JOIN ${supplementsTaken} ON ${supplementsTaken.entryId} = ${dailyEntries.id}
        WHERE ${supplementsTaken.supplementId} = ${supplement.id}
      `
    );

    const withoutSupplementResult = await db.execute(
      drizzleSql`
        SELECT ROUND(AVG(${dailyEntries.rating}::numeric), 1) as "avgRating"
        FROM ${dailyEntries}
        LEFT JOIN ${supplementsTaken} ON 
          ${supplementsTaken.entryId} = ${dailyEntries.id} AND 
          ${supplementsTaken.supplementId} = ${supplement.id}
        WHERE ${supplementsTaken.entryId} IS NULL
      `
    );

    const avgWithSupplement =
      (withSupplementResult.rows[0]?.avgRating as string) ?? null;
    const avgWithoutSupplement =
      (withoutSupplementResult.rows[0]?.avgRating as string) ?? null;

    const ratingDifference =
      avgWithSupplement !== null && avgWithoutSupplement !== null
        ? Number((+avgWithSupplement - +avgWithoutSupplement).toFixed(1))
        : null;

    await db
      .update(supplements)
      .set({ rating_difference: ratingDifference })
      .where(eq(supplements.id, supplement.id));
  }
}

export async function updateSupplement(
  id: number,
  data: Partial<Supplement>
): Promise<Supplement> {
  const { tags: newTags, ...updateData } = data;

  if (Object.keys(updateData).length > 0) {
    await db.update(supplements).set(updateData).where(eq(supplements.id, id));
  }

  if (newTags) {
    const tagIds = newTags.map((tag) => tag.id);
    await updateSupplementTags(id, tagIds);
  }

  return getFullSupplement(id);
}

export async function deleteSupplement(id: number): Promise<void> {
  await db
    .delete(supplementsTaken)
    .where(eq(supplementsTaken.supplementId, id));

  await db.delete(supplementTags).where(eq(supplementTags.supplementId, id));
  await db.delete(supplements).where(eq(supplements.id, id));
}

export async function toggleSupplementVisibility(
  id: number
): Promise<Supplement> {
  const supplementsList = await db
    .select()
    .from(supplements)
    .where(eq(supplements.id, id))
    .limit(1);

  if (supplementsList.length === 0) {
    throw new Error("Добавка не найдена");
  }

  const supplement = supplementsList[0];

  await db
    .update(supplements)
    .set({ hidden: supplement.hidden === 0 ? 1 : 0 })
    .where(eq(supplements.id, id));

  return getFullSupplement(id);
}

export async function deleteDailyEntry(id: number): Promise<void> {
  const supplementsInEntry = await db
    .select({ supplementId: supplementsTaken.supplementId })
    .from(supplementsTaken)
    .where(eq(supplementsTaken.entryId, id));

  await db.delete(supplementsTaken).where(eq(supplementsTaken.entryId, id));

  // Удаляем саму запись
  await db.delete(dailyEntries).where(eq(dailyEntries.id, id));

  const supplementIds = supplementsInEntry
    .map((s) => s.supplementId)
    .filter(Boolean);

  if (supplementIds.length > 0) {
    await updateSupplementRatings(supplementIds);
  }
}

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
  await db.delete(supplementTags).where(eq(supplementTags.tagId, id));

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

  // Добавляем новые связи
  if (tagIds.length > 0) {
    await Promise.all(
      tagIds.map((tagId) =>
        db
          .insert(supplementTags)
          .values({
            supplementId,
            tagId,
          })
          .onConflictDoNothing()
      )
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
  const supplementsList = await db
    .select()
    .from(supplements)
    .where(eq(supplements.id, id))
    .limit(1);

  if (supplementsList.length === 0) {
    throw new Error("Добавка не найдена");
  }

  return {
    ...supplementsList[0],
    tags: await getSupplementTags(id),
  };
}

async function getSupplementsForEntry(entryId: number): Promise<Supplement[]> {
  const supplementsData = await db
    .select()
    .from(supplements)
    .innerJoin(
      supplementsTaken,
      eq(supplements.id, supplementsTaken.supplementId)
    )
    .where(eq(supplementsTaken.entryId, entryId));

  return Promise.all(
    supplementsData.map(async (row) => ({
      ...row.supplements,
      tags: await getSupplementTags(row.supplements.id),
    }))
  );
}
