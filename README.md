# Tapiz Boards — Open Source Edition

A self-hosted Kanban and sprint-planning tool for small teams: backlog, board with drag & drop, sprints, comments, and a simple project/trash model. MIT licensed.

This is the open-source edition of Tapiz Boards, derived from the hosted product. It has no dependency on Tapiz LMS, no SSO, and no public self-registration — an admin creates every account.

The OSS edition uses one dark-teal and neutral-charcoal visual identity across the landing page, app, login and public board, with a distinct pixel-board logo and OSS / Community branding. Light mode uses neutral white/gray surfaces and dark mode uses charcoal/gray surfaces. Teal is reserved for small interactive accents, not large colored cards or page backgrounds; both modes inherit the same global design tokens. Legacy hosted-product skins are intentionally unavailable here. The hosted product's design and repository are not changed by these customizations.

There are **no free-plan quotas**: the self-hosted edition allows unlimited projects (one board per project) and unlimited members per project, subject only to your own infrastructure capacity.

## Public sharing and sprint recovery

- A project owner can enable a token-based public link. Anyone with the link can view the active board, backlog, story descriptions, assignees, checklist items and comments, **without signing in**. These public pages provide no mutation actions. Treat the link as a public disclosure and disable/regenerate it when no longer needed.
- If a member accidentally starts the wrong sprint, use **Undo start / Vrati u planirano** on the active sprint and confirm. This atomically returns it to Planned, freeing the active slot for the correct sprint. Stories, tasks, and current board columns are retained. Completed sprints cannot be reopened this way.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, [`@tapizlabs/ui`](https://www.npmjs.com/package/@tapizlabs/ui) (public MIT design system)
- MySQL + Drizzle ORM (`mysql2`)
- Auth.js v5 (credentials only — email/password, JWT httpOnly cookie session)
- `@dnd-kit` for board drag & drop, Zod for validation, bcryptjs for password hashing

## Architecture

```
src/domain          # types, zod schemas, pure business logic
src/application     # use-case services + repository interfaces (ports)
src/infrastructure  # drizzle schema/client + repositories
src/lib             # auth, guards, server actions (thin: zod → service → revalidate)
src/features        # UI by feature (auth, projects, board, admin, settings, dashboard)
src/app             # routes (server components)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning behind the Project/Trash model, and [`docs/UPSTREAM_SYNC.md`](docs/UPSTREAM_SYNC.md) if you maintain this fork alongside the original hosted product.

## Local development

Prerequisites: Node.js 20+, a MySQL 8+ database (local or remote).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET, see below
npm run db:push        # creates the schema on an empty database
npm run create-admin -- --email you@example.com --password "a-strong-password" --first-name Ana --last-name Petrović
npm run dev
```

Open http://localhost:3004 and sign in with the admin account you just created. As admin, use **User management** in the sidebar to create member accounts — there is no public sign-up page.

### Local MySQL via Docker (optional)

```bash
docker run -d --name tapiz-boards-mysql -e MYSQL_ROOT_PASSWORD=devpass \
  -e MYSQL_DATABASE=tapiz_boards -p 3307:3306 mysql:8.4
```

Then set `DATABASE_URL=mysql://root:devpass@localhost:3307/tapiz_boards` in `.env`.

## Environment variables

See [`.env.example`](.env.example) for the full list with comments. In short:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL connection string. |
| `DATABASE_SSL_CA_BASE64` | If your provider requires TLS with a CA cert (e.g. Aiven) | Base64 of `ca.pem`. Leave empty for local MySQL without TLS. |
| `AUTH_SECRET` | Yes | Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | In production | Public URL of your deployment, e.g. `https://boards.example.com`. |
| `AUTH_TRUST_HOST` | Yes | Keep `true` — required for Auth.js behind a reverse proxy/PaaS. |

No LMS, telemetry, or third-party service keys are needed — this edition has no dependency on any private Tapiz infrastructure.

## Deploying an Aiven MySQL database + Vercel

1. **Create the database** — in Aiven, create a MySQL service and a database within it. Copy the connection string it gives you (`mysql://user:pass@host:port/dbname`).
2. **Get the CA certificate** — download `ca.pem` from the Aiven console, then base64-encode it:
   ```bash
   base64 -w0 ca.pem   # Linux
   base64 -i ca.pem    # macOS
   ```
   Put the result in `DATABASE_SSL_CA_BASE64`.
3. **Push the schema** — from your machine, with `.env` pointed at the Aiven database:
   ```bash
   npm run db:push
   ```
   For `drizzle-kit push` specifically (it doesn't read the CA variable), append `?ssl={"rejectUnauthorized":false}` to a *copy* of the connection string used only for this command.
4. **Create the first admin** against the same database:
   ```bash
   npm run create-admin -- --email you@example.com --password "..." --first-name Ana --last-name Petrović
   ```
5. **Import into Vercel** — connect the GitHub repo, then set the environment variables from the table above in the Vercel project settings (`AUTH_URL` = your Vercel domain).
6. **Deploy.** Vercel's build never runs migrations — `db:push` is a manual, explicit step you run yourself, so a bad deploy can't silently alter your schema.
7. **Verify** — visit the deployed URL, sign in with the admin account, create a project, and confirm the board loads.

## Everyday use

- **Projects** — any member can create a project; it comes pre-seeded with three columns (`TO DO`, `IN PROGRESS`, `DONE`). Every signed-in user can see and work on every project; the owner manages columns, members (the people stories can be assigned to), the public link and Trash.
- **Trash** — deleting a project soft-deletes it into **Trash**, where the owner can restore it or permanently delete it (which also removes its columns, stories, tasks, comments, and sprints).
- **Admin** — the account created by `create-admin` is an instance admin. Admin's only special power is user management (`/admin/users`): creating accounts, resetting passwords, activating/deactivating, and deleting users. For day-to-day project work, admin behaves exactly like any other member. The instance always keeps at least one active admin — the last one can't be deactivated or deleted.
- **Project manager** - project managers can search for users, select multiple accounts, and add them to a project in one operation.


## Project data import and export

### Export

Project managers can export project data from a project board in either format:

- **JSON** — structured data suitable for backup or re-import.
- **CSV (ZIP)** — separate CSV files for reviewing and analyzing project data in spreadsheet tools.

Exports include supported project data such as members, stories, checklist items, comments, retrospectives, and activities.

### Import

Signed-in users can import a JSON project export up to 9 MB. The file is validated before import, and a summary of its contents is shown. The import process generates new IDs for all imported entities, preserves relationships between records and their timestamps, and creates the project atomically.

Administrators can manually map imported people to active local accounts; email addresses are never used for automatic matching. Unlinked author details are preserved, and unmatched assignees remain unassigned. If the same source project was imported before, the user must confirm before another copy is created.

### Upgrading an existing database

Back up the database and stop application writes before upgrading. Run `npm run db:upgrade` to update the schema and backfill legacy author details; the backfill runs only if the schema update succeeds. Fresh databases have no legacy data to backfill.

## Checks

```bash
npm run test:design && npm run lint && npm run typecheck && npm run build
```

Smoke test against a real database (creates and cleans up its own throwaway data):

```bash
npm run smoke
```

Board integrity test (drag & drop ordering, concurrent moves, sprint start/finish races, column deletion, cascade delete). Point it at a throwaway database; a pool limit above 1 makes the concurrency checks run in parallel:

```bash
DATABASE_POOL_LIMIT=8 npm run test:board
```

## License

MIT — see [`LICENSE`](LICENSE). Original author: Tapiz Labs.
