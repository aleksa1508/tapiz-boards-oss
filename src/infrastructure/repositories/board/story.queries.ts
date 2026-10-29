import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/infrastructure/db/client";
import {
  boardColumns,
  comments,
  sprints,
  stories,
  storyTasks,
  projects,
  users,
} from "@/infrastructure/db/schema";
import type {
  BoardColumnWithStories,
  MyWorkItem,
  ProjectExportComment,
  ProjectExportStory,
  ProjectExportTask,
  StoryDto,
} from "@/domain/types";
import { getColumns } from "./column.queries";
import { storyOrder } from "./move.queries";

const assignees = alias(users, "assignees");
const ownProjects = alias(projects, "own_projects");
const exportAuthors = alias(users, "export_authors");
const exportAssignees = alias(users, "export_assignees");

export const storyColumns = {
  id: stories.id,
  projectId: stories.projectId,
  columnId: stories.columnId,
  sprintId: stories.sprintId,
  sprintName: sprints.name,
  title: stories.title,
  description: stories.description,
  position: stories.position,
  authorId: stories.authorId,
  authorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${stories.authorName}, ''), '')`,
  authorEmail: sql<string>`coalesce(${users.email}, nullif(${stories.authorEmail}, ''), '')`,
  assigneeId: stories.assigneeId,
  assigneeName: sql<
    string | null
  >`if(${assignees.id} is null, null, concat(${assignees.firstName}, ' ', ${assignees.lastName}))`,
  storyPoints: stories.storyPoints,
  priority: stories.priority,
  dueDate: stories.dueDate,
  commentCount: sql<number>`(select count(*) from ${comments} where ${comments.storyId} = ${stories.id})`.mapWith(Number),
  taskCount: sql<number>`(select count(*) from ${storyTasks} where ${storyTasks.storyId} = ${stories.id})`.mapWith(Number),
  tasksDone: sql<number>`(select count(*) from ${storyTasks} where ${storyTasks.storyId} = ${stories.id} and ${storyTasks.done} = true)`.mapWith(Number),
  createdAt: sql<string>`date_format(${stories.createdAt}, '%d.%m.%Y.')`,
};

export function storySelect() {
  return db
    .select(storyColumns)
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .leftJoin(assignees, eq(assignees.id, stories.assigneeId))
    .leftJoin(sprints, eq(sprints.id, stories.sprintId));
}

/** Board columns with the stories of one sprint (the active one), grouped in a single pass. */
export async function getBoardWithStories(
  projectId: string,
  sprintId: string,
): Promise<BoardColumnWithStories[]> {
  const [cols, sprintStories] = await Promise.all([
    getColumns(projectId),
    storySelect()
      .where(and(eq(stories.projectId, projectId), eq(stories.sprintId, sprintId)))
      .orderBy(...storyOrder),
  ]);
  const byColumn = new Map<string, StoryDto[]>(cols.map((col) => [col.id, []]));
  for (const story of sprintStories) {
    if (story.columnId !== null) byColumn.get(story.columnId)?.push(story);
  }
  return cols.map((col) => ({ ...col, stories: byColumn.get(col.id) ?? [] }));
}

/** Backlog = every story outside the active sprint (all stories when none is active). */
export async function getBacklogStories(
  projectId: string,
  activeSprintId: string | null,
): Promise<StoryDto[]> {
  return storySelect()
    .where(
      activeSprintId === null
        ? eq(stories.projectId, projectId)
        : and(
            eq(stories.projectId, projectId),
            or(isNull(stories.sprintId), ne(stories.sprintId, activeSprintId)),
          ),
    )
    .orderBy(...storyOrder);
}

export async function getStoryById(id: string): Promise<StoryDto | null> {
  const rows = await storySelect().where(eq(stories.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Batch variant: one query for all sprints (avoids N queries per sprint on the sprints page). */
export async function getStoriesBySprints(
  sprintIds: string[],
): Promise<Record<string, StoryDto[]>> {
  const byId: Record<string, StoryDto[]> = {};
  if (sprintIds.length === 0) return byId;
  const rows = await storySelect()
    .where(inArray(stories.sprintId, sprintIds))
    .orderBy(...storyOrder);
  for (const row of rows) {
    if (row.sprintId === null) continue;
    (byId[row.sprintId] ??= []).push(row);
  }
  return byId;
}

export async function getStoriesForExport(projectId: string): Promise<ProjectExportStory[]> {
  const rows = await db
    .select({
      id: stories.id,
      projectId: stories.projectId,
      columnId: stories.columnId,
      columnName: boardColumns.name,
      sprintId: stories.sprintId,
      sprintName: sprints.name,
      title: stories.title,
      description: stories.description,
      position: stories.position,
      authorId: stories.authorId,
      authorName: sql<string>`coalesce(concat(${exportAuthors.firstName}, ' ', ${exportAuthors.lastName}), nullif(${stories.authorName}, ''), '')`,
      authorEmail: sql<string>`coalesce(${exportAuthors.email}, nullif(${stories.authorEmail}, ''), '')`,
      assigneeId: stories.assigneeId,
      assigneeName: sql<string | null>`if(${exportAssignees.id} is null, null, concat(${exportAssignees.firstName}, ' ', ${exportAssignees.lastName}))`,
      assigneeEmail: exportAssignees.email,
      storyPoints: stories.storyPoints,
      priority: stories.priority,
      dueDate: stories.dueDate,
      createdAt: stories.createdAt,
      updatedAt: stories.updatedAt,
    })
    .from(stories)
    .leftJoin(exportAuthors, eq(exportAuthors.id, stories.authorId))
    .leftJoin(exportAssignees, eq(exportAssignees.id, stories.assigneeId))
    .leftJoin(boardColumns, eq(boardColumns.id, stories.columnId))
    .leftJoin(sprints, eq(sprints.id, stories.sprintId))
    .where(eq(stories.projectId, projectId))
    .orderBy(asc(stories.createdAt), asc(stories.id));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getTasksForStories(storyIds: string[]): Promise<ProjectExportTask[]> {
  if (storyIds.length === 0) return [];
  const rows = await db
    .select({
      id: storyTasks.id,
      storyId: storyTasks.storyId,
      title: storyTasks.title,
      done: storyTasks.done,
      position: storyTasks.position,
      createdAt: storyTasks.createdAt,
    })
    .from(storyTasks)
    .where(inArray(storyTasks.storyId, storyIds))
    .orderBy(asc(storyTasks.storyId), asc(storyTasks.position), asc(storyTasks.id));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getCommentsForStoriesExport(storyIds: string[]): Promise<ProjectExportComment[]> {
  if (storyIds.length === 0) return [];
  const authors = alias(users, "export_comment_authors");
  const rows = await db
    .select({
      id: comments.id,
      storyId: comments.storyId,
      authorId: comments.authorId,
      authorName: sql<string>`coalesce(concat(${authors.firstName}, ' ', ${authors.lastName}), nullif(${comments.authorName}, ''), '')`,
      authorEmail: sql<string>`coalesce(${authors.email}, nullif(${comments.authorEmail}, ''), '')`,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(authors, eq(authors.id, comments.authorId))
    .where(inArray(comments.storyId, storyIds))
    .orderBy(asc(comments.createdAt), asc(comments.id));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/** All stories assigned to the user, across all their projects — for "My Work". */
export async function getStoriesAssignedToUser(userId: string): Promise<MyWorkItem[]> {
  return db
    .select({
      ...storyColumns,
      projectName: ownProjects.name,
      columnName: sql<string | null>`${boardColumns.name}`,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .leftJoin(assignees, eq(assignees.id, stories.assigneeId))
    .leftJoin(sprints, eq(sprints.id, stories.sprintId))
    .innerJoin(ownProjects, eq(ownProjects.id, stories.projectId))
    .leftJoin(boardColumns, eq(boardColumns.id, stories.columnId))
    // Trashed projects aren't reachable, so their stories don't belong in My Work.
    .where(and(eq(stories.assigneeId, userId), isNull(ownProjects.deletedAt)))
    .orderBy(desc(stories.createdAt));
}

export async function createStory(input: {
  projectId: string;
  columnId: string | null;
  sprintId: string | null;
  title: string;
  description: string;
  position: number;
  authorId: string;
}): Promise<void> {
  const [author] = await db.select({
    authorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
    authorEmail: users.email,
  }).from(users).where(eq(users.id, input.authorId)).limit(1);
  if (!author) throw new Error("Autor story-ja nije pronađen");
  await db.insert(stories).values({ ...input, ...author });
}

/** Every editable story field, written in one statement after the service validated it. */
export async function updateStory(
  id: string,
  input: {
    title: string;
    description: string;
    assigneeId: string | null;
    storyPoints: number | null;
    sprintId: string | null;
    columnId: string | null;
    priority: StoryDto["priority"];
    dueDate: string | null;
    /** Set only when the story changes column (appended to the end of the new one). */
    position?: number;
  },
): Promise<void> {
  await db.update(stories).set(input).where(eq(stories.id, id));
}

export async function removeStory(id: string): Promise<void> {
  await db.delete(stories).where(eq(stories.id, id));
}
