import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { comments, storyTasks, users } from "@/infrastructure/db/schema";

type PublicDetails = {
  tasks: { id: string; title: string; done: boolean }[];
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
};

/** Fetch tasks and comments in two bounded queries, not one query per story. */
export async function getPublicStoryDetails(storyIds: string[]): Promise<Record<string, PublicDetails>> {
  const result: Record<string, PublicDetails> = {};
  for (const id of storyIds) result[id] = { tasks: [], comments: [] };
  if (storyIds.length === 0) return result;

  const [tasks, notes] = await Promise.all([
    db.select({
      id: storyTasks.id,
      storyId: storyTasks.storyId,
      title: storyTasks.title,
      done: storyTasks.done,
    }).from(storyTasks)
      .where(inArray(storyTasks.storyId, storyIds))
      .orderBy(asc(storyTasks.position), asc(storyTasks.createdAt), asc(storyTasks.id)),
    db.select({
      id: comments.id,
      storyId: comments.storyId,
      authorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${comments.authorName}, ''), '')`,
      body: comments.body,
      createdAt: sql<string>`date_format(${comments.createdAt}, '%d.%m.%Y. %H:%i')`,
    }).from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(inArray(comments.storyId, storyIds))
      .orderBy(asc(comments.createdAt), asc(comments.id)),
  ]);

  for (const { storyId, ...task } of tasks) result[storyId]?.tasks.push(task);
  for (const { storyId, ...note } of notes) result[storyId]?.comments.push(note);
  return result;
}
