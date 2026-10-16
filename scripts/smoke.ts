/**
 * End-to-end smoke test against a real database (DATABASE_URL from .env).
 * Exercises: admin bootstrap, member creation, uncapped projects/members, project lifecycle incl. Trash,
 * the last-admin-standing rule, and login without register/LMS.
 *
 * Creates and cleans up its own throwaway users/projects — safe to run
 * against a dev database, not intended for production data.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/infrastructure/db/client";
import { users } from "../src/infrastructure/db/schema";
import { usersService } from "../src/application/users.service";
import { projectsService } from "../src/application/projects.service";
import { projectsRepo } from "../src/infrastructure/repositories/projects.repo";

const RUN_ID = Date.now();
const ADMIN_EMAIL = `smoke-admin-${RUN_ID}@example.com`;
const MEMBER_EMAIL = `smoke-member-${RUN_ID}@example.com`;

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok  - ${label}`);
  } else {
    console.error(`FAIL  - ${label}`);
    failures++;
  }
}

async function main() {
  console.log("Smoke test starting...\n");

  // 1. Admin bootstrap (mirrors scripts/create-admin.ts).
  const adminPasswordHash = await bcrypt.hash("smoke-admin-pass-1", 10);
  const [admin] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      firstName: "Smoke",
      lastName: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    })
    .$returningId();
  check("admin bootstrap: row inserted", !!admin.id);

  // 2. Member creation via usersService (same path as the admin UI).
  const memberResult = await usersService.createByAdmin({
    firstName: "Smoke",
    lastName: "Member",
    email: MEMBER_EMAIL,
    password: "smoke-member-pass-1",
    role: "member",
  });
  check("member creation succeeds", memberResult.ok);
  const memberId = memberResult.ok ? memberResult.data.id : null;

  // 3. Login without register/LMS: verify credentials resolve via bcrypt.compare,
  //    the same check src/lib/auth.ts performs — no SSO/register path exists.
  const memberRecord = await usersService.getById(memberId!);
  check("member is active and role=member", memberRecord?.isActive === true && memberRecord?.role === "member");
  const storedHash = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, memberId!))
    .limit(1);
  const passwordMatches = await bcrypt.compare("smoke-member-pass-1", storedHash[0]?.passwordHash ?? "");
  check("login credential check succeeds (bcrypt)", passwordMatches);

  // 4. Project lifecycle: create -> soft-delete -> trash list -> restore -> permanent delete.
  const createResult = await projectsService.create(admin.id, `Smoke Project ${RUN_ID}`);
  check("project create succeeds", createResult.ok);
  const projectId = createResult.ok ? createResult.data.id : null;

  if (projectId) {
    const seededColumns = await db.query.boardColumns.findMany({ where: (c, { eq }) => eq(c.projectId, projectId) });
    check("project seeded with 3 default columns", seededColumns.length === 3);

    // No free-plan caps: each extra project has a board, and project membership
    // is unrestricted. Exercise counts higher than common freemium thresholds.
    const extraProjectIds: string[] = [];
    for (let index = 0; index < 5; index++) {
      const result = await projectsService.create(admin.id, `Smoke Extra Project ${RUN_ID}-${index}`);
      if (result.ok) extraProjectIds.push(result.data.id);
    }
    check("six projects/boards can be created by one user", extraProjectIds.length === 5);

    const extraMemberIds: string[] = [];
    for (let index = 0; index < 9; index++) {
      const result = await usersService.createByAdmin({
        firstName: "Smoke",
        lastName: `Extra${index}`,
        email: `smoke-extra-member-${RUN_ID}-${index}@example.com`,
        password: "smoke-extra-member-pass-1",
        role: "member",
      });
      if (result.ok) extraMemberIds.push(result.data.id);
    }
    const memberIdsToAdd = [...(memberId ? [memberId] : []), ...extraMemberIds];
    let addedCount = 0;
    for (const id of memberIdsToAdd) {
      if ((await projectsService.addMember(projectId, id)).ok) addedCount++;
      if (addedCount === 5) {
        check("the sixth member can join (past the hosted free-plan limit)", (await projectsService.members(projectId)).length === 6);
      }
      if (addedCount === 9) {
        check("a board supports ten members including its owner", (await projectsService.members(projectId)).length === 10);
      }
    }
    const allMembers = await projectsService.members(projectId);
    check(
      "ten additional members persist alongside the owner (eleven total)",
      addedCount === 10 && allMembers.length === 11 && memberIdsToAdd.every((id) => allMembers.some((member) => member.userId === id)),
    );

    await projectsService.softDelete(projectId);
    const afterSoftDelete = await projectsRepo.findById(projectId);
    check("soft-deleted project excluded from normal findById", afterSoftDelete === null);

    const trash = await projectsService.listTrashForUser(admin.id);
    check("soft-deleted project appears in trash", trash.some((p) => p.id === projectId));

    await projectsService.restore(projectId, admin.id);
    const afterRestore = await projectsRepo.findById(projectId);
    check("restored project visible again via findById", afterRestore?.id === projectId);

    // Permanent delete only works from Trash, exactly like the UI action.
    await projectsService.softDelete(projectId);
    await projectsService.permanentDelete(projectId, admin.id);
    const afterPermanentDelete = await projectsRepo.findByIdIncludingDeleted(projectId);
    check("permanently deleted project is gone (including deleted)", afterPermanentDelete === null);

    const orphanColumns = await db.query.boardColumns.findMany({ where: (c, { eq }) => eq(c.projectId, projectId) });
    check("permanent delete cascades — no orphaned columns", orphanColumns.length === 0);

    for (const id of extraProjectIds) {
      await projectsService.softDelete(id);
      await projectsService.permanentDelete(id, admin.id);
    }
    for (const id of extraMemberIds) await db.delete(users).where(eq(users.id, id));
  }

  // 5. Last-admin-standing rule: deactivating/deleting the sole admin must be blocked.
  const onlyAdminId = admin.id;
  const otherAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  const isOnlyAdmin = otherAdmins.length === 1 && otherAdmins[0].id === onlyAdminId;
  if (isOnlyAdmin) {
    const deactivateResult = await usersService.setActive(onlyAdminId, false);
    check("deactivating the last admin is blocked", !deactivateResult.ok);
    const deleteResult = await usersService.adminDeleteUser(onlyAdminId);
    check("deleting the last admin is blocked", !deleteResult.ok);
  } else {
    console.log("  skip - last-admin-standing checks (other admins exist on this instance)");
  }

  // Cleanup — remove the throwaway member; admin is removable only if no other
  // admin exists to take its place, so we leave it deactivated-safe by deleting directly.
  if (memberId) await db.delete(users).where(eq(users.id, memberId));
  await db.delete(users).where(eq(users.id, admin.id));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
