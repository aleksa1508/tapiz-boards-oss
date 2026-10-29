import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { comments, users } from "@/infrastructure/db/schema";
import type { CommentDto } from "@/domain/types";

const commentColumns = {
  id: comments.id,
  storyId: comments.storyId,
  authorId: comments.authorId,
  authorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${comments.authorName}, ''), '')`,
  authorEmail: sql<string>`coalesce(${users.email}, nullif(${comments.authorEmail}, ''), '')`,
  body: comments.body,
  createdAt: sql<string>`date_format(${comments.createdAt}, '%d.%m.%Y. %H:%i')`,
};

export async function getComments(storyId: string): Promise<CommentDto[]> {
  return db
    .select(commentColumns)
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.storyId, storyId))
    .orderBy(asc(comments.createdAt), asc(comments.id));
}

export async function getCommentById(id: string): Promise<CommentDto | null> {
  const rows = await db
    .select(commentColumns)
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addComment(
  storyId: string,
  authorId: string,
  body: string,
): Promise<CommentDto> {
  const id = crypto.randomUUID();
  const [author] = await db.select({
    authorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
    authorEmail: users.email,
  }).from(users).where(eq(users.id, authorId)).limit(1);
  if (!author) throw new Error("Autor komentara nije pronađen");
  await db.insert(comments).values({ id, storyId, authorId, ...author, body });
  const comment = await getCommentById(id);
  if (!comment) throw new Error("Komentar nije pronađen nakon kreiranja");
  return comment;
}

export async function removeComment(id: string): Promise<void> {
  await db.delete(comments).where(eq(comments.id, id));
}
