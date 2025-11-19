import {
  integer,
  pgTable,
  serial,
  text,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  hidden: integer("hidden").notNull().default(0),
  average_rating: integer("average_rating"),
  rating_difference: real("rating_difference"),
});

export const supplementsRelations = relations(supplements, ({ many }) => ({
  tags: many(supplementTags),
  entries: many(supplementsTaken),
}));

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  supplements: many(supplementTags),
}));

export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  date: integer("date").notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes"),
});

export const dailyEntriesRelations = relations(dailyEntries, ({ many }) => ({
  supplements: many(supplementsTaken),
}));

export const supplementsTaken = pgTable(
  "supplements_taken",
  {
    supplementId: integer("supplement_id")
      .notNull()
      .references(() => supplements.id, { onDelete: "cascade" }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => dailyEntries.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey(table.supplementId, table.entryId),
    };
  }
);

export const supplementsTakenRelations = relations(
  supplementsTaken,
  ({ one }) => ({
    supplement: one(supplements, {
      fields: [supplementsTaken.supplementId],
      references: [supplements.id],
    }),
    entry: one(dailyEntries, {
      fields: [supplementsTaken.entryId],
      references: [dailyEntries.id],
    }),
  })
);

export const supplementTags = pgTable(
  "supplement_tags",
  {
    supplementId: integer("supplement_id")
      .notNull()
      .references(() => supplements.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey(table.supplementId, table.tagId),
    };
  }
);

export const supplementTagsRelations = relations(supplementTags, ({ one }) => ({
  supplement: one(supplements, {
    fields: [supplementTags.supplementId],
    references: [supplements.id],
  }),
  tag: one(tags, {
    fields: [supplementTags.tagId],
    references: [tags.id],
  }),
}));

export type Supplement = typeof supplements.$inferSelect & { tags: Tag[] };
export type Tag = typeof tags.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect & {
  supplements: { supplement: Supplement }[];
};

export type InsertSupplement = typeof supplements.$inferInsert;
export type InsertTag = typeof tags.$inferInsert;
export type InsertDailyEntry = typeof dailyEntries.$inferInsert;
export type InsertSupplementTaken = typeof supplementsTaken.$inferInsert;
export type InsertSupplementTag = typeof supplementTags.$inferInsert;
