import { relations } from "drizzle-orm/relations";
import {
  dailyEntries,
  supplementsTaken,
  supplements,
  tags,
  supplementTags,
} from "./schema";

export const supplementsTakenRelations = relations(
  supplementsTaken,
  ({ one }) => ({
    dailyEntry: one(dailyEntries, {
      fields: [supplementsTaken.entryId],
      references: [dailyEntries.id],
    }),
    supplement: one(supplements, {
      fields: [supplementsTaken.supplementId],
      references: [supplements.id],
    }),
  })
);

export const dailyEntriesRelations = relations(dailyEntries, ({ many }) => ({
  supplementsTakens: many(supplementsTaken),
}));

export const supplementsRelations = relations(supplements, ({ many }) => ({
  supplementsTakens: many(supplementsTaken),
  supplementTags: many(supplementTags),
}));

export const supplementTagsRelations = relations(supplementTags, ({ one }) => ({
  tag: one(tags, {
    fields: [supplementTags.tagId],
    references: [tags.id],
  }),
  supplement: one(supplements, {
    fields: [supplementTags.supplementId],
    references: [supplements.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  supplementTags: many(supplementTags),
}));
