import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const dailyEntries = sqliteTable("daily_entries", {
  id: integer().primaryKey().notNull(),
  date: integer().notNull(),
  rating: integer().notNull(),
  notes: text(),
  createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const supplements = sqliteTable("supplements", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  averageRating: integer("average_rating"),
  createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  hidden: integer().default(0).notNull(),
});

export const supplementsTaken = sqliteTable("supplements_taken", {
  id: integer().primaryKey().notNull(),
  supplementId: integer("supplement_id").references(() => supplements.id),
  entryId: integer("entry_id").references(() => dailyEntries.id),
});

export const tags = sqliteTable("tags", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const supplementTags = sqliteTable("supplement_tags", {
  supplementId: integer("supplement_id")
    .notNull()
    .references(() => supplements.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});
