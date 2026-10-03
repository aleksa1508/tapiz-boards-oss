import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { boardColumns, sprints, stories } from "@/infrastructure/db/schema";
import type { BoardColumnDto } from "@/domain/types";
import { lockProject } from "./move.queries";

export async function getColumns(projectId: string): Promise<BoardColumnDto[]> {
  return db
    .select()
    .from(boardColumns)
    .where(eq(boardColumns.projectId, projectId))
    .orderBy(asc(boardColumns.position), asc(boardColumns.id));
}

export async function getColumnById(id: string): Promise<BoardColumnDto | null> {
  const rows = await db.select().from(boardColumns).where(eq(boardColumns.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Appends a column after the current last one. Uses max(position)+1 rather than
 * the column count (which collides after a deletion) under the project lock.
 */
export async function createColumn(projectId: string, name: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockProject(tx, projectId);
    const rows = await tx
      .select({ max: sql<number | null>`max(${boardColumns.position})` })
      .from(boardColumns)
      .where(eq(boardColumns.projectId, projectId));
    const max = rows[0]?.max;
    const position = max === null || max === undefined ? 0 : Number(max) + 1;
    await tx.insert(boardColumns).values({ projectId, name, position });
  });
}

export async function renameColumn(id: string, name: string): Promise<void> {
  await db.update(boardColumns).set({ name }).where(eq(boardColumns.id, id));
}

export async function setColumnWipLimit(id: string, wipLimit: number | null): Promise<void> {
  await db.update(boardColumns).set({ wipLimit }).where(eq(boardColumns.id, id));
}

/**
 * Marks a column as "Done". Exactly one column per project may be Done, so
 * setting it clears the flag on all other columns of the project in the same
 * transaction. Unsetting (isDone=false) only clears the flag on the given column.
 */
export async function setColumnDone(projectId: string, id: string, isDone: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    if (isDone) {
      await tx.update(boardColumns).set({ isDone: false }).where(eq(boardColumns.projectId, projectId));
    }
    await tx.update(boardColumns).set({ isDone }).where(eq(boardColumns.id, id));
  });
}

/**
 * Deletes a column; its stories go back to the backlog. Stories of the active
 * sprint also leave the sprint — otherwise they'd sit in the active sprint with
 * no column and show up neither on the board nor in the backlog.
 */
export async function removeColumn(projectId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockProject(tx, projectId);
    await tx
      .update(stories)
      .set({ sprintId: null })
      .where(
        and(
          eq(stories.columnId, id),
          sql`${stories.sprintId} in (select ${sprints.id} from ${sprints} where ${sprints.projectId} = ${projectId} and ${sprints.status} = 'active')`,
        ),
      );
    await tx.update(stories).set({ columnId: null }).where(eq(stories.columnId, id));
    await tx.delete(boardColumns).where(eq(boardColumns.id, id));
  });
}
