import { cache } from "react";
import { and, asc, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { boardColumns, projectMembers, projects, stories, users } from "@/infrastructure/db/schema";
import type { ProjectsRepo } from "@/application/ports";
import type { ProjectDto, ProjectMemberDto } from "@/domain/types";

const DEFAULT_COLUMNS = ["TO DO", "IN PROGRESS", "DONE"];

const dtoColumns = {
  id: projects.id,
  name: projects.name,
  ownerId: projects.ownerId,
  publicToken: projects.publicToken,
  repoUrl: projects.repoUrl,
  deletedAt: projects.deletedAt,
};

function seedColumns(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], projectId: string) {
  return tx.insert(boardColumns).values(
    DEFAULT_COLUMNS.map((name, position) => ({
      id: crypto.randomUUID(),
      projectId,
      name,
      position,
      isDone: name === "DONE",
    })),
  );
}

/** Dedupe identical calls within the same request — several guards/actions on
 * the same page often look up the same project (see guards.ts). */
const findByIdCached = cache(async (id: string): Promise<ProjectDto | null> => {
  const rows = await db
    .select(dtoColumns)
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
});

const isMemberCached = cache(async (projectId: string, userId: string): Promise<boolean> => {
  const rows = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
});

export const projectsRepo: ProjectsRepo = {
  async listForUser(userId: string): Promise<ProjectDto[]> {
    return db
      .select({
        ...dtoColumns,
        memberCount:
          sql<number>`(select count(*) from project_members pm where pm.project_id = ${projects.id})`.mapWith(
            Number,
          ),
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(and(eq(projectMembers.userId, userId), isNull(projects.deletedAt)))
      .orderBy(asc(projects.name));
  },

  /** Every non-deleted project, regardless of membership — this deployment
   * gives every logged-in user full visibility into all projects. */
  async listAll(): Promise<ProjectDto[]> {
    return db
      .select({
        ...dtoColumns,
        memberCount:
          sql<number>`(select count(*) from project_members pm where pm.project_id = ${projects.id})`.mapWith(
            Number,
          ),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(asc(projects.name));
  },

  async listTrashForUser(userId: string): Promise<ProjectDto[]> {
    return db
      .select(dtoColumns)
      .from(projects)
      .where(and(eq(projects.ownerId, userId), isNotNull(projects.deletedAt)))
      .orderBy(asc(projects.name));
  },

  findById: findByIdCached,

  async createdAt(id) {
    const [row] = await db
      .select({ createdAt: projects.createdAt })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return row?.createdAt ?? null;
  },

  async findByIdIncludingDeleted(id: string): Promise<ProjectDto | null> {
    const rows = await db.select(dtoColumns).from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByPublicToken(token: string): Promise<ProjectDto | null> {
    const rows = await db
      .select(dtoColumns)
      .from(projects)
      .where(and(eq(projects.publicToken, token), isNull(projects.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  async setPublicToken(projectId: string, token: string | null): Promise<void> {
    await db.update(projects).set({ publicToken: token }).where(eq(projects.id, projectId));
  },

  async setRepoUrl(projectId: string, url: string | null): Promise<void> {
    await db.update(projects).set({ repoUrl: url }).where(eq(projects.id, projectId));
  },

  async create(ownerId: string, name: string): Promise<ProjectDto> {
    const projectId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({ id: projectId, name, ownerId });
      await seedColumns(tx, projectId);
      await tx.insert(projectMembers).values({ projectId, userId: ownerId });
    });
    return {
      id: projectId,
      name,
      ownerId,
      publicToken: null,
      repoUrl: null,
      deletedAt: null,
    };
  },

  async softDelete(id: string): Promise<void> {
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)));
  },

  async restore(id: string, ownerId: string): Promise<boolean> {
    const [result] = await db
      .update(projects)
      .set({ deletedAt: null })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId), isNotNull(projects.deletedAt)));
    return result.affectedRows > 0;
  },

  async permanentDelete(id: string, ownerId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId), isNotNull(projects.deletedAt)))
        .for("update");
      if (!target) return false;
      // Stories first: a single DELETE on projects reaches stories through two
      // cascade paths (project_id CASCADE and board_columns → column_id SET NULL),
      // and MySQL rejects the SET NULL update on a row whose project is already
      // gone (errno 1452). Stories cascade into story_tasks/comments; everything
      // else (columns, sprints, retro items, members, events) cascades from projects.
      await tx.delete(stories).where(eq(stories.projectId, id));
      await tx.delete(projects).where(eq(projects.id, id));
      return true;
    });
  },

  async transferOwnership(id: string, newOwnerId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(projects).set({ ownerId: newOwnerId }).where(eq(projects.id, id));
      const existing = await tx
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, newOwnerId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(projectMembers).values({ projectId: id, userId: newOwnerId });
      }
    });
  },

  async countOwnedByUser(userId: string): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(projects)
      // Trashed projects count too — their owner FK still blocks deleting the account.
      .where(eq(projects.ownerId, userId));
    return row?.n ?? 0;
  },

  async members(projectId: string): Promise<ProjectMemberDto[]> {
    return db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(users.lastName), asc(users.firstName));
  },

  async membersForExport(projectId) {
    const rows = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.joinedAt), asc(projectMembers.userId));

    return rows.map((row) => ({
      ...row,
      joinedAt: row.joinedAt.toISOString(),
      isOwner: false,
    }));
  },

  isMember: isMemberCached,

  async addMember(projectId: string, userId: string): Promise<boolean> {
    // INSERT IGNORE: the (project_id, user_id) primary key makes a double submit a no-op.
    const [result] = await db.insert(projectMembers).ignore().values({ projectId, userId });
    return result.affectedRows > 0;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  },
};
