export type StoryPriority = "low" | "medium" | "high";

export interface StoryDto {
  id: string;
  projectId: string;
  columnId: string | null;
  sprintId: string | null;
  sprintName: string | null;
  title: string;
  description: string | null;
  position: number;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  assigneeId: string | null;
  assigneeName: string | null;
  storyPoints: number | null;
  priority: StoryPriority;
  /** Due date in ISO format (yyyy-mm-dd). */
  dueDate: string | null;
  commentCount: number;
  taskCount: number;
  tasksDone: number;
  createdAt: string;
}

/** Story assigned to a user, with project/column context — for the "My Work" view across all projects. */
export interface MyWorkItem extends StoryDto {
  projectName: string;
  columnName: string | null;
}

export interface StoryTaskDto {
  id: string;
  storyId: string;
  title: string;
  done: boolean;
}

export interface CommentDto {
  id: string;
  storyId: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface BoardColumnDto {
  id: string;
  projectId: string;
  name: string;
  position: number;
  /** Advisory WIP limit; NULL = no limit. */
  wipLimit: number | null;
  /** Explicit "Done" column marker; exactly one per project. */
  isDone: boolean;
}

export interface BoardColumnWithStories extends BoardColumnDto {
  stories: StoryDto[];
}

/** A due date is overdue if it's before today (ISO string comparison). */
export function isOverdue(dueDate: string | null, today: string): boolean {
  return dueDate !== null && dueDate < today;
}
