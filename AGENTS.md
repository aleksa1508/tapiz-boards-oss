<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tapiz Boards OSS — contributor and agent handoff

## Scope and Git workflow

- This repository is `owlCoder/tapiz-boards-oss`, the self-hosted MIT edition. The sibling `tapiz-boards` repository is the commercial product; changes there require a separate user request.
- Before starting work, inspect `git status --short --branch` and fetch/pull the latest target branch with `git pull --ff-only`. Preserve existing local changes; resolve divergence without resetting or discarding someone else's work.
- Check the remote and review the diff before a requested commit/push. Stage explicit file names. Keep `.env*` secrets, local database files, generated builds, screenshots and unrelated workspace files out of commits.
- Read [README.md](README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/UPSTREAM_SYNC.md](docs/UPSTREAM_SYNC.md) for setup, product decisions and cross-repository fixes.

## Product rules to preserve

- OSS has no plan tiers or freemium quotas: projects/boards and project members are uncapped by the application. One project has one board. Do not copy hosted-product limits or billing checks into this edition.
- An instance admin creates accounts; there is no public registration, LMS SSO, invite-code join flow or native Android app in OSS.
- Any active account can see and work on every active project. Project membership determines who can be assigned stories; it is not a private-project access boundary.
- Only the project owner manages project members, columns, public links and Trash. An instance admin manages accounts and has normal project permissions otherwise. Preserve the last-active-admin protection.
- A project owner adds existing active accounts through project settings → members. Reject duplicate memberships and inactive accounts, and keep the owner as a member.
- The board currently displays only the active sprint. Stories outside it appear in the backlog; an empty board without an active sprint is expected behavior.

## Code map and implementation conventions

- `src/domain`: DTOs, Zod validation and pure business logic.
- `src/application`: services and repository ports.
- `src/infrastructure`: MySQL/Drizzle schema, queries and repositories.
- `src/lib`: authentication, authorization guards and server actions.
- `src/features`: React feature UI; `src/app`: Next.js routes.
- Membership flows through `ProjectMembersModal.tsx` → `src/lib/actions/projects.actions.ts` → `projects.service.ts` → `projects.repo.ts`. The database is MySQL, including in integration tests.
- Keep authorization inside server actions, validate inputs and use the existing `ActionResult` pattern. UI visibility alone does not authorize a mutation.
- Preserve project-row locking and transactions around story ordering, column changes and sprint transitions; see `docs/ARCHITECTURE.md` before changing them.
- Reuse `@tapizlabs/ui` components and existing styling tokens. Keep user-facing strings in all five dictionaries: `sr`, `sr-Cyrl`, `en`, `fr`, `hu`.

## Verification

For application changes, use the checks in README:

```sh
npm run lint
npm run typecheck
npm run build
```

Database-backed checks create and delete fixture data. Configure a dedicated local/disposable database, initialize its schema and verify the database target before running them. Do not point test or schema-push commands at production.

```sh
npm run smoke
DATABASE_POOL_LIMIT=8 npm run test:board
```

Those npm scripts load `.env`. To use a separate ignored environment file, invoke the test runner directly so `.env` does not override the chosen database:

```sh
node --env-file=.env.members-test.local node_modules/tsx/dist/cli.mjs scripts/smoke.ts
node --env-file=.env.members-test.local node_modules/tsx/dist/cli.mjs scripts/board-integrity.ts
```

Create that local file from `.env.example` with your own local settings and set `DATABASE_POOL_LIMIT=8` to exercise concurrent queries. It is not committed or available automatically on another checkout. Schema initialization for the selected disposable database:

```sh
node --env-file=.env.members-test.local node_modules/drizzle-kit/bin.cjs push
```

For documentation-only changes, review links and run `git diff --check`; repeat application/database checks when the implementation changes or a new concern warrants them.

## Verified checkpoint — 2026-10-16

- Pulled `main` from `cd15d54` to `f82a51d` before testing. The subsequent smoke-test change raises coverage from seven members to eleven: ten added accounts plus the owner, with intermediate assertions at six and ten total members and verification of all added IDs.
- All 17 smoke assertions and 35 board-integrity assertions passed against an isolated local MySQL database. Lint, TypeScript and a production build also passed.
- Browser verification used an ordinary `role=member` project owner: create a project, add ten accounts individually through the members panel, reload and confirm all eleven participants, then create a story and assign it to the tenth added account. Membership and assignment persisted after reload.
- No application-code fix was needed for this scenario. Concurrent load/performance testing remains separate from this functional membership check.

### Local continuation details

- The test database was `tapiz_boards_oss_members_test` in Docker container `tapiz-boards-local-mysql-1` on `127.0.0.1:3307`; the existing `tapiz_boards` database was left unchanged.
- The existing local `.env` had a stale MySQL password. Testing used the ignored `.env.members-test.local` with valid local credentials. Inspect your own configuration rather than copying or committing credentials.
- A production test server was started on port `3005` because port `3004` was occupied by another checkout. Check current listeners before starting a server; these local processes are not guaranteed to survive a later session.
- Test project ID: `9b300623-8ed8-492c-a2c6-91d63af8ea4d`; board path: `/projects/9b300623-8ed8-492c-a2c6-91d63af8ea4d/board`. Fixtures and screenshots are local-only and can be recreated on another machine.
- Local QA notes and screenshots are in the parent workspace's `_local/qa/` directory. Do not publish its credentials or add that directory to this repository.

To restart the local test server after building:

```sh
node --env-file=.env.members-test.local node_modules/next/dist/bin/next start -p 3005 -H 127.0.0.1
```
