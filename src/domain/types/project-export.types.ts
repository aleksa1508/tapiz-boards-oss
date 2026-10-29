import type { BoardColumnDto } from "@/domain/types/story.types";
import type { ProjectMemberDto } from "@/domain/types/project.types";
import type { ProjectEventType } from "@/domain/types/event.types";

export interface ProjectExportMember extends ProjectMemberDto {
  joinedAt: string;
  isOwner: boolean;
}

export interface ProjectExportSprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
  createdAt: string;
  storyCount: number;
  totalPoints: number;
}

export interface ProjectExportStory {
  id: string;
  projectId: string;
  columnId: string | null;
  columnName: string | null;
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
  assigneeEmail: string | null;
  storyPoints: number | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectExportTask {
  id: string;
  storyId: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: string;
}

export interface ProjectExportComment {
  id: string;
  storyId: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface ProjectExportRetrospective {
  id: string;
  sprintId: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  category: "good" | "bad";
  body: string;
  createdAt: string;
}

export interface ProjectExportActivity {
  id: string;
  projectId: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  type: ProjectEventType;
  storyId: string | null;
  detail: string;
  createdAt: string;
}

export interface ProjectExportData {
  formatVersion: 1;
  exportedAt: string;
  project: {
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    githubRepo: string | null;
    createdAt: string;
  };
  members: ProjectExportMember[];
  columns: BoardColumnDto[];
  sprints: ProjectExportSprint[];
  stories: ProjectExportStory[];
  tasks: ProjectExportTask[];
  comments: ProjectExportComment[];
  retrospectives: ProjectExportRetrospective[];
  activities: ProjectExportActivity[];
}
