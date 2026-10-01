"use server";

import { loadStoryRecord, type StoryRecordModel } from "@/lib/story-record";

export async function getStoryRecord(id: string): Promise<StoryRecordModel | null> {
  return loadStoryRecord(id);
}
