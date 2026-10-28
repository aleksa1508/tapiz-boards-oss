import type {
  BoardColumnDto,
  BoardColumnWithStories,
  CommentDto,
  MyWorkItem,
  StoryDto,
  StoryPriority,
  StoryTaskDto,
  ProjectExportStory,
  ProjectExportTask,
  ProjectExportComment,
} from "@/domain/types";

/** The list a story is ordered within — what the user sees when dropping it. */
export type StoryOrderScope =
  | { kind: "column"; columnId: string; sprintId: string }
  | { kind: "backlog"; activeSprintId: string | null };

export interface BoardRepo {
  columns(projectId: string): Promise<BoardColumnDto[]>;
  columnById(id: string): Promise<BoardColumnDto | null>;
  createColumn(projectId: string, name: string): Promise<void>;
  renameColumn(id: string, name: string): Promise<void>;
  setColumnWipLimit(id: string, wipLimit: number | null): Promise<void>;
  setColumnDone(projectId: string, id: string, isDone: boolean): Promise<void>;
  removeColumn(projectId: string, id: string): Promise<void>;
  boardWithStories(projectId: string, sprintId: string): Promise<BoardColumnWithStories[]>;
  backlog(projectId: string, activeSprintId: string | null): Promise<StoryDto[]>;
  assignedToUser(userId: string): Promise<MyWorkItem[]>;
  storyById(id: string): Promise<StoryDto | null>;
  createStory(input: {
    projectId: string;
    columnId: string | null;
    sprintId: string | null;
    title: string;
    description: string;
    position: number;
    authorId: string;
  }): Promise<void>;
  updateStory(
    id: string,
    input: {
      title: string;
      description: string;
      assigneeId: string | null;
      storyPoints: number | null;
      sprintId: string | null;
      columnId: string | null;
      priority: StoryPriority;
      dueDate: string | null;
      position?: number;
    },
  ): Promise<void>;
  removeStory(id: string): Promise<void>;
  tasks(storyId: string): Promise<StoryTaskDto[]>;
  taskById(id: string): Promise<StoryTaskDto | null>;
  addTask(storyId: string, title: string): Promise<void>;
  setTaskDone(id: string, done: boolean): Promise<void>;
  removeTask(id: string): Promise<void>;
  storiesBySprints(sprintIds: string[]): Promise<Record<string, StoryDto[]>>;
  nextStoryPosition(projectId: string, columnId: string | null): Promise<number>;
  moveStory(input: {
    projectId: string;
    storyId: string;
    columnId: string | null;
    sprintId: string | null;
    toIndex: number;
    scope: StoryOrderScope;
  }): Promise<void>;
  comments(storyId: string): Promise<CommentDto[]>;
  storiesForExport(projectId: string): Promise<ProjectExportStory[]>;
  tasksForStories(storyIds: string[]): Promise<ProjectExportTask[]>;
  commentsForStoriesExport(storyIds: string[]): Promise<ProjectExportComment[]>;
  commentById(id: string): Promise<CommentDto | null>;
  addComment(storyId: string, authorId: string, body: string): Promise<CommentDto>;
  removeComment(id: string): Promise<void>;
}
