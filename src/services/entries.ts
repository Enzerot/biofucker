import { db } from "@/db";
import {
  dailyEntries,
  supplementsTaken,
  DailyEntry,
  InsertDailyEntry,
} from "@/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { updateSupplementRatings } from "./supplements";

export async function getDailyEntries(): Promise<DailyEntry[]> {
  try {
    const entries = await db.query.dailyEntries.findMany({
      orderBy: [desc(dailyEntries.date)],
      with: {
        supplements: {
          with: {
            supplement: {
              with: {
                tags: {
                  with: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return entries.map((entry) => ({
      ...entry,
      date: entry.date * 1000, // Конвертация из Unix timestamp (sec) в JS timestamp (ms)
      supplements: entry.supplements.map((s) => ({
        supplement: {
          ...s.supplement,
          tags: s.supplement.tags.map((t) => t.tag),
        },
      })),
    }));
  } catch (error) {
    console.error("Ошибка при получении записей:", error);
    throw error;
  }
}

export async function getDailyEntry(
  entryId: number
): Promise<DailyEntry | null> {
  const entry = await db.query.dailyEntries.findFirst({
    where: eq(dailyEntries.id, entryId),
    with: {
      supplements: {
        with: {
          supplement: {
            with: {
              tags: {
                with: {
                  tag: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!entry) return null;

  return {
    ...entry,
    date: entry.date * 1000,
    supplements: entry.supplements.map((s) => ({
      supplement: {
        ...s.supplement,
        tags: s.supplement.tags.map((t) => t.tag),
      },
    })),
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
  const date = new Date(dateTs);
  const timestamp = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      1000
  );
  const nextDayTimestamp = timestamp + 86400;

  // Проверяем существование записи
  const existingEntry = await db.query.dailyEntries.findFirst({
    where: and(
      gte(dailyEntries.date, timestamp),
      lt(dailyEntries.date, nextDayTimestamp)
    ),
  });

  let entryId: number;

  if (existingEntry) {
    entryId = existingEntry.id;

    await db
      .update(dailyEntries)
      .set({ rating, notes })
      .where(eq(dailyEntries.id, entryId));

    // При обновлении проще удалить старые связи и создать новые
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

  // Обновляем рейтинги добавок
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
    // Используем транзакцию или просто выполняем команды последовательно
    // Drizzle пока не имеет простого API для полной замены many-to-many, делаем вручную
    await db
      .delete(supplementsTaken)
      .where(eq(supplementsTaken.entryId, entryId));

    if (data.supplementIds.length > 0) {
      await db
        .insert(supplementsTaken)
        .values(
          data.supplementIds.map((supplementId) => ({
            supplementId,
            entryId,
          }))
        )
        .onConflictDoNothing();
    }

    await updateSupplementRatings(data.supplementIds);
  }

  const updatedEntry = await getDailyEntry(entryId);
  if (!updatedEntry) {
    throw new Error("Не удалось получить обновленную запись");
  }

  return updatedEntry;
}

export async function deleteDailyEntry(id: number): Promise<void> {
  // Получаем ID добавок перед удалением, чтобы обновить их статистику
  const supplementsInEntry = await db
    .select({ supplementId: supplementsTaken.supplementId })
    .from(supplementsTaken)
    .where(eq(supplementsTaken.entryId, id));

  const supplementIds = supplementsInEntry.map((s) => s.supplementId);

  await db.delete(dailyEntries).where(eq(dailyEntries.id, id));

  if (supplementIds.length > 0) {
    await updateSupplementRatings(supplementIds);
  }
}
