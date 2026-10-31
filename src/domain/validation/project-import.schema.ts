import { z } from "zod";
import { repoUrlSchema } from "./project.schema";

const uuid = z.string().uuid();
const isoTimestamp = z.string().refine((value) => {
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() >= Date.UTC(1970, 0, 1) &&
    date.getTime() <= Date.UTC(2038, 0, 19, 3, 14, 7) &&
    date.toISOString() === value
  );
}, "Datum i vrijeme moraju biti u ISO 8601 UTC formatu");
const isoDay = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Datum mora biti u formatu YYYY-MM-DD");
const email = z.string().email().max(255);
const nonNegativeInt = z.number().int().min(0).max(2_147_483_647);
const mysqlText = z.string().refine(
  (value) => new TextEncoder().encode(value).byteLength <= 65_535,
  "Tekst prelazi maksimalnu veličinu za bazu podataka",
);

export const projectImportSchema = z.object({
  formatVersion: z.literal(1),
  exportedAt: isoTimestamp,
  project: z.object({
    id: uuid,
    name: z.string().trim().min(3).max(100),
    ownerId: uuid,
    ownerName: z.string().trim().min(1).max(201),
    ownerEmail: email,
    githubRepo: z.union([repoUrlSchema, z.null()]),
    createdAt: isoTimestamp,
  }).strict(),
  members: z.array(z.object({
    userId: uuid,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email,
    joinedAt: isoTimestamp,
    isOwner: z.boolean(),
  }).strict()),
  columns: z.array(z.object({
    id: uuid,
    projectId: uuid,
    name: z.string().trim().min(1).max(100),
    position: nonNegativeInt,
    wipLimit: nonNegativeInt.nullable(),
    isDone: z.boolean(),
  }).strict()),
  sprints: z.array(z.object({
    id: uuid,
    projectId: uuid,
    name: z.string().trim().min(1).max(100),
    goal: mysqlText.nullable(),
    startDate: isoDay,
    endDate: isoDay,
    status: z.enum(["planned", "active", "completed"]),
    createdAt: isoTimestamp,
    storyCount: nonNegativeInt,
    totalPoints: nonNegativeInt,
  }).strict()),
  stories: z.array(z.object({
    id: uuid,
    projectId: uuid,
    columnId: uuid.nullable(),
    columnName: z.string().max(100).nullable(),
    sprintId: uuid.nullable(),
    sprintName: z.string().max(100).nullable(),
    title: z.string().min(1).max(255),
    description: mysqlText.nullable(),
    position: nonNegativeInt,
    authorId: uuid.nullable(),
    authorName: z.string().trim().min(1).max(201),
    authorEmail: email,
    assigneeId: uuid.nullable(),
    assigneeName: z.string().max(201).nullable(),
    assigneeEmail: email.nullable(),
    storyPoints: nonNegativeInt.nullable(),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: isoDay.nullable(),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  }).strict()),
  tasks: z.array(z.object({
    id: uuid,
    storyId: uuid,
    title: z.string().min(1).max(255),
    done: z.boolean(),
    position: nonNegativeInt,
    createdAt: isoTimestamp,
  }).strict()),
  comments: z.array(z.object({
    id: uuid,
    storyId: uuid,
    authorId: uuid.nullable(),
    authorName: z.string().trim().min(1).max(201),
    authorEmail: email,
    body: mysqlText,
    createdAt: isoTimestamp,
  }).strict()),
  retrospectives: z.array(z.object({
    id: uuid,
    sprintId: uuid,
    authorId: uuid.nullable(),
    authorName: z.string().trim().min(1).max(201),
    authorEmail: email,
    category: z.enum(["good", "bad"]),
    body: z.string().min(1).max(1000),
    createdAt: isoTimestamp,
  }).strict()),
  activities: z.array(z.object({
    id: uuid,
    projectId: uuid,
    actorId: uuid.nullable(),
    actorName: z.string().trim().min(1).max(201),
    actorEmail: email,
    type: z.enum([
      "story_created",
      "story_moved",
      "story_updated",
      "story_deleted",
      "comment_added",
      "task_done",
      "sprint_started",
      "sprint_completed",
      "member_added",
      "member_removed",
      "repo_linked",
    ]),
    storyId: uuid.nullable(),
    detail: z.string().max(500),
    createdAt: isoTimestamp,
  }).strict()),
}).strict();

export type ProjectImportData = z.infer<typeof projectImportSchema>;

export interface ProjectImportIdentity {
  sourceId: string;
  name: string;
  email: string;
  isMember: boolean;
}

export function getProjectImportIdentities(data: ProjectImportData): ProjectImportIdentity[] {
  const identities = new Map<string, ProjectImportIdentity>();
  const add = (sourceId: string | null, name: string, address: string, isMember = false) => {
    if (sourceId === null) return;
    const current = identities.get(sourceId);
    if (current) {
      current.isMember ||= isMember;
      return;
    }
    identities.set(sourceId, { sourceId, name, email: address, isMember });
  };

  for (const member of data.members) {
    add(member.userId, `${member.firstName} ${member.lastName}`, member.email, true);
  }
  add(data.project.ownerId, data.project.ownerName, data.project.ownerEmail);
  for (const story of data.stories) {
    add(story.authorId, story.authorName, story.authorEmail);
    if (story.assigneeId && story.assigneeName && story.assigneeEmail) {
      add(story.assigneeId, story.assigneeName, story.assigneeEmail);
    }
  }
  for (const comment of data.comments) add(comment.authorId, comment.authorName, comment.authorEmail);
  for (const retro of data.retrospectives) add(retro.authorId, retro.authorName, retro.authorEmail);
  for (const activity of data.activities) add(activity.actorId, activity.actorName, activity.actorEmail);
  return [...identities.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function uniqueIds(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export function projectImportRelationshipError(data: ProjectImportData): string | null {
  const projectId = data.project.id;
  const columnIds = new Set(data.columns.map((column) => column.id));
  const sprintIds = new Set(data.sprints.map((sprint) => sprint.id));
  const storyIds = new Set(data.stories.map((story) => story.id));

  if (data.columns.length === 0 || data.columns.filter((column) => column.isDone).length > 1) {
    return "Projekat mora imati kolone i najviše jednu završnu (Done) kolonu.";
  }
  if (data.sprints.filter((sprint) => sprint.status === "active").length > 1) {
    return "Projekat ne može imati više od jednog aktivnog sprinta.";
  }

  const idGroups = [
    data.members.map((item) => item.userId),
    data.columns.map((item) => item.id),
    data.sprints.map((item) => item.id),
    data.stories.map((item) => item.id),
    data.tasks.map((item) => item.id),
    data.comments.map((item) => item.id),
    data.retrospectives.map((item) => item.id),
    data.activities.map((item) => item.id),
  ];
  if (idGroups.some((ids) => !uniqueIds(ids))) {
    return "Datoteka sadrži duplirane ID-jeve unutar iste vrste zapisa.";
  }

  if (
    data.columns.some((item) => item.projectId !== projectId) ||
    data.sprints.some((item) => item.projectId !== projectId) ||
    data.stories.some((item) => item.projectId !== projectId) ||
    data.activities.some((item) => item.projectId !== projectId)
  ) {
    return "Neki zapisi ne pripadaju projektu navedenom u datoteci.";
  }
  if (data.sprints.some((sprint) => sprint.startDate > sprint.endDate)) {
    return "Datum početka sprinta ne može biti posle datuma završetka.";
  }
  if (data.stories.some((story) => story.createdAt > story.updatedAt)) {
    return "Datum izmene story-ja ne može biti pre datuma kreiranja.";
  }
  if (
    data.members.filter((item) => item.isOwner && item.userId === data.project.ownerId).length !== 1 ||
    data.members.filter((item) => item.isOwner).length !== 1
  ) {
    return "Vlasnik projekta mora biti naveden kao jedini vlasnik među članovima.";
  }
  if (data.stories.some((item) =>
    (item.columnId !== null && !columnIds.has(item.columnId)) ||
    (item.sprintId !== null && !sprintIds.has(item.sprintId)) ||
    (item.assigneeId !== null && (item.assigneeName === null || item.assigneeEmail === null))
  )) {
    return "Story sadrži neispravnu vezu ka koloni, sprintu ili assignee-ju.";
  }
  if (
    data.tasks.some((item) => !storyIds.has(item.storyId)) ||
    data.comments.some((item) => !storyIds.has(item.storyId)) ||
    data.retrospectives.some((item) => !sprintIds.has(item.sprintId)) ||
    data.activities.some((item) => item.storyId !== null && !storyIds.has(item.storyId))
  ) {
    return "Datoteka sadrži checklist, komentar, retrospektivu ili aktivnost s nepostojećom vezom.";
  }

  return null;
}

export function projectImportValidationMessage(value: unknown): string | null {
  const parsed = projectImportSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  }
  return projectImportRelationshipError(parsed.data);
}
