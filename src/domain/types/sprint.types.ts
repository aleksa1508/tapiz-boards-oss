export type SprintStatus = "planned" | "active" | "completed";

export type RetroCategory = "good" | "bad";

export interface SprintDto {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  storyCount: number;
  totalPoints: number;
  retroCount: number;
}

export interface SprintRetroItemDto {
  id: string;
  sprintId: string;
  category: RetroCategory;
  body: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}
