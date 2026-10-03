import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { storyTasks } from "@/infrastructure/db/schema";
import type { StoryTaskDto } from "@/domain/types";

const taskSelect = {
  id: storyTasks.id,
  storyId: storyTasks.storyId,
  title: storyTasks.title,
  done: storyTasks.done,
};

export async function getTasks(storyId: string): Promise<StoryTaskDto[]> {
  return db
    .select(taskSelect)
    .from(storyTasks)
    .where(eq(storyTasks.storyId, storyId))
    .orderBy(asc(storyTasks.position), asc(storyTasks.createdAt), asc(storyTasks.id));
}

export async function getTaskById(id: string): Promise<StoryTaskDto | null> {
  const rows = await db
    .select(taskSelect)
    .from(storyTasks)
    .where(eq(storyTasks.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addTask(storyId: string, title: string): Promise<void> {
  const rows = await db
    .select({ max: sql<number | null>`max(${storyTasks.position})` })
    .from(storyTasks)
    .where(eq(storyTasks.storyId, storyId));
  const max = rows[0]?.max;
  const position = max === null || max === undefined ? 0 : Number(max) + 1;
  await db.insert(storyTasks).values({ storyId, title, position });
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await db.update(storyTasks).set({ done }).where(eq(storyTasks.id, id));
}

export async function removeTask(id: string): Promise<void> {
  await db.delete(storyTasks).where(eq(storyTasks.id, id));
}
