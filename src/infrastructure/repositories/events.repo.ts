import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { stories, projectEvents, users } from "@/infrastructure/db/schema";
import type { EventsRepo } from "@/application/ports";
import type {
  ActivityDay,
  ProjectEventDto,
  ProjectEventType,
  ProjectExportActivity,
} from "@/domain/types";

/**
 * [start, end) bounds for whole days, as 'yyyy-mm-dd 00:00:00' literals compared
 * in the session time zone exactly like `date(created_at)` was — but sargable,
 * so the (project_id, created_at) index is used instead of scanning every event.
 */
function dayRange(fromIso: string, toIso: string) {
  const end = new Date(`${toIso}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return and(
    gte(projectEvents.createdAt, sql`${`${fromIso} 00:00:00`}`),
    lt(projectEvents.createdAt, sql`${`${end.toISOString().slice(0, 10)} 00:00:00`}`),
  );
}

export const eventsRepo: EventsRepo = {
  async add(
    projectId: string,
    actorId: string,
    type: ProjectEventType,
    detail: string,
    storyId: string | null = null,
  ): Promise<void> {
    const [actor] = await db.select({
      actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      actorEmail: users.email,
    }).from(users).where(eq(users.id, actorId)).limit(1);
    if (!actor) throw new Error("Autor aktivnosti nije pronađen");
    await db.insert(projectEvents).values({ projectId, actorId, ...actor, type, detail, storyId });
  },

  /** Retention: deletes events older than `cutoff`. Returns the number of rows deleted. */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const [result] = await db.delete(projectEvents).where(lt(projectEvents.createdAt, cutoff));
    return result.affectedRows;
  },

  async listByDay(projectId: string, dayIso: string): Promise<ProjectEventDto[]> {
    return db
      .select({
        id: projectEvents.id,
        type: projectEvents.type,
        actorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${projectEvents.actorName}, ''), '')`,
        storyId: projectEvents.storyId,
        detail: projectEvents.detail,
        time: sql<string>`date_format(${projectEvents.createdAt}, '%H:%i')`,
      })
      .from(projectEvents)
      .leftJoin(users, eq(users.id, projectEvents.actorId))
      .where(
        and(eq(projectEvents.projectId, projectId), dayRange(dayIso, dayIso)),
      )
      .orderBy(asc(projectEvents.createdAt), asc(projectEvents.id));
  },

  async daysInRange(projectId: string, fromIso: string, toIso: string): Promise<ActivityDay[]> {
    return db
      .select({
        day: sql<string>`date_format(${projectEvents.createdAt}, '%Y-%m-%d')`,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(projectEvents)
      .where(
        and(
          eq(projectEvents.projectId, projectId),
          dayRange(fromIso, toIso),
        ),
      )
      .groupBy(sql`date_format(${projectEvents.createdAt}, '%Y-%m-%d')`);
  },

  async dueStoriesByDay(projectId: string, dayIso: string): Promise<string[]> {
    const rows = await db
      .select({ title: stories.title })
      .from(stories)
      .where(and(eq(stories.projectId, projectId), eq(stories.dueDate, dayIso)))
      .orderBy(asc(stories.title));
    return rows.map((row) => row.title);
  },

  async listForExport(projectId): Promise<ProjectExportActivity[]> {
    const rows = await db
      .select({
        id: projectEvents.id,
        projectId: projectEvents.projectId,
        actorId: projectEvents.actorId,
        actorName: sql<string>`coalesce(concat(${users.firstName}, ' ', ${users.lastName}), nullif(${projectEvents.actorName}, ''), '')`,
        actorEmail: sql<string>`coalesce(${users.email}, nullif(${projectEvents.actorEmail}, ''), '')`,
        type: projectEvents.type,
        storyId: projectEvents.storyId,
        detail: projectEvents.detail,
        createdAt: projectEvents.createdAt,
      })
      .from(projectEvents)
      .leftJoin(users, eq(users.id, projectEvents.actorId))
      .where(eq(projectEvents.projectId, projectId))
      .orderBy(asc(projectEvents.createdAt), asc(projectEvents.id));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },
};
