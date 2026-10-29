import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const users = mysqlTable("users", {
  id: id(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  /** admin = instance/account management + normal member; member = normal user. */
  role: mysqlEnum("role", ["admin", "member"]).notNull().default("member"),
  /** Deactivated account → false (login refused, row stays for FK history). */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const projects = mysqlTable("projects", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  importedFromProjectId: varchar("imported_from_project_id", { length: 36 }),
  importedAt: timestamp("imported_at"),
  /** Token for the public read-only board view; NULL = link disabled. */
  publicToken: varchar("public_token", { length: 36 }).unique(),
  /** Public GitHub repo linked to the project; NULL = not linked. */
  repoUrl: varchar("repo_url", { length: 255 }),
  /** Soft delete — set when moved to Trash; NULL = active project. */
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("ix_projects_imported_from").on(t.importedFromProjectId)]);

export const projectMembers = mysqlTable(
  "project_members",
  {
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const boardColumns = mysqlTable("board_columns", {
  id: id(),
  projectId: varchar("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  position: int("position").notNull().default(0),
  /** Advisory WIP limit (kanban) — NULL = no limit; visual warning only, doesn't block. */
  wipLimit: int("wip_limit"),
  /** Explicit "done" marker — exactly one column per project may be Done (see board-insights). */
  isDone: boolean("is_done").notNull().default(false),
});

export const sprints = mysqlTable("sprints", {
  id: id(),
  projectId: varchar("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  goal: text("goal"),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["planned", "active", "completed"]).notNull().default("planned"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Sprint retrospective items — written once a sprint is completed. */
export const sprintRetroItems = mysqlTable("sprint_retro_items", {
  id: id(),
  sprintId: varchar("sprint_id", { length: 36 })
    .notNull()
    .references(() => sprints.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 36 })
    .references(() => users.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 201 }).notNull().default(""),
  authorEmail: varchar("author_email", { length: 255 }).notNull().default(""),
  category: mysqlEnum("category", ["good", "bad"]).notNull(),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stories = mysqlTable(
  "stories",
  {
    id: id(),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    columnId: varchar("column_id", { length: 36 }).references(() => boardColumns.id, {
      onDelete: "set null",
    }),
    sprintId: varchar("sprint_id", { length: 36 }).references(() => sprints.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    position: int("position").notNull().default(0),
    authorId: varchar("author_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 201 }).notNull().default(""),
    authorEmail: varchar("author_email", { length: 255 }).notNull().default(""),
    assigneeId: varchar("assignee_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    storyPoints: int("story_points"),
    priority: mysqlEnum("priority", ["low", "medium", "high"]).notNull().default("medium"),
    /** Due date in ISO format (yyyy-mm-dd), same as sprint dates. */
    dueDate: varchar("due_date", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    // Covers the most common query: filter by (project, column) + ORDER BY position (board/backlog/reorder).
    index("ix_stories_project_column_position").on(t.projectId, t.columnId, t.position),
  ],
);

/** Story checklist items. */
export const storyTasks = mysqlTable("story_tasks", {
  id: id(),
  storyId: varchar("story_id", { length: 36 })
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  done: boolean("done").notNull().default(false),
  position: int("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = mysqlTable("comments", {
  id: id(),
  storyId: varchar("story_id", { length: 36 })
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 36 })
    .references(() => users.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 201 }).notNull().default(""),
  authorEmail: varchar("author_email", { length: 255 }).notNull().default(""),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const PROJECT_EVENT_TYPES = [
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
] as const;

/** Project activity log — feeds the calendar; history isn't deleted with the story (FK set null). */
export const projectEvents = mysqlTable(
  "project_events",
  {
    id: id(),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    actorName: varchar("actor_name", { length: 201 }).notNull().default(""),
    actorEmail: varchar("actor_email", { length: 255 }).notNull().default(""),
    type: mysqlEnum("type", PROJECT_EVENT_TYPES).notNull(),
    storyId: varchar("story_id", { length: 36 }).references(() => stories.id, {
      onDelete: "set null",
    }),
    /** Snapshot of context (story title, column, member name...) — survives source deletion. */
    detail: varchar("detail", { length: 500 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ix_project_events_project_created").on(t.projectId, t.createdAt)],
);
