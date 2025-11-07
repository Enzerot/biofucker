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

  if (supplementIds.length > 0) {
    await db
      .insert(supplementsTaken)
      .values(
        supplementIds.map((supplementId) => ({
          supplementId,
          entryId,
        }))
      )
      .onConflictDoNothing();
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
  const query = db
    .select({
      id: supplements.id,
      name: supplements.name,
      description: supplements.description,
      hidden: supplements.hidden,
      average_rating: supplements.average_rating,
      rating_difference: supplements.rating_difference,
      tagId: tags.id,
      tagName: tags.name,
    })
    .from(supplements)
    .leftJoin(supplementTags, eq(supplementTags.supplementId, supplements.id))
    .leftJoin(tags, eq(tags.id, supplementTags.tagId));

  const result = filterHidden
    ? await query.where(eq(supplements.hidden, 0))
    : await query;

  const supplementsMap = new Map<number, Supplement>();

  for (const row of result) {
    if (!supplementsMap.has(row.id)) {
      supplementsMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        hidden: row.hidden,
        average_rating: row.average_rating,
        rating_difference: row.rating_difference,
        tags: [],
      });
    }

    if (row.tagId && row.tagName) {
      supplementsMap.get(row.id)!.tags.push({
        id: row.tagId,
        name: row.tagName,
      });
    }
  }

  return Array.from(supplementsMap.values());
}

export async function getDailyEntries(): Promise<DailyEntry[]> {
  try {
    const entries = await db
      .select()
      .from(dailyEntries)
      .orderBy(drizzleSql`${dailyEntries.date} DESC`);

    if (entries.length === 0) {
      return [];
    }

    const entryIds = entries.map((e) => e.id);

    const supplementsData = await db
      .select({
        entryId: supplementsTaken.entryId,
        id: supplements.id,
        name: supplements.name,
        description: supplements.description,
        hidden: supplements.hidden,
        average_rating: supplements.average_rating,
        rating_difference: supplements.rating_difference,
        tagId: tags.id,
        tagName: tags.name,
      })
      .from(supplementsTaken)
      .innerJoin(supplements, eq(supplements.id, supplementsTaken.supplementId))
      .leftJoin(supplementTags, eq(supplementTags.supplementId, supplements.id))
      .leftJoin(tags, eq(tags.id, supplementTags.tagId))
      .where(
        drizzleSql`${supplementsTaken.entryId} IN (${drizzleSql.raw(
          entryIds.join(",")
        )})`
      );

    const supplementsByEntry = new Map<number, Map<number, Supplement>>();

    for (const row of supplementsData) {
      if (!supplementsByEntry.has(row.entryId)) {
        supplementsByEntry.set(row.entryId, new Map());
      }

      const entrySupplements = supplementsByEntry.get(row.entryId)!;

      if (!entrySupplements.has(row.id)) {
        entrySupplements.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          hidden: row.hidden,
          average_rating: row.average_rating,
          rating_difference: row.rating_difference,
          tags: [],
        });
      }

      if (row.tagId && row.tagName) {
        entrySupplements.get(row.id)!.tags.push({
          id: row.tagId,
          name: row.tagName,
        });
      }
    }

    return entries.map((entry) => ({
      ...entry,
      date: entry.date * 1000,
      supplements: Array.from(
        supplementsByEntry.get(entry.id)?.values() || []
      ).map((supplement) => ({
        supplement,
      })),
    }));
  } catch (error) {
    console.error("Ошибка при получении записей:", error);
    throw error;
  }
}

async function updateSupplementRatings(supplementIds: number[]) {
  await db.execute(drizzleSql`
    WITH supplement_stats AS (
      SELECT 
        s.id as supplement_id,
        ROUND(AVG(de.rating) FILTER (WHERE st.entry_id IS NOT NULL)::numeric, 1) as avg_with,
        ROUND(AVG(de.rating) FILTER (WHERE st.entry_id IS NULL)::numeric, 1) as avg_without
      FROM supplements s
      CROSS JOIN daily_entries de
      LEFT JOIN supplements_taken st ON st.entry_id = de.id AND st.supplement_id = s.id
      GROUP BY s.id
      HAVING COUNT(*) FILTER (WHERE st.entry_id IS NOT NULL) > 0
    )
    UPDATE supplements
    SET 
      average_rating = ROUND(ss.avg_with)::integer,
      rating_difference = CASE 
        WHEN ss.avg_with IS NOT NULL AND ss.avg_without IS NOT NULL
        THEN ROUND((ss.avg_with - ss.avg_without)::numeric, 1)
        ELSE NULL
      END
    FROM supplement_stats ss
    WHERE supplements.id = ss.supplement_id
  `);
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
  await db.execute(drizzleSql`
    WITH delete_taken AS (
      DELETE FROM supplements_taken
      WHERE supplement_id = ${id}
    ),
    delete_tags AS (
      DELETE FROM supplement_tags
      WHERE supplement_id = ${id}
    )
    DELETE FROM supplements
    WHERE id = ${id}
  `);
}

export async function toggleSupplementVisibility(
  id: number
): Promise<Supplement> {
  const result = await db.execute(drizzleSql`
    UPDATE supplements
    SET hidden = CASE WHEN hidden = 0 THEN 1 ELSE 0 END
    WHERE id = ${id}
    RETURNING *
  `);

  if (!result.rows.length) {
    throw new Error("Добавка не найдена");
  }

  return getFullSupplement(id);
}

export async function deleteDailyEntry(id: number): Promise<void> {
  const result = await db.execute(drizzleSql`
    WITH deleted_supplements AS (
      DELETE FROM supplements_taken
      WHERE entry_id = ${id}
      RETURNING supplement_id
    ),
    deleted_entry AS (
      DELETE FROM daily_entries
      WHERE id = ${id}
    )
    SELECT DISTINCT supplement_id FROM deleted_supplements
  `);

  const supplementIds = result.rows
    .map((row: any) => row.supplement_id)
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
  await db.execute(drizzleSql`
    WITH delete_supplement_tags AS (
      DELETE FROM supplement_tags
      WHERE tag_id = ${id}
    )
    DELETE FROM tags
    WHERE id = ${id}
  `);
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
    await db
      .insert(supplementTags)
      .values(
        tagIds.map((tagId) => ({
          supplementId,
          tagId,
        }))
      )
      .onConflictDoNothing();
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
  const result = await db
    .select({
      id: supplements.id,
      name: supplements.name,
      description: supplements.description,
      hidden: supplements.hidden,
      average_rating: supplements.average_rating,
      rating_difference: supplements.rating_difference,
      tagId: tags.id,
      tagName: tags.name,
    })
    .from(supplements)
    .leftJoin(supplementTags, eq(supplementTags.supplementId, supplements.id))
    .leftJoin(tags, eq(tags.id, supplementTags.tagId))
    .where(eq(supplements.id, id));

  if (result.length === 0) {
    throw new Error("Добавка не найдена");
  }

  const supplement: Supplement = {
    id: result[0].id,
    name: result[0].name,
    description: result[0].description,
    hidden: result[0].hidden,
    average_rating: result[0].average_rating,
    rating_difference: result[0].rating_difference,
    tags: [],
  };

  for (const row of result) {
    if (row.tagId && row.tagName) {
      supplement.tags.push({
        id: row.tagId,
        name: row.tagName,
      });
    }
  }

  return supplement;
}

async function getSupplementsForEntry(entryId: number): Promise<Supplement[]> {
  const supplementsData = await db
    .select({
      id: supplements.id,
      name: supplements.name,
      description: supplements.description,
      hidden: supplements.hidden,
      average_rating: supplements.average_rating,
      rating_difference: supplements.rating_difference,
      tagId: tags.id,
      tagName: tags.name,
    })
    .from(supplements)
    .innerJoin(
      supplementsTaken,
      eq(supplements.id, supplementsTaken.supplementId)
    )
    .leftJoin(supplementTags, eq(supplementTags.supplementId, supplements.id))
    .leftJoin(tags, eq(tags.id, supplementTags.tagId))
    .where(eq(supplementsTaken.entryId, entryId));

  const supplementsMap = new Map<number, Supplement>();

  for (const row of supplementsData) {
    if (!supplementsMap.has(row.id)) {
      supplementsMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        hidden: row.hidden,
        average_rating: row.average_rating,
        rating_difference: row.rating_difference,
        tags: [],
      });
    }

    if (row.tagId && row.tagName) {
      supplementsMap.get(row.id)!.tags.push({
        id: row.tagId,
        name: row.tagName,
      });
    }
  }

  return Array.from(supplementsMap.values());
}
