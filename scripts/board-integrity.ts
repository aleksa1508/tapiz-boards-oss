/**
 * Board integrity test against a real database (DATABASE_URL from .env):
 * drag & drop ordering edge cases, hidden-story offsets, concurrent moves,
 * sprint start/finish races, column deletion, partial-update safety and
 * membership idempotency. Creates and removes its own throwaway data.
 *
 *   DATABASE_POOL_LIMIT=8 npm run test:board
 *
 * A pool limit above 1 makes the concurrency checks run truly in parallel.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/infrastructure/db/client";
import { projects, stories, users } from "../src/infrastructure/db/schema";
import { boardService } from "../src/application/board.service";
import { projectsService } from "../src/application/projects.service";
import { sprintsService } from "../src/application/sprints.service";
import { usersService } from "../src/application/users.service";
import type { ActionResult } from "../src/lib/action-result";

const RUN_ID = Date.now();
let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok  - ${label}`);
  } else {
    console.error(`FAIL  - ${label}`, detail ?? "");
    failures++;
  }
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

async function main() {
  console.log("Board integrity test starting...\n");

  const owner = unwrap(
    await usersService.createByAdmin({
      firstName: "Board",
      lastName: "Owner",
      email: `board-owner-${RUN_ID}@example.com`,
      password: "board-owner-pass",
      role: "member",
    }),
  );
  const other = unwrap(
    await usersService.createByAdmin({
      firstName: "Board",
      lastName: "Other",
      email: `board-other-${RUN_ID}@example.com`,
      password: "board-other-pass",
      role: "member",
    }),
  );
  const project = unwrap(await projectsService.create(owner.id, `Board IT ${RUN_ID}`));
  const foreign = unwrap(await projectsService.create(other.id, `Board IT foreign ${RUN_ID}`));
  const pid = project.id;

  try {
    const [todo, doing, done] = await boardService.getColumns(pid);
    await sprintsService.create(pid, { name: "S1", goal: "", startDate: "2026-01-01", endDate: "2026-01-14" });
    await sprintsService.create(pid, { name: "S2", goal: "", startDate: "2026-01-15", endDate: "2026-01-28" });
    const [s1, s2] = await sprintsService.listByProject(pid);
    unwrap(await sprintsService.setStatus(pid, s1.id, "active"));

    const titleIds = new Map<string, string>();
    const create = async (title: string, columnId: string | null, sprintId: string | null = null) => {
      unwrap(await boardService.createStory(pid, owner.id, { title, description: "" , columnId, sprintId }));
      const all = await db.select({ id: stories.id, title: stories.title }).from(stories).where(eq(stories.projectId, pid));
      titleIds.set(title, all.find((s) => s.title === title)!.id);
      return titleIds.get(title)!;
    };
    const titleOf = (id: string) => [...titleIds].find(([, v]) => v === id)?.[0] ?? id;
    const columnOrder = async (columnId: string) => {
      const board = await boardService.getBoard(pid);
      return board.find((c) => c.id === columnId)!.stories.map((s) => titleOf(s.id));
    };
    const move = (title: string, toColumnId: string | null, toIndex: number) =>
      boardService.moveStory(pid, { storyId: titleIds.get(title)!, toColumnId, toIndex });

    // Hidden stories: same column, but in the planned sprint S2 — not visible on the board.
    await create("H1", todo.id, s2.id);
    await create("H2", todo.id, s2.id);
    for (const t of ["A", "B", "C", "D", "E"]) await create(t, todo.id);
    // Put the hidden ones at the top of the shared position space.
    await db.update(stories).set({ position: -2 }).where(eq(stories.id, titleIds.get("H1")!));
    await db.update(stories).set({ position: -1 }).where(eq(stories.id, titleIds.get("H2")!));

    console.log("Ordering within a column (with hidden stories in the same column):");
    check("initial order", sameOrder(await columnOrder(todo.id), ["A", "B", "C", "D", "E"]));
    unwrap(await move("E", todo.id, 0));
    check("last → first", sameOrder(await columnOrder(todo.id), ["E", "A", "B", "C", "D"]), await columnOrder(todo.id));
    unwrap(await move("E", todo.id, 4));
    check("first → last", sameOrder(await columnOrder(todo.id), ["A", "B", "C", "D", "E"]), await columnOrder(todo.id));
    unwrap(await move("A", todo.id, 2));
    check("first → middle", sameOrder(await columnOrder(todo.id), ["B", "C", "A", "D", "E"]), await columnOrder(todo.id));
    unwrap(await move("D", todo.id, 1));
    check("middle → index 1", sameOrder(await columnOrder(todo.id), ["B", "D", "C", "A", "E"]), await columnOrder(todo.id));
    unwrap(await move("B", todo.id, 0));
    check("same-position move is a no-op", sameOrder(await columnOrder(todo.id), ["B", "D", "C", "A", "E"]));
    unwrap(await move("B", todo.id, 999));
    check("out-of-range index clamps to end", sameOrder(await columnOrder(todo.id), ["D", "C", "A", "E", "B"]), await columnOrder(todo.id));

    console.log("\nCross-column moves:");
    unwrap(await move("C", doing.id, 0));
    check("into empty column", sameOrder(await columnOrder(doing.id), ["C"]));
    check("source column closes the gap", sameOrder(await columnOrder(todo.id), ["D", "A", "E", "B"]));
    unwrap(await move("A", doing.id, 1));
    unwrap(await move("E", doing.id, 1));
    check("insert between existing cards", sameOrder(await columnOrder(doing.id), ["C", "E", "A"]), await columnOrder(doing.id));
    unwrap(await move("D", doing.id, 0));
    unwrap(await move("B", doing.id, 4));
    check("source column emptied", (await columnOrder(todo.id)).length === 0);
    check("target column order", sameOrder(await columnOrder(doing.id), ["D", "C", "E", "A", "B"]), await columnOrder(doing.id));

    console.log("\nConcurrent moves on one column:");
    const titles = ["A", "B", "C", "D", "E"];
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => move(titles[i % 5], doing.id, (i * 7) % 5)),
    );
    const afterRace = await db
      .select({ id: stories.id, position: stories.position })
      .from(stories)
      .where(inArray(stories.id, titles.map((t) => titleIds.get(t)!)));
    const positions = afterRace.map((r) => r.position).sort((a, b) => a - b);
    check("positions stay a gap-free permutation 0..n-1", sameOrder(positions.map(String), ["0", "1", "2", "3", "4"]), positions);

    console.log("\nBacklog:");
    const f = await create("F", null);
    const g = await create("G", null);
    unwrap(await move("A", null, 0));
    const story = unwrap(await boardService.getStory(titleIds.get("A")!));
    check("moving an active-sprint story to the backlog leaves the sprint", story.sprintId === null && story.columnId === null);
    const backlog = (await boardService.getBacklog(pid)).map((s) => s.id);
    check("backlog shows it at the drop index", backlog[0] === titleIds.get("A"), backlog.map((id) => titleOf(id)));
    unwrap(await boardService.moveStory(pid, { storyId: g, toColumnId: null, toIndex: 1 }));
    const backlog2 = (await boardService.getBacklog(pid)).map((s) => titleOf(s.id));
    check("backlog reorder lands at the visible index", backlog2[1] === "G", backlog2);
    check("hidden S2 stories stay in the backlog list", backlog2.includes("H1") && backlog2.includes("H2"));
    void f;

    console.log("\nAuthorization boundaries in the service layer:");
    const [foreignTodo] = await boardService.getColumns(foreign.id);
    const crossColumn = await boardService.moveStory(pid, { storyId: titleIds.get("B")!, toColumnId: foreignTodo.id, toIndex: 0 });
    check("cannot move into another project's column", !crossColumn.ok);
    const crossStory = await boardService.moveStory(foreign.id, { storyId: titleIds.get("B")!, toColumnId: null, toIndex: 0 });
    check("cannot move another project's story", !crossStory.ok);
    const crossTask = await boardService.addTask(foreign.id, titleIds.get("B")!, "x");
    check("cannot add a task to another project's story", !crossTask.ok);

    console.log("\nPartial-update safety:");
    const before = unwrap(await boardService.getStory(titleIds.get("B")!));
    const badUpdate = await boardService.updateStoryFull(
      pid,
      before,
      { title: "B renamed", description: "" },
      { assigneeId: null, storyPoints: null, sprintId: "does-not-exist", columnId: null, priority: "high", dueDate: null },
    );
    const after = unwrap(await boardService.getStory(titleIds.get("B")!));
    check("rejected update writes nothing", !badUpdate.ok && after.title === "B" && after.priority === before.priority);
    const goodUpdate = await boardService.updateStoryFull(
      pid,
      before,
      { title: "B renamed", description: "desc" },
      { assigneeId: owner.id, storyPoints: 3, sprintId: s1.id, columnId: done.id, priority: "high", dueDate: "2026-02-01" },
    );
    const updated = unwrap(await boardService.getStory(titleIds.get("B")!));
    check(
      "valid update writes everything at once",
      goodUpdate.ok && updated.title === "B renamed" && updated.columnId === done.id && updated.storyPoints === 3,
    );
    titleIds.set("B renamed", titleIds.get("B")!);
    const nonMember = await boardService.updateStoryFull(
      pid,
      updated,
      { title: "B renamed", description: "desc" },
      { assigneeId: other.id, storyPoints: 3, sprintId: s1.id, columnId: done.id, priority: "high", dueDate: null },
    );
    check("non-member assignee is rejected", !nonMember.ok);

    console.log("\nColumns:");
    const extra = unwrap(await boardService.createColumn(pid, "EXTRA"));
    void extra;
    let cols = await boardService.getColumns(pid);
    const extraCol = cols.find((c) => c.name === "EXTRA")!;
    unwrap(await move("C", extraCol.id, 0));
    unwrap(await boardService.removeColumn(pid, extraCol.id));
    const orphan = unwrap(await boardService.getStory(titleIds.get("C")!));
    const backlog3 = (await boardService.getBacklog(pid)).map((s) => s.id);
    check("deleting a column returns its active-sprint stories to the backlog", orphan.columnId === null && backlog3.includes(orphan.id));
    unwrap(await boardService.removeColumn(pid, doing.id));
    unwrap(await boardService.createColumn(pid, "NEW"));
    cols = await boardService.getColumns(pid);
    const colPositions = cols.map((c) => c.position);
    check("new column position doesn't collide after a deletion", new Set(colPositions).size === colPositions.length, colPositions);
    unwrap(await boardService.setColumnDone(pid, todo.id, true));
    cols = await boardService.getColumns(pid);
    check("exactly one Done column", cols.filter((c) => c.isDone).length === 1 && cols.find((c) => c.isDone)?.id === todo.id);

    console.log("\nSprint state races:");
    const finishes = await Promise.all([
      sprintsService.finishSprint(pid, s1.id, s2.id),
      sprintsService.finishSprint(pid, s1.id, s2.id),
    ]);
    check("a sprint finishes exactly once under concurrency", finishes.filter((r) => r.ok).length === 1, finishes);
    await sprintsService.create(pid, { name: "S3", goal: "", startDate: "2026-02-01", endDate: "2026-02-14" });
    const s3 = (await sprintsService.listByProject(pid)).find((s) => s.name === "S3")!;
    const starts = await Promise.all([
      sprintsService.setStatus(pid, s2.id, "active"),
      sprintsService.setStatus(pid, s3.id, "active"),
    ]);
    const active = (await sprintsService.listByProject(pid)).filter((s) => s.status === "active");
    check("two concurrent starts leave exactly one active sprint", active.length === 1 && starts.filter((r) => r.ok).length === 1, starts);

    console.log("\nMembership:");
    const adds = await Promise.all([projectsService.addMember(pid, other.id), projectsService.addMember(pid, other.id)]);
    const members = await projectsService.members(pid);
    check("double add creates one membership", adds.filter((r) => r.ok).length === 1 && members.filter((m) => m.userId === other.id).length === 1);
    await usersService.setActive(other.id, false);
    await projectsService.removeMember(pid, other.id);
    check("inactive user can't be added", !(await projectsService.addMember(pid, other.id)).ok);

    console.log("\nTrash:");
    check("non-owner can't restore", !(await projectsService.restore(pid, other.id)).ok);
    check("restore of an active project is rejected", !(await projectsService.restore(pid, owner.id)).ok);
    check("permanent delete requires Trash", !(await projectsService.permanentDelete(pid, owner.id)).ok);
    await projectsService.softDelete(pid);
    check("non-owner can't delete permanently", !(await projectsService.permanentDelete(pid, other.id)).ok);
    const purged = await projectsService.permanentDelete(pid, owner.id);
    const leftover = await db.select({ id: stories.id }).from(stories).where(eq(stories.projectId, pid));
    check("permanent delete of a populated project succeeds and cascades", purged.ok && leftover.length === 0, purged);
  } finally {
    await db.delete(stories).where(inArray(stories.projectId, [project.id, foreign.id]));
    await db.delete(projects).where(inArray(projects.id, [project.id, foreign.id]));
    await db.delete(users).where(inArray(users.id, [owner.id, other.id]));
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Board integrity test crashed:", err);
  process.exit(1);
});
