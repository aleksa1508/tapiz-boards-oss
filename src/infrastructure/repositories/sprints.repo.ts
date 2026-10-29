import { and, asc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/infrastructure/db/client";
import { sprintRetroItems, sprints, stories, users } from "@/infrastructure/db/schema";
import type { SprintsRepo } from "@/application/ports";
import { lockProject } from "./board/move.queries";
import type {
  RetroCategory,
  ProjectExportRetrospective,
  ProjectExportSprint,
  SprintDto,
  SprintRetroItemDto,
  SprintStatus,
} from "@/domain/types";

const sprintColumns = {
  id: sprints.id,
  projectId: sprints.projectId,
  name: sprints.name,
  goal: sprints.goal,
  startDate: sprints.startDate,
  endDate: sprints.endDate,
  status: sprints.status,
  storyCount: sql<number>`(select count(*) from ${stories} where ${stories.sprintId} = ${sprints.id})`.mapWith(Number),
  totalPoints: sql<number>`(select coalesce(sum(${stories.storyPoints}), 0) from ${stories} where ${stories.sprintId} = ${sprints.id})`.mapWith(Number),
  retroCount: sql<number>`(select count(*) from ${sprintRetroItems} where ${sprintRetroItems.sprintId} = ${sprints.id})`.mapWith(Number),
};

const retroItemColumns = {
  id: sprintRetroItems.id,
  sprintId: sprintRetroItems.sprintId,
  category: sprintRetroItems.category,
  body: sprintRetroItems.body,
  authorId: sprintRetroItems.authorId,
  authorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${sprintRetroItems.authorName}, ''), '')`,
  authorEmail: sql<string>`coalesce(${users.email}, nullif(${sprintRetroItems.authorEmail}, ''), '')`,
  createdAt: sql<string>`date_format(${sprintRetroItems.createdAt}, '%d.%m.%Y.')`,
};
const exportRetroAuthors = alias(users, "export_retro_authors");

export const sprintsRepo: SprintsRepo = {
  async listForExport(projectId): Promise<ProjectExportSprint[]> {
    const rows = await db
      .select({
        id: sprints.id,
        projectId: sprints.projectId,
        name: sprints.name,
        goal: sprints.goal,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
        createdAt: sprints.createdAt,
        storyCount: sql<number>`(select count(*) from ${stories} where ${stories.sprintId} = ${sprints.id})`.mapWith(Number),
        totalPoints: sql<number>`(select coalesce(sum(${stories.storyPoints}), 0) from ${stories} where ${stories.sprintId} = ${sprints.id})`.mapWith(Number),
      })
      .from(sprints)
      .where(eq(sprints.projectId, projectId))
      .orderBy(asc(sprints.createdAt), asc(sprints.startDate), asc(sprints.id));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },

  async listByProject(projectId: string): Promise<SprintDto[]> {
    return db
      .select(sprintColumns)
      .from(sprints)
      .where(eq(sprints.projectId, projectId))
      .orderBy(asc(sprints.createdAt), asc(sprints.startDate), asc(sprints.id));
  },

  async findActiveByProject(projectId: string): Promise<SprintDto | null> {
    const rows = await db
      .select(sprintColumns)
      .from(sprints)
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, "active")))
      .limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<SprintDto | null> {
    const rows = await db.select(sprintColumns).from(sprints).where(eq(sprints.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(input): Promise<void> {
    await db.insert(sprints).values({
      projectId: input.projectId,
      name: input.name,
      goal: input.goal || null,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },

  async setStatus(id: string, status: SprintStatus): Promise<void> {
    await db.update(sprints).set({ status }).where(eq(sprints.id, id));
  },

  async activate(projectId, sprintId, firstColumnId) {
    return db.transaction(async (tx) => {
      // The "one active sprint per project" check and the status write must be
      // atomic, or two concurrent starts both pass the check.
      await lockProject(tx, projectId);
      const [target] = await tx
        .select({ status: sprints.status })
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)))
        .limit(1);
      if (!target) return "missing";
      if (target.status === "completed") return "completed";
      const otherActive = await tx
        .select({ id: sprints.id })
        .from(sprints)
        .where(and(eq(sprints.projectId, projectId), eq(sprints.status, "active"), ne(sprints.id, sprintId)))
        .limit(1);
      if (otherActive.length > 0) return "conflict";
      if (firstColumnId !== null) {
        // Sprint stories not yet on the board land in the first column (one UPDATE).
        await tx
          .update(stories)
          .set({ columnId: firstColumnId })
          .where(and(eq(stories.sprintId, sprintId), isNull(stories.columnId)));
      }
      await tx.update(sprints).set({ status: "active" }).where(eq(sprints.id, sprintId));
      return "ok";
    });
  },

  async undoStart(projectId, sprintId) {
    return db.transaction(async (tx) => {
      await lockProject(tx, projectId);
      const [target] = await tx.select({ status: sprints.status }).from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId))).limit(1);
      if (!target) return "missing";
      if (target.status !== "active") return "not-active";
      // Do not reset story columns: work may have changed since sprint start.
      // Planned sprint stories are visible in backlog without deleting data.
      await tx.update(sprints).set({ status: "planned" }).where(eq(sprints.id, sprintId));
      return "ok";
    });
  },

  async complete(projectId, sprintId, doneColumnId, targetSprintId) {
    return db.transaction(async (tx) => {
      await lockProject(tx, projectId);
      // Conditional transition: a second, concurrent finish matches no row.
      const [result] = await tx
        .update(sprints)
        .set({ status: "completed" })
        .where(and(eq(sprints.id, sprintId), eq(sprints.status, "active")));
      if (result.affectedRows === 0) return null;
      // Unfinished = not in the Done column, decided inside the transaction so a
      // card dragged to Done a moment earlier isn't carried over.
      const unfinished = and(
        eq(stories.sprintId, sprintId),
        doneColumnId === null
          ? undefined
          : or(isNull(stories.columnId), ne(stories.columnId, doneColumnId)),
      );
      const [moved] = await tx
        .update(stories)
        .set(
          targetSprintId === null
            ? { sprintId: null, columnId: null }
            : { sprintId: targetSprintId },
        )
        .where(unfinished);
      return moved.affectedRows;
    });
  },

  async remove(id: string, status: SprintStatus): Promise<void> {
    await db.transaction(async (tx) => {
      // Stories of a planned/active sprint return to the backlog without a
      // column; completed sprints keep their finished stories where they are.
      // The FK (on delete set null) then detaches them from the sprint.
      if (status !== "completed") {
        await tx.update(stories).set({ columnId: null }).where(eq(stories.sprintId, id));
      }
      await tx.delete(sprints).where(eq(sprints.id, id));
    });
  },

  async retroItems(sprintId: string): Promise<SprintRetroItemDto[]> {
    return db
      .select(retroItemColumns)
      .from(sprintRetroItems)
      .leftJoin(users, eq(users.id, sprintRetroItems.authorId))
      .where(eq(sprintRetroItems.sprintId, sprintId))
      .orderBy(asc(sprintRetroItems.createdAt), asc(sprintRetroItems.id));
  },

  async retroItemsForSprintsExport(sprintIds: string[]): Promise<ProjectExportRetrospective[]> {
    if (sprintIds.length === 0) return [];
    const rows = await db
      .select({
        id: sprintRetroItems.id,
        sprintId: sprintRetroItems.sprintId,
        authorId: sprintRetroItems.authorId,
        authorName: sql<string>`coalesce(concat(${exportRetroAuthors.firstName}, ' ', ${exportRetroAuthors.lastName}), nullif(${sprintRetroItems.authorName}, ''), '')`,
        authorEmail: sql<string>`coalesce(${exportRetroAuthors.email}, nullif(${sprintRetroItems.authorEmail}, ''), '')`,
        category: sprintRetroItems.category,
        body: sprintRetroItems.body,
        createdAt: sprintRetroItems.createdAt,
      })
      .from(sprintRetroItems)
      .leftJoin(exportRetroAuthors, eq(exportRetroAuthors.id, sprintRetroItems.authorId))
      .where(inArray(sprintRetroItems.sprintId, sprintIds))
      .orderBy(asc(sprintRetroItems.createdAt), asc(sprintRetroItems.id));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },

  async retroItemById(id: string): Promise<SprintRetroItemDto | null> {
    const rows = await db
      .select(retroItemColumns)
      .from(sprintRetroItems)
      .leftJoin(users, eq(users.id, sprintRetroItems.authorId))
      .where(eq(sprintRetroItems.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async addRetroItem(
    sprintId: string,
    authorId: string,
    category: RetroCategory,
    body: string,
  ): Promise<void> {
    const [author] = await db.select({
      authorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      authorEmail: users.email,
    }).from(users).where(eq(users.id, authorId)).limit(1);
    if (!author) throw new Error("Autor retrospektive nije pronađen");
    await db.insert(sprintRetroItems).values({ sprintId, authorId, ...author, category, body });
  },

  async removeRetroItem(id: string): Promise<void> {
    await db.delete(sprintRetroItems).where(eq(sprintRetroItems.id, id));
  },
};
