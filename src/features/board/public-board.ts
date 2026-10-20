import type { BoardColumnWithStories, StoryDto, StoryTaskDto, CommentDto } from "@/domain/types";

export interface PublicDetails {
  tasks: Pick<StoryTaskDto, "id" | "title" | "done">[];
  comments: Pick<CommentDto, "id" | "authorName" | "body" | "createdAt">[];
}

/** Explicit allowlist: do not serialize account IDs or private project fields in public views. */
export type PublicStory = Pick<
  StoryDto,
  "id" | "title" | "description" | "priority" | "dueDate" | "taskCount" |
  "tasksDone" | "storyPoints" | "assigneeName" | "authorName" | "createdAt" |
  "sprintName" | "commentCount"
> & PublicDetails;

export interface PublicBoardColumn {
  id: string;
  name: string;
  stories: PublicStory[];
}

export function toPublicStories(
  stories: StoryDto[],
  details: Record<string, PublicDetails>,
): PublicStory[] {
  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    priority: story.priority,
    dueDate: story.dueDate,
    taskCount: story.taskCount,
    tasksDone: story.tasksDone,
    storyPoints: story.storyPoints,
    assigneeName: story.assigneeName,
    authorName: story.authorName,
    createdAt: story.createdAt,
    sprintName: story.sprintName,
    commentCount: story.commentCount,
    tasks: details[story.id]?.tasks ?? [],
    comments: details[story.id]?.comments ?? [],
  }));
}

export function toPublicColumns(
  columns: BoardColumnWithStories[],
  details: Record<string, PublicDetails>,
): PublicBoardColumn[] {
  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    stories: toPublicStories(column.stories, details),
  }));
}
