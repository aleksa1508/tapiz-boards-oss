import { desc, eq, inArray } from "drizzle-orm";
import type { ProjectImportData } from "@/domain/validation/project-import.schema";
import {
  boardColumns,
  comments,
  projectEvents,
  projectMembers,
  projects,
  sprintRetroItems,
  sprints,
  stories,
  storyTasks,
  users,
} from "@/infrastructure/db/schema";
import { db } from "@/infrastructure/db/client";

const INSERT_BATCH_SIZE = 250;

export interface ExistingProjectImport {
  importedAt: string | null;
}

export type ProjectImportResult =
  | { status: "imported"; projectId: string }
  | { status: "confirmation-required"; previousImport: ExistingProjectImport };

async function insertInBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    await insert(rows.slice(index, index + INSERT_BATCH_SIZE));
  }
}

export async function insertImportedProject(
  data: ProjectImportData,
  ownerId: string,
  sourceUserMappings: Record<string, string>,
  confirmDuplicate: boolean,
): Promise<ProjectImportResult> {
  const projectId = crypto.randomUUID();
  const columnIds = new Map(data.columns.map((item) => [item.id, crypto.randomUUID()]));
  const sprintIds = new Map(data.sprints.map((item) => [item.id, crypto.randomUUID()]));
  const storyIds = new Map(data.stories.map((item) => [item.id, crypto.randomUUID()]));
  const taskIds = new Map(data.tasks.map((item) => [item.id, crypto.randomUUID()]));
  const commentIds = new Map(data.comments.map((item) => [item.id, crypto.randomUUID()]));
  const retroIds = new Map(data.retrospectives.map((item) => [item.id, crypto.randomUUID()]));
  const activityIds = new Map(data.activities.map((item) => [item.id, crypto.randomUUID()]));
  const projectMemberSourceIds = new Set(data.members.map((member) => member.userId));
  const localUserId = (sourceId: string | null) =>
    sourceId === null ? null : sourceUserMappings[sourceId] ?? null;

  return db.transaction(async (tx): Promise<ProjectImportResult> => {
    const [previousImport] = await tx
      .select({ importedAt: projects.importedAt })
      .from(projects)
      .where(eq(projects.importedFromProjectId, data.project.id))
      .orderBy(desc(projects.importedAt))
      .limit(1)
      .for("update");
    if (previousImport && !confirmDuplicate) {
      return {
        status: "confirmation-required",
        previousImport: {
          importedAt: previousImport.importedAt?.toISOString() ?? null,
        },
      };
    }

    const mappedLocalIds = [...new Set(Object.values(sourceUserMappings))];
    if (mappedLocalIds.length > 0) {
      const localUsers = await tx
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(inArray(users.id, mappedLocalIds));
      if (localUsers.length !== mappedLocalIds.length || localUsers.some((user) => !user.isActive)) {
        throw new Error("Neki povezani korisnički nalozi ne postoje ili nisu aktivni.");
      }
    }

    await tx.insert(projects).values({
      id: projectId,
      name: data.project.name,
      ownerId,
      importedFromProjectId: data.project.id,
      importedAt: new Date(),
      repoUrl: data.project.githubRepo,
      createdAt: new Date(data.project.createdAt),
    });

    await tx.insert(projectMembers).values({ projectId, userId: ownerId });
    const memberJoinDates = new Map<string, Date>();
    for (const member of data.members) {
      const mappedId = localUserId(member.userId);
      if (!mappedId || mappedId === ownerId) continue;
      const joinedAt = new Date(member.joinedAt);
      const previous = memberJoinDates.get(mappedId);
      if (!previous || joinedAt < previous) memberJoinDates.set(mappedId, joinedAt);
    }
    const importedMembers = [...memberJoinDates].map(([userId, joinedAt]) => ({
      projectId,
      userId,
      joinedAt,
    }));
    await insertInBatches(importedMembers, async (batch) => {
      await tx.insert(projectMembers).values(batch);
    });

    const importedColumns = data.columns.map((column) => ({
      id: columnIds.get(column.id)!,
      projectId,
      name: column.name,
      position: column.position,
      wipLimit: column.wipLimit,
      isDone: column.isDone,
    }));
    await insertInBatches(importedColumns, async (batch) => {
      await tx.insert(boardColumns).values(batch);
    });

    const importedSprints = data.sprints.map((sprint) => ({
      id: sprintIds.get(sprint.id)!,
      projectId,
      name: sprint.name,
      goal: sprint.goal,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      status: sprint.status,
      createdAt: new Date(sprint.createdAt),
    }));
    await insertInBatches(importedSprints, async (batch) => {
      await tx.insert(sprints).values(batch);
    });

    const importedStories = data.stories.map((story) => ({
      id: storyIds.get(story.id)!,
      projectId,
      columnId: story.columnId ? columnIds.get(story.columnId)! : null,
      sprintId: story.sprintId ? sprintIds.get(story.sprintId)! : null,
      title: story.title,
      description: story.description,
      position: story.position,
      authorId: localUserId(story.authorId),
      authorName: story.authorName,
      authorEmail: story.authorEmail,
      assigneeId:
        story.assigneeId && projectMemberSourceIds.has(story.assigneeId)
          ? localUserId(story.assigneeId)
          : null,
      storyPoints: story.storyPoints,
      priority: story.priority,
      dueDate: story.dueDate,
      createdAt: new Date(story.createdAt),
      updatedAt: new Date(story.updatedAt),
    }));
    await insertInBatches(importedStories, async (batch) => {
      await tx.insert(stories).values(batch);
    });

    const importedTasks = data.tasks.map((task) => ({
      id: taskIds.get(task.id)!,
      storyId: storyIds.get(task.storyId)!,
      title: task.title,
      done: task.done,
      position: task.position,
      createdAt: new Date(task.createdAt),
    }));
    await insertInBatches(importedTasks, async (batch) => {
      await tx.insert(storyTasks).values(batch);
    });

    const importedComments = data.comments.map((comment) => ({
      id: commentIds.get(comment.id)!,
      storyId: storyIds.get(comment.storyId)!,
      authorId: localUserId(comment.authorId),
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      body: comment.body,
      createdAt: new Date(comment.createdAt),
    }));
    await insertInBatches(importedComments, async (batch) => {
      await tx.insert(comments).values(batch);
    });

    const importedRetrospectives = data.retrospectives.map((retro) => ({
      id: retroIds.get(retro.id)!,
      sprintId: sprintIds.get(retro.sprintId)!,
      authorId: localUserId(retro.authorId),
      authorName: retro.authorName,
      authorEmail: retro.authorEmail,
      category: retro.category,
      body: retro.body,
      createdAt: new Date(retro.createdAt),
    }));
    await insertInBatches(importedRetrospectives, async (batch) => {
      await tx.insert(sprintRetroItems).values(batch);
    });

    const importedActivities = data.activities.map((activity) => ({
      id: activityIds.get(activity.id)!,
      projectId,
      actorId: localUserId(activity.actorId),
      actorName: activity.actorName,
      actorEmail: activity.actorEmail,
      type: activity.type,
      storyId: activity.storyId ? storyIds.get(activity.storyId)! : null,
      detail: activity.detail,
      createdAt: new Date(activity.createdAt),
    }));
    await insertInBatches(importedActivities, async (batch) => {
      await tx.insert(projectEvents).values(batch);
    });
    return { status: "imported", projectId };
  });
}

export async function findExistingProjectImport(
  sourceProjectId: string,
): Promise<ExistingProjectImport | null> {
  const [previousImport] = await db
    .select({ importedAt: projects.importedAt })
    .from(projects)
    .where(eq(projects.importedFromProjectId, sourceProjectId))
    .orderBy(desc(projects.importedAt))
    .limit(1);
  return previousImport
    ? { importedAt: previousImport.importedAt?.toISOString() ?? null }
    : null;
}
