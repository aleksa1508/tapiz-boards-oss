import type { BoardColumnWithStories, StoryDto } from "@/domain/types";

/** Only what the public card renders — descriptions, IDs and authors never leave the server. */
export type PublicStory = Pick<
  StoryDto,
  "id" | "title" | "priority" | "dueDate" | "taskCount" | "tasksDone" | "storyPoints" | "assigneeName"
>;

export interface PublicBoardColumn {
  id: string;
  name: string;
  stories: PublicStory[];
}

export function toPublicColumns(columns: BoardColumnWithStories[]): PublicBoardColumn[] {
  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    stories: column.stories.map((story) => ({
      id: story.id,
      title: story.title,
      priority: story.priority,
      dueDate: story.dueDate,
      taskCount: story.taskCount,
      tasksDone: story.tasksDone,
      storyPoints: story.storyPoints,
      assigneeName: story.assigneeName,
    })),
  }));
}
