import type { ProjectExportData } from "@/domain/types";

type CsvColumn<T> = { key: keyof T; header: string };

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safeText =
    typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text)
      ? `'${text}`
      : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function createCsv<T extends object>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => csvCell(column.header)).join(";");
  const records = rows.map((row) =>
    columns.map((column) => csvCell(row[column.key])).join(";"),
  );
  return `\uFEFF${[header, ...records].join("\r\n")}\r\n`;
}

export function createProjectCsvFiles(data: ProjectExportData): Record<string, string> {
  return {
    "project.csv": createCsv([{
      id: data.project.id,
      name: data.project.name,
      owner_id: data.project.ownerId,
      owner_name: data.project.ownerName,
      owner_email: data.project.ownerEmail,
      github_repo: data.project.githubRepo,
      created_at: data.project.createdAt,
      exported_at: data.exportedAt,
    }], [
      { key: "id", header: "project_id" }, { key: "name", header: "project_name" },
      { key: "owner_id", header: "owner_id" }, { key: "owner_name", header: "owner_name" },
      { key: "owner_email", header: "owner_email" }, { key: "github_repo", header: "github_repo" },
      { key: "created_at", header: "created_at" },
      { key: "exported_at", header: "exported_at" },
    ]),
    "members.csv": createCsv(data.members, [
      { key: "userId", header: "user_id" }, { key: "firstName", header: "first_name" },
      { key: "lastName", header: "last_name" }, { key: "email", header: "email" },
      { key: "joinedAt", header: "joined_at" }, { key: "isOwner", header: "is_owner" },
    ]),
    "columns.csv": createCsv(data.columns, [
      { key: "id", header: "column_id" }, { key: "projectId", header: "project_id" },
      { key: "name", header: "name" }, { key: "position", header: "position" },
      { key: "wipLimit", header: "wip_limit" }, { key: "isDone", header: "is_done" },
    ]),
    "sprints.csv": createCsv(data.sprints, [
      { key: "id", header: "sprint_id" }, { key: "projectId", header: "project_id" },
      { key: "name", header: "name" }, { key: "goal", header: "goal" },
      { key: "startDate", header: "start_date" }, { key: "endDate", header: "end_date" },
      { key: "status", header: "status" }, { key: "createdAt", header: "created_at" },
      { key: "storyCount", header: "story_count" }, { key: "totalPoints", header: "total_points" },
    ]),
    "stories.csv": createCsv(data.stories, [
      { key: "id", header: "story_id" }, { key: "projectId", header: "project_id" },
      { key: "columnId", header: "column_id" }, { key: "columnName", header: "column_name" },
      { key: "sprintId", header: "sprint_id" }, { key: "sprintName", header: "sprint_name" },
      { key: "title", header: "title" }, { key: "description", header: "description" },
      { key: "position", header: "position" }, { key: "authorId", header: "author_id" },
      { key: "authorName", header: "author_name" }, { key: "authorEmail", header: "author_email" },
      { key: "assigneeId", header: "assignee_id" }, { key: "assigneeName", header: "assignee_name" },
      { key: "assigneeEmail", header: "assignee_email" }, { key: "storyPoints", header: "story_points" },
      { key: "priority", header: "priority" }, { key: "dueDate", header: "due_date" },
      { key: "createdAt", header: "created_at" }, { key: "updatedAt", header: "updated_at" },
    ]),
    "tasks.csv": createCsv(data.tasks, [
      { key: "id", header: "task_id" }, { key: "storyId", header: "story_id" },
      { key: "title", header: "title" }, { key: "done", header: "done" },
      { key: "position", header: "position" }, { key: "createdAt", header: "created_at" },
    ]),
    "comments.csv": createCsv(data.comments, [
      { key: "id", header: "comment_id" }, { key: "storyId", header: "story_id" },
      { key: "authorId", header: "author_id" }, { key: "authorName", header: "author_name" },
      { key: "authorEmail", header: "author_email" }, { key: "body", header: "body" },
      { key: "createdAt", header: "created_at" },
    ]),
    "retrospectives.csv": createCsv(data.retrospectives, [
      { key: "id", header: "retrospective_id" }, { key: "sprintId", header: "sprint_id" },
      { key: "authorId", header: "author_id" }, { key: "authorName", header: "author_name" },
      { key: "authorEmail", header: "author_email" }, { key: "category", header: "category" },
      { key: "body", header: "body" }, { key: "createdAt", header: "created_at" },
    ]),
    "activities.csv": createCsv(data.activities, [
      { key: "id", header: "activity_id" }, { key: "projectId", header: "project_id" },
      { key: "actorId", header: "actor_id" }, { key: "actorName", header: "actor_name" },
      { key: "actorEmail", header: "actor_email" }, { key: "type", header: "type" },
      { key: "storyId", header: "story_id" }, { key: "detail", header: "detail" },
      { key: "createdAt", header: "created_at" },
    ]),
  };
}
