import type {
  MoveStoryInput,
  StoryDetailsInput,
  StoryInput,
} from "@/domain/validation/story.schema";
import type { StoryDto } from "@/domain/types";
import { boardRepo } from "@/infrastructure/repositories/board.repo";
import { getPublicStoryDetails } from "@/infrastructure/repositories/board/public.queries";
import { sprintsRepo } from "@/infrastructure/repositories/sprints.repo";
import { projectsRepo } from "@/infrastructure/repositories/projects.repo";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export const boardService = {
  async getBoard(projectId: string) {
    const activeSprint = await sprintsRepo.findActiveByProject(projectId);
    if (!activeSprint) {
      const columns = await boardRepo.columns(projectId);
      return columns.map((column) => ({ ...column, stories: [] }));
    }
    return boardRepo.boardWithStories(projectId, activeSprint.id);
  },

  async getBacklog(projectId: string) {
    const activeSprint = await sprintsRepo.findActiveByProject(projectId);
    return boardRepo.backlog(projectId, activeSprint?.id ?? null);
  },
  /** Resolve the active sprint once so public board/backlog use the same split. */
  async getPublicSnapshot(projectId: string) {
    const active = await sprintsRepo.findActiveByProject(projectId);
    const [columns, backlog] = await Promise.all([
      active
        ? boardRepo.boardWithStories(projectId, active.id)
        : boardRepo.columns(projectId).then((cols) => cols.map((col) => ({ ...col, stories: [] as StoryDto[] }))),
      boardRepo.backlog(projectId, active?.id ?? null),
    ]);
    return { columns, backlog };
  },
  getColumns: (projectId: string) => boardRepo.columns(projectId),
  getComments: (storyId: string) => boardRepo.comments(storyId),
  /** Public route calls this only after validating a project sharing token. */
  getPublicDetails: getPublicStoryDetails,

  /** "My Work" — all stories assigned to the user, across all projects. */
  myWork: (userId: string) => boardRepo.assignedToUser(userId),

  async getStory(storyId: string): Promise<ActionResult<StoryDto>> {
    const story = await boardRepo.storyById(storyId);
    if (!story) return fail("User story ne postoji");
    return ok(story);
  },

  /** Story lookup scoped to a project — a foreign story ID is reported as missing. */
  async getProjectStory(projectId: string, storyId: string): Promise<ActionResult<StoryDto>> {
    const story = await boardRepo.storyById(storyId);
    if (!story || story.projectId !== projectId) return fail("User story ne postoji");
    return ok(story);
  },

  async createColumn(projectId: string, name: string): Promise<ActionResult<void>> {
    await boardRepo.createColumn(projectId, name);
    return ok(undefined);
  },

  async renameColumn(projectId: string, columnId: string, name: string): Promise<ActionResult<void>> {
    const col = await boardRepo.columnById(columnId);
    if (!col || col.projectId !== projectId) return fail("Kolona ne postoji");
    await boardRepo.renameColumn(columnId, name);
    return ok(undefined);
  },

  async setColumnWipLimit(projectId: string, columnId: string, wipLimit: number | null): Promise<ActionResult<void>> {
    const col = await boardRepo.columnById(columnId);
    if (!col || col.projectId !== projectId) return fail("Kolona ne postoji");
    await boardRepo.setColumnWipLimit(columnId, wipLimit);
    return ok(undefined);
  },

  /** Sets/unsets the "Done" column; repo guarantees exactly one per project. */
  async setColumnDone(projectId: string, columnId: string, isDone: boolean): Promise<ActionResult<void>> {
    const col = await boardRepo.columnById(columnId);
    if (!col || col.projectId !== projectId) return fail("Kolona ne postoji");
    await boardRepo.setColumnDone(projectId, columnId, isDone);
    return ok(undefined);
  },

  /** Deleting a column sends its stories to the backlog (see repo). */
  async removeColumn(projectId: string, columnId: string): Promise<ActionResult<void>> {
    const col = await boardRepo.columnById(columnId);
    if (!col || col.projectId !== projectId) return fail("Kolona ne postoji");
    await boardRepo.removeColumn(projectId, columnId);
    return ok(undefined);
  },

  async createStory(
    projectId: string,
    authorId: string,
    input: StoryInput & { columnId?: string | null; sprintId?: string | null },
  ): Promise<ActionResult<void>> {
    let columnId = input.columnId ?? null;
    let sprintId = input.sprintId ?? null;
    const [activeSprint, columns] = await Promise.all([
      sprintsRepo.findActiveByProject(projectId),
      boardRepo.columns(projectId),
    ]);
    const firstColumnId = columns[0]?.id ?? null;

    if (columnId && sprintId === null) {
      if (!activeSprint) return fail("Pokrenite sprint pre dodavanja story-ja na board");
      sprintId = activeSprint.id;
    }
    if (sprintId && activeSprint?.id === sprintId && columnId === null) {
      columnId = firstColumnId;
    }
    if (columnId && !columns.some((col) => col.id === columnId)) return fail("Kolona ne postoji");
    if (sprintId) {
      const sprint = await sprintsRepo.findById(sprintId);
      if (!sprint || sprint.projectId !== projectId) return fail("Sprint ne postoji");
      if (sprint.status === "completed") return fail("Story ne može biti dodat u završen sprint");
    }
    const position = await boardRepo.nextStoryPosition(projectId, columnId);
    await boardRepo.createStory({
      projectId,
      columnId,
      sprintId,
      title: input.title,
      description: input.description,
      position,
      authorId,
    });
    return ok(undefined);
  },

  /**
   * Full save from StoryDetailPanel: validates every field first, then writes
   * title, description and details in a single UPDATE — a rejected sprint or
   * column can no longer leave a half-applied edit behind.
   */
  async updateStoryFull(
    projectId: string,
    story: StoryDto,
    titleDesc: StoryInput,
    details: StoryDetailsInput,
  ): Promise<ActionResult<void>> {
    if (story.projectId !== projectId) return fail("Story ne pripada ovom projektu");
    let sprintId = details.sprintId;
    let columnId = details.columnId;
    const [activeSprint, columns] = await Promise.all([
      sprintsRepo.findActiveByProject(projectId),
      boardRepo.columns(projectId),
    ]);

    if (columnId && sprintId === null) {
      if (!activeSprint) return fail("Pokrenite sprint pre prebacivanja story-ja na board");
      sprintId = activeSprint.id;
    }
    if (sprintId && activeSprint?.id === sprintId && columnId === null) {
      columnId = columns[0]?.id ?? null;
    }
    if (details.assigneeId) {
      const isMember = await projectsRepo.isMember(projectId, details.assigneeId);
      if (!isMember) return fail("Dodeljena osoba nije član projekta");
    }
    if (sprintId) {
      const sprint = await sprintsRepo.findById(sprintId);
      if (!sprint || sprint.projectId !== projectId) return fail("Sprint ne postoji");
      if (sprint.status === "completed" && sprint.id !== story.sprintId) {
        return fail("Story ne može biti premešten u završen sprint");
      }
    }
    if (columnId && !columns.some((col) => col.id === columnId)) return fail("Kolona ne postoji");

    // A column change appends the story to the end of its new column.
    const position =
      columnId !== story.columnId ? await boardRepo.nextStoryPosition(projectId, columnId) : undefined;
    await boardRepo.updateStory(story.id, {
      title: titleDesc.title,
      description: titleDesc.description,
      assigneeId: details.assigneeId,
      storyPoints: details.storyPoints,
      priority: details.priority,
      dueDate: details.dueDate,
      sprintId,
      columnId,
      position,
    });
    return ok(undefined);
  },

  removeStory: (storyId: string) => boardRepo.removeStory(storyId),

  /**
   * Drag & drop. `toIndex` is the drop index in the list the user sees: the
   * active sprint's stories of the target column, or the backlog. Moving onto the
   * board pulls the story into the active sprint; moving to the backlog takes it
   * out of the active sprint. Returns the story as it was before the move.
   */
  async moveStory(projectId: string, input: MoveStoryInput): Promise<ActionResult<StoryDto>> {
    const storyResult = await this.getProjectStory(projectId, input.storyId);
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    const activeSprint = await sprintsRepo.findActiveByProject(projectId);

    if (input.toColumnId !== null) {
      const col = await boardRepo.columnById(input.toColumnId);
      if (!col || col.projectId !== projectId) return fail("Kolona ne postoji");
      if (!activeSprint) return fail("Pokrenite sprint pre prebacivanja story-ja na board");
      await boardRepo.moveStory({
        projectId,
        storyId: story.id,
        columnId: col.id,
        sprintId: activeSprint.id,
        toIndex: input.toIndex,
        scope: { kind: "column", columnId: col.id, sprintId: activeSprint.id },
      });
      return ok(story);
    }

    const activeSprintId = activeSprint?.id ?? null;
    await boardRepo.moveStory({
      projectId,
      storyId: story.id,
      columnId: null,
      sprintId: story.sprintId !== null && story.sprintId === activeSprintId ? null : story.sprintId,
      toIndex: input.toIndex,
      scope: { kind: "backlog", activeSprintId },
    });
    return ok(story);
  },

  async getTasks(projectId: string, storyId: string): Promise<ActionResult<Awaited<ReturnType<typeof boardRepo.tasks>>>> {
    const storyResult = await this.getProjectStory(projectId, storyId);
    if (!storyResult.ok) return storyResult;
    return ok(await boardRepo.tasks(storyResult.data.id));
  },

  async addTask(projectId: string, storyId: string, title: string): Promise<ActionResult<void>> {
    const storyResult = await this.getProjectStory(projectId, storyId);
    if (!storyResult.ok) return storyResult;
    await boardRepo.addTask(storyResult.data.id, title);
    return ok(undefined);
  },

  /** Returns titles for writing into the project activity log. */
  async setTaskDone(projectId: string, taskId: string, done: boolean): Promise<ActionResult<{ taskTitle: string; storyTitle: string; storyId: string }>> {
    const task = await boardRepo.taskById(taskId);
    if (!task) return fail("Stavka ne postoji");
    const storyResult = await this.getStory(task.storyId);
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    if (story.projectId !== projectId) return fail("Stavka ne pripada ovom projektu");
    await boardRepo.setTaskDone(task.id, done);
    return ok({ taskTitle: task.title, storyTitle: story.title, storyId: story.id });
  },

  async removeTask(projectId: string, taskId: string): Promise<ActionResult<void>> {
    const task = await boardRepo.taskById(taskId);
    if (!task) return fail("Stavka ne postoji");
    const storyResult = await this.getStory(task.storyId);
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    if (story.projectId !== projectId) return fail("Stavka ne pripada ovom projektu");
    await boardRepo.removeTask(task.id);
    return ok(undefined);
  },

  addComment: (storyId: string, authorId: string, body: string) =>
    boardRepo.addComment(storyId, authorId, body),

  async removeComment(
    projectId: string,
    commentId: string,
    byUserId: string,
    canModerate: boolean,
  ): Promise<ActionResult<void>> {
    const comment = await boardRepo.commentById(commentId);
    if (!comment) return fail("Komentar ne postoji");
    const story = await boardRepo.storyById(comment.storyId);
    if (!story || story.projectId !== projectId) return fail("Komentar ne postoji");
    if (!canModerate && comment.authorId !== byUserId) {
      return fail("Možete brisati samo svoje komentare");
    }
    await boardRepo.removeComment(commentId);
    return ok(undefined);
  },
};
