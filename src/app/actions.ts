"use server";

import * as supplementsService from "@/services/supplements";
import * as entriesService from "@/services/entries";
import * as tagsService from "@/services/tags";
import { Supplement, Tag, DailyEntry } from "@/db/schema";

// Supplements
export async function addSupplement(
  name: string,
  description?: string,
  hidden: boolean = false,
  type: string = "regular"
): Promise<Supplement> {
  return supplementsService.addSupplement(name, description, hidden, type);
}

export async function updateSupplement(
  id: number,
  data: Partial<Supplement>
): Promise<Supplement> {
  return supplementsService.updateSupplement(id, data);
}

export async function deleteSupplement(id: number): Promise<void> {
  return supplementsService.deleteSupplement(id);
}

export async function getSupplements(
  filterHidden: boolean = false
): Promise<Supplement[]> {
  return supplementsService.getSupplements(filterHidden);
}

export async function toggleSupplementVisibility(
  id: number
): Promise<Supplement> {
  return supplementsService.toggleSupplementVisibility(id);
}

export async function hideSupplement(id: number): Promise<Supplement> {
  return supplementsService.hideSupplement(id);
}

export async function getSupplementRatings(
  supplementId: number
): Promise<{ date: number; rating: number }[]> {
  return supplementsService.getSupplementRatings(supplementId);
}

export async function updateSupplementTags(
  supplementId: number,
  tagIds: number[]
): Promise<void> {
  return supplementsService.updateSupplementTags(supplementId, tagIds);
}

// Daily Entries
export async function addDailyEntry(data: {
  dateTs: number;
  rating: number;
  notes: string;
  supplementIds: number[];
}): Promise<DailyEntry> {
  return entriesService.addDailyEntry(data);
}

export async function updateDailyEntry(
  entryId: number,
  data: {
    rating?: number;
    notes?: string;
    supplementIds?: number[];
  }
): Promise<DailyEntry> {
  return entriesService.updateDailyEntry(entryId, data);
}

export async function getDailyEntry(
  entryId: number
): Promise<DailyEntry | null> {
  return entriesService.getDailyEntry(entryId);
}

export async function getDailyEntries(): Promise<DailyEntry[]> {
  return entriesService.getDailyEntries();
}

export async function deleteDailyEntry(id: number): Promise<void> {
  return entriesService.deleteDailyEntry(id);
}

// Tags
export async function getTags(): Promise<Tag[]> {
  return tagsService.getTags();
}

export async function addTag(name: string): Promise<Tag> {
  return tagsService.addTag(name);
}

export async function deleteTag(id: number): Promise<void> {
  return tagsService.deleteTag(id);
}
