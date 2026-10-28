import type {
  ProjectExportRetrospective,
  ProjectExportSprint,
  RetroCategory,
  SprintDto,
  SprintRetroItemDto,
  SprintStatus,
} from "@/domain/types";

export interface SprintsRepo {
  listByProject(projectId: string): Promise<SprintDto[]>;
  listForExport(projectId: string): Promise<ProjectExportSprint[]>;
  retroItemsForSprintsExport(sprintIds: string[]): Promise<ProjectExportRetrospective[]>;
  findById(id: string): Promise<SprintDto | null>;
  findActiveByProject(projectId: string): Promise<SprintDto | null>;
  create(input: {
    projectId: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }): Promise<void>;
  setStatus(id: string, status: SprintStatus): Promise<void>;
  /** Safely revert a mistaken start while preserving all stories and columns. */
  undoStart(projectId: string, sprintId: string): Promise<"ok" | "missing" | "not-active">;
  /** Atomically starts a sprint unless another one is active; places its unplaced stories in `firstColumnId`. */
  activate(
    projectId: string,
    sprintId: string,
    firstColumnId: string | null,
  ): Promise<"ok" | "missing" | "completed" | "conflict">;
  /**
   * Atomically completes an active sprint and moves its unfinished stories to
   * `targetSprintId` (keeping their column) or to the backlog. Returns how many
   * stories moved, or null if the sprint was no longer active.
   */
  complete(
    projectId: string,
    sprintId: string,
    doneColumnId: string | null,
    targetSprintId: string | null,
  ): Promise<number | null>;
  remove(id: string, status: SprintStatus): Promise<void>;
  retroItems(sprintId: string): Promise<SprintRetroItemDto[]>;
  retroItemById(id: string): Promise<SprintRetroItemDto | null>;
  addRetroItem(
    sprintId: string,
    authorId: string,
    category: RetroCategory,
    body: string,
  ): Promise<void>;
  removeRetroItem(id: string): Promise<void>;
}
