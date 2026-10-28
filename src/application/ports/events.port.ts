import type { ActivityDay, ProjectEventDto, ProjectEventType, ProjectExportActivity } from "@/domain/types";

export interface EventsRepo {
  add(
    projectId: string,
    actorId: string,
    type: ProjectEventType,
    detail: string,
    storyId?: string | null,
  ): Promise<void>;
  /** Retention: deletes events older than `cutoff`; returns the number deleted. */
  deleteOlderThan(cutoff: Date): Promise<number>;
  listByDay(projectId: string, dayIso: string): Promise<ProjectEventDto[]>;
  /** Days with activity in range [fromIso, toIso] — markers for the mini calendar. */
  daysInRange(projectId: string, fromIso: string, toIso: string): Promise<ActivityDay[]>;
  /** Titles of stories due on the selected day. */
  dueStoriesByDay(projectId: string, dayIso: string): Promise<string[]>;
  listForExport(projectId: string): Promise<ProjectExportActivity[]>;
}
