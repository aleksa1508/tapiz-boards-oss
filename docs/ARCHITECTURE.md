# Architecture notes

This document explains a few decisions specific to the Open Source Edition that aren't obvious from the code alone.

## Project = the original "personal team"

The hosted product's `teams` table already supported two shapes: a **subject-bound team** (`subjectId` set, created by a teaching assistant, joined by students of that subject) and a **personal team** (`subjectId = NULL`, created directly by a user, joined via invite code). All board data — columns, stories, sprints, comments, events — was already keyed by `team_id`, never `subject_id`.

The personal-team shape is exactly what a generic "Project" needs: a single owner, an invite code, a board. Rather than inventing a new entity, this edition:

- Renamed `teams` → `projects` (and `teamMembers`/`teamEvents` → `projectMembers`/`projectEvents`, `team_id` → `project_id` everywhere).
- Dropped `subjectId`, `topicId`, and the subject-only `code` format (`ERS_25_TIM01`) — every project is now what used to be a "personal team."
- Dropped the `subjects`, `topics`, `qaSessions`, `qaPairs`, `teamGrades`, and `gradeItems` tables entirely, along with the peer-QA and grading UI that depended on them.

This kept the board/story/sprint/comment core structurally identical to the original, so bug fixes in that core can still be cherry-picked in either direction (see [`UPSTREAM_SYNC.md`](UPSTREAM_SYNC.md)).

## Trash (soft delete)

The original schema had no soft-delete pattern anywhere. This edition adds a nullable `deletedAt` column to `projects`:

- Normal queries (`listForUser`, `findById`, invite/public-token lookups) filter on `deletedAt IS NULL`.
- Deleting a project sets `deletedAt = now()` instead of removing the row — it shows up in **Trash** for its owner, who can restore it (clears `deletedAt`) or permanently delete it.
- Permanent delete runs in one transaction: it deletes the project's stories first (cascading into `story_tasks` and `comments`), then the project row, whose `onDelete: "cascade"` removes `board_columns`, `sprints`, `project_members` and `project_events`. Stories go first because a single `DELETE FROM projects` reaches them through two cascade paths (`project_id` CASCADE and `board_columns` → `column_id` SET NULL), which MySQL rejects with errno 1452.

## Story ordering

`stories.position` is one integer space per column, shared by every sprint, so a column can hold stories that aren't on screen (a planned sprint's carried-over cards, finished cards of past sprints). Order is therefore only meaningful within the list a user actually sees:

- a board column = the active sprint's stories in that column;
- the backlog = every story outside the active sprint.

A drag & drop move sends the drop index within that visible list. `moveStory` (in `infrastructure/repositories/board/move.queries.ts`) locks the project row, reads the visible list, splices the story in and renumbers that list to `0..n-1`, writing only rows whose position changed in a single `UPDATE … CASE`. Every list query orders by `(position, created_at, id)`, so ties are deterministic. The same project-row lock serializes sprint start/finish and column create/delete, which is what keeps "one active sprint per project" and "finish runs once" true under concurrent requests.

## Roles: admin vs. member

The original `role` enum (`assistant` / `student`) mapped to a teaching hierarchy that doesn't exist in a generic self-hosted tool. It's replaced with `admin` / `member`:

- **Admin's only special power is instance/account management** — creating accounts, resetting passwords, activating/deactivating users, and deleting accounts (`/admin/users`). There's a server-enforced rule that at least one active admin must always exist.
- For everything else — projects, boards, stories, sprints — admin has exactly the same permissions as any other member. There is no assistant-style "owns everything" role bleeding into day-to-day work.

## What was intentionally left out

- **LMS SSO** (OAuth/PKCE against Tapiz LMS) and **public self-registration** — accounts only exist via admin creation (`npm run create-admin` for the first one, the admin UI for the rest). This is the only realistic bootstrap model for a small self-hosted instance with no institutional identity provider behind it.
- **Freemium/entitlements** — the original's plan-tier gating existed only to distinguish LMS-backed accounts from standalone ones. With no SSO, that distinction disappears, so every member gets full, unlimited access.
- **Native Android app** — it depended on the mobile-only API surface (`/api/mobile/*`), self-registration, and grading, none of which exist in this edition. Only the web app is included.
- **Peer QA and grading** — these are teaching-specific workflows (cross-team bug review, rubric-based grading) that don't map to a generic team tool.
