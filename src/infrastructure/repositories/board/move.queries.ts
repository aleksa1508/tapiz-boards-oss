import { and, asc, eq, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { projects, stories } from "@/infrastructure/db/schema";
import type { StoryOrderScope } from "@/application/ports";

/** Drizzle transaction handle (same API as `db`, scoped to the transaction). */
export type MySqlTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Row lock on the project — serializes every ordering/sprint-state write of one
 * project (story moves, sprint start/finish, column create/delete), so two
 * users dragging cards on the same board can't interleave their renumbering.
 * Always taken first in those transactions, which keeps lock order consistent.
 */
export async function lockProject(tx: MySqlTx, projectId: string): Promise<void> {
  await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for("update");
}

/** Deterministic story order used by every list query (position, then age, then id). */
export const storyOrder = [asc(stories.position), asc(stories.createdAt), asc(stories.id)] as const;

export async function nextStoryPosition(
  projectId: string,
  columnId: string | null,
): Promise<number> {
  const rows = await db
    .select({ max: sql<number | null>`max(${stories.position})` })
    .from(stories)
    .where(
      and(
        eq(stories.projectId, projectId),
        columnId === null ? isNull(stories.columnId) : eq(stories.columnId, columnId),
      ),
    );
  const max = rows[0]?.max;
  return max === null || max === undefined ? 0 : Number(max) + 1;
}

/**
 * The list the user actually sees and drops into. `position` is shared by every
 * story in a column across sprints, so the index the client sends is only
 * meaningful relative to this subset (a board column shows only the active
 * sprint; the backlog shows everything outside it).
 */
function scopeFilter(projectId: string, scope: StoryOrderScope): SQL | undefined {
  if (scope.kind === "column") {
    return and(
      eq(stories.projectId, projectId),
      eq(stories.columnId, scope.columnId),
      eq(stories.sprintId, scope.sprintId),
    );
  }
  if (scope.activeSprintId === null) return eq(stories.projectId, projectId);
  return and(
    eq(stories.projectId, projectId),
    or(isNull(stories.sprintId), ne(stories.sprintId, scope.activeSprintId)),
  );
}

/**
 * Places a story at `toIndex` within `scope` and renumbers that list to 0..n-1.
 * Only rows whose position actually changes are written, in one UPDATE.
 */
export async function moveStory(input: {
  projectId: string;
  storyId: string;
  columnId: string | null;
  sprintId: string | null;
  toIndex: number;
  scope: StoryOrderScope;
}): Promise<void> {
  const { projectId, storyId } = input;
  await db.transaction(async (tx) => {
    await lockProject(tx, projectId);
    await tx
      .update(stories)
      .set({ columnId: input.columnId, sprintId: input.sprintId })
      .where(and(eq(stories.id, storyId), eq(stories.projectId, projectId)));

    const siblings = await tx
      .select({ id: stories.id, position: stories.position })
      .from(stories)
      .where(and(scopeFilter(projectId, input.scope), ne(stories.id, storyId)))
      .orderBy(...storyOrder);

    const ordered = siblings.map((row) => row.id);
    ordered.splice(Math.min(input.toIndex, ordered.length), 0, storyId);
    const current = new Map(siblings.map((row) => [row.id, row.position]));
    const changed = ordered
      .map((id, position) => ({ id, position }))
      .filter(({ id, position }) => id === storyId || current.get(id) !== position);

    await tx
      .update(stories)
      .set({
        position: sql`case ${stories.id} ${sql.join(
          changed.map(({ id, position }) => sql`when ${id} then ${position}`),
          sql` `,
        )} end`,
      })
      .where(inArray(stories.id, changed.map(({ id }) => id)));
  });
}
