import { db } from "@/db";
import {
  supplements,
  supplementTags,
  supplementsTaken,
  Supplement,
  dailyEntries,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getSupplements(
  filterHidden: boolean = false
): Promise<Supplement[]> {
  const result = await db.query.supplements.findMany({
    where: filterHidden ? eq(supplements.hidden, 0) : undefined,
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  return result.map((s) => ({
    ...s,
    tags: s.tags.map((t) => t.tag),
  }));
}

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

export async function updateSupplement(
  id: number,
  data: Partial<Supplement>
): Promise<Supplement> {
  const { tags: newTags, ...updateData } = data;

  const validUpdateData: Record<string, any> = {};
  if (updateData.name !== undefined) validUpdateData.name = updateData.name;
  if (updateData.description !== undefined)
    validUpdateData.description = updateData.description;
  if (updateData.hidden !== undefined)
    validUpdateData.hidden = updateData.hidden;
  if (updateData.average_rating !== undefined)
    validUpdateData.average_rating = updateData.average_rating;
  if (updateData.rating_difference !== undefined)
    validUpdateData.rating_difference = updateData.rating_difference;

  if (Object.keys(validUpdateData).length > 0) {
    await db
      .update(supplements)
      .set(validUpdateData)
      .where(eq(supplements.id, id));
  }

  if (newTags) {
    const tagIds = newTags.map((tag) => tag.id);
    await updateSupplementTags(id, tagIds);
  }

  return getFullSupplement(id);
}

export async function deleteSupplement(id: number): Promise<void> {
  await db.delete(supplements).where(eq(supplements.id, id));
}

export async function toggleSupplementVisibility(
  id: number
): Promise<Supplement> {
  const result = await db.execute(sql`
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

export async function hideSupplement(id: number): Promise<Supplement> {
  await db.update(supplements).set({ hidden: 1 }).where(eq(supplements.id, id));

  return getFullSupplement(id);
}

async function updateSupplementTags(
  supplementId: number,
  tagIds: number[]
): Promise<void> {
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
}

export async function getFullSupplement(id: number): Promise<Supplement> {
  const result = await db.query.supplements.findFirst({
    where: eq(supplements.id, id),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error("Добавка не найдена");
  }

  return {
    ...result,
    tags: result.tags.map((t) => t.tag),
  };
}

export async function updateSupplementRatings(supplementIds: number[]) {
  if (supplementIds.length === 0) return;

  const idsString = supplementIds.join(",");

  await db.execute(sql`
    WITH supplement_stats AS (
      SELECT 
        s.id as supplement_id,
        ROUND(AVG(de.rating) FILTER (WHERE st.entry_id IS NOT NULL)::numeric, 1) as avg_with,
        ROUND(AVG(de.rating) FILTER (WHERE st.entry_id IS NULL)::numeric, 1) as avg_without
      FROM supplements s
      CROSS JOIN daily_entries de
      LEFT JOIN supplements_taken st ON st.entry_id = de.id AND st.supplement_id = s.id
      WHERE s.id IN (${sql.raw(idsString)})
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
