import bcrypt from "bcryptjs";
import type {
  AdminSetPasswordInput,
  ChangePasswordInput,
  CreateUserInput,
  UpdateProfileInput,
} from "@/domain/validation/user.schema";
import type { UserDto } from "@/domain/types";
import { usersRepo, countActiveAdminsExcluding } from "@/infrastructure/repositories/users.repo";
import { projectsRepo } from "@/infrastructure/repositories/projects.repo";
import { fail, ok, type ActionResult } from "@/lib/action-result";

const BCRYPT_ROUNDS = 10;

function isForeignKeyViolation(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } } | null)?.code
    ?? (err as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED";
}

export const usersService = {
  listAll: () => usersRepo.listAll(),
  /** Active accounts only — candidates for project membership. */
  listActive: async () => (await usersRepo.listAll()).filter((user) => user.isActive),
  getById: (id: string) => usersRepo.findById(id),

  /** Admin creates a member/admin account directly — no self-service registration exists. */
  async createByAdmin(input: CreateUserInput): Promise<ActionResult<UserDto>> {
    const byEmail = await usersRepo.findByEmail(input.email);
    if (byEmail) return fail("Nalog sa ovim emailom već postoji");
    return ok(
      await usersRepo.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        role: input.role,
      }),
    );
  },

  async updateMyProfile(userId: string, input: UpdateProfileInput): Promise<ActionResult<UserDto>> {
    const existing = await usersRepo.findById(userId);
    if (!existing) return fail("Korisnik ne postoji");

    const patch: Parameters<typeof usersRepo.update>[1] = {
      firstName: input.firstName,
      lastName: input.lastName,
    };
    if (input.email !== undefined && input.email !== existing.email) {
      const byEmail = await usersRepo.findByEmail(input.email);
      if (byEmail && byEmail.id !== userId) {
        return fail("Nalog sa ovim emailom već postoji");
      }
      patch.email = input.email;
    }
    await usersRepo.update(userId, patch);
    return ok({ ...existing, ...patch, email: patch.email ?? existing.email });
  },

  async changeMyPassword(userId: string, input: ChangePasswordInput): Promise<ActionResult<void>> {
    const record = await usersRepo.findRecordById(userId);
    if (!record) return fail("Korisnik ne postoji");
    const valid = await bcrypt.compare(input.currentPassword, record.passwordHash);
    if (!valid) return fail("Trenutna lozinka nije ispravna");
    await usersRepo.update(userId, { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) });
    return ok(undefined);
  },

  // ── Admin account management ────────────────────────────────────────────

  async adminUpdateUser(
    userId: string,
    input: { firstName: string; lastName: string; email: string },
  ): Promise<ActionResult<UserDto>> {
    const existing = await usersRepo.findById(userId);
    if (!existing) return fail("Korisnik ne postoji");
    if (input.email !== existing.email) {
      const byEmail = await usersRepo.findByEmail(input.email);
      if (byEmail && byEmail.id !== userId) return fail("Nalog sa ovim emailom već postoji");
    }
    await usersRepo.update(userId, input);
    return ok({ ...existing, ...input });
  },

  async adminSetPassword(userId: string, input: AdminSetPasswordInput): Promise<ActionResult<void>> {
    const existing = await usersRepo.findById(userId);
    if (!existing) return fail("Korisnik ne postoji");
    await usersRepo.update(userId, { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) });
    return ok(undefined);
  },

  /** Blocks deactivating the last remaining active admin. */
  async setActive(userId: string, isActive: boolean): Promise<ActionResult<void>> {
    const existing = await usersRepo.findById(userId);
    if (!existing) return fail("Korisnik ne postoji");
    if (!isActive && existing.role === "admin") {
      const remaining = await countActiveAdminsExcluding(userId);
      if (remaining === 0) return fail("Mora postojati bar jedan aktivan administrator");
    }
    await usersRepo.update(userId, { isActive });
    return ok(undefined);
  },

  /** Blocks deleting the last remaining active admin, a project owner (incl. Trash), or an author of existing content. */
  async adminDeleteUser(userId: string): Promise<ActionResult<void>> {
    const existing = await usersRepo.findById(userId);
    if (!existing) return fail("Korisnik ne postoji");
    if (existing.role === "admin") {
      const remaining = await countActiveAdminsExcluding(userId);
      if (remaining === 0) return fail("Mora postojati bar jedan aktivan administrator");
    }
    const ownedProjects = await projectsRepo.countOwnedByUser(userId);
    if (ownedProjects > 0) {
      return fail(
        "Korisnik je vlasnik projekata — prvo prebacite vlasništvo ili obrišite te projekte",
      );
    }
    try {
      await usersRepo.delete(userId);
    } catch (err) {
      // Stories, comments, retro items and activity keep their author (FK restrict).
      if (isForeignKeyViolation(err)) {
        return fail("Korisnik ima sadržaj u projektima — deaktivirajte nalog umesto brisanja");
      }
      throw err;
    }
    return ok(undefined);
  },
};
