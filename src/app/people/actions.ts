"use server";

import { loadPersonRecord, type PersonRecordModel } from "@/lib/person-record";

export async function getPersonRecord(id: string): Promise<PersonRecordModel | null> {
  return loadPersonRecord(id);
}
