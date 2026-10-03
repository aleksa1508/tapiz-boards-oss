/**
 * One-off local dev seed: a couple of member accounts, two projects with
 * seeded columns, an active sprint, and a handful of stories spread across
 * columns/priorities. Safe to re-run — skips accounts/projects that already
 * exist by name/email. Not for production use.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/infrastructure/db/client";
import { boardColumns, sprints, stories, users } from "../src/infrastructure/db/schema";
import { usersService } from "../src/application/users.service";
import { projectsService } from "../src/application/projects.service";

async function ensureUser(email: string, firstName: string, lastName: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const result = await usersService.createByAdmin({
    email,
    password: "Member1234!",
    firstName,
    lastName,
    role: "member",
  });
  if (!result.ok) throw new Error(result.error);
  console.log(`  created user: ${email} / Member1234!`);
  return { id: result.data.id, email, firstName, lastName };
}

async function ensureProject(ownerId: string, name: string) {
  const result = await projectsService.create(ownerId, name);
  if (!result.ok) throw new Error(result.error);
  console.log(`  created project: ${name}`);
  return result.data;
}

async function seedProjectContent(projectId: string, authorId: string, assigneeId: string) {
  const cols = await db.select().from(boardColumns).where(eq(boardColumns.projectId, projectId));
  const todo = cols.find((c) => c.name === "TO DO")!;
  const inProgress = cols.find((c) => c.name === "IN PROGRESS")!;
  const done = cols.find((c) => c.name === "DONE")!;

  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 13 * 86400000).toISOString().slice(0, 10);

  const sprintId = crypto.randomUUID();
  await db.insert(sprints).values({
    id: sprintId,
    projectId,
    name: "Sprint 1",
    goal: "Isporučiti MVP",
    startDate: start,
    endDate: end,
    status: "active",
  });

  const storyRows: (typeof stories.$inferInsert)[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      columnId: todo.id,
      sprintId,
      title: "Postaviti autentifikaciju",
      description: "Login/logout tok i zaštita ruta.",
      position: 0,
      authorId,
      assigneeId,
      priority: "high",
      storyPoints: 5,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      columnId: todo.id,
      sprintId,
      title: "Napraviti model podataka",
      position: 1,
      authorId,
      priority: "medium",
      storyPoints: 3,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      columnId: inProgress.id,
      sprintId,
      title: "Board filteri",
      description: "Pretraga, dodela, prioritet.",
      position: 0,
      authorId,
      assigneeId,
      priority: "medium",
      storyPoints: 3,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      columnId: done.id,
      sprintId,
      title: "Repo i CI",
      position: 0,
      authorId,
      priority: "low",
      storyPoints: 2,
    },
  ];
  await db.insert(stories).values(storyRows);
  console.log(`  seeded sprint + ${storyRows.length} stories for project ${projectId}`);
}

async function main() {
  console.log("Seeding dev data...");

  const admin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@local.test"))
    .limit(1);
  if (!admin[0]) throw new Error("Run create-admin first (admin@local.test not found)");

  const mina = await ensureUser("mina@local.test", "Mina", "Petrović");
  const luka = await ensureUser("luka@local.test", "Luka", "Jovanović");

  const projectA = await ensureProject(admin[0].id, "Redizajn veb sajta");
  const projectB = await ensureProject(mina.id, "Mobilna aplikacija");

  await seedProjectContent(projectA.id, admin[0].id, mina.id);
  await seedProjectContent(projectB.id, mina.id, luka.id);

  console.log("Done. Test accounts:");
  console.log("  admin@local.test / Admin1234!");
  console.log("  mina@local.test / Member1234!");
  console.log("  luka@local.test / Member1234!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
