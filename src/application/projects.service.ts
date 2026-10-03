import type { ProjectDto, UserDto } from "@/domain/types";
import { projectsRepo } from "@/infrastructure/repositories/projects.repo";
import { usersRepo } from "@/infrastructure/repositories/users.repo";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export const projectsService = {
  listForUser: (userId: string) => projectsRepo.listForUser(userId),
  listAll: () => projectsRepo.listAll(),
  listTrashForUser: (userId: string) => projectsRepo.listTrashForUser(userId),
  members: (projectId: string) => projectsRepo.members(projectId),
  isMember: (projectId: string, userId: string) => projectsRepo.isMember(projectId, userId),

  async getById(projectId: string): Promise<ActionResult<ProjectDto>> {
    const project = await projectsRepo.findById(projectId);
    if (!project) return fail("Projekat ne postoji");
    return ok(project);
  },

  /** Creates a new project with default board columns; owner becomes the first member. */
  async create(ownerId: string, name: string): Promise<ActionResult<ProjectDto>> {
    return ok(await projectsRepo.create(ownerId, name));
  },

  /** Adds an active account to the project; a repeated request is rejected, not duplicated. */
  async addMember(projectId: string, userId: string): Promise<ActionResult<UserDto>> {
    const user = await usersRepo.findById(userId);
    if (!user || !user.isActive) return fail("Korisnik ne postoji");
    const added = await projectsRepo.addMember(projectId, userId);
    if (!added) return fail("Korisnik je već član ovog projekta");
    return ok(user);
  },

  /** Sadržaj člana (story-ji, komentari) se NE briše — samo članstvo. */
  removeMember: (projectId: string, userId: string) => projectsRepo.removeMember(projectId, userId),

  async findByPublicToken(token: string): Promise<ProjectDto | null> {
    return projectsRepo.findByPublicToken(token);
  },

  /** A new token invalidates the previous public link. */
  async enablePublicLink(projectId: string): Promise<string> {
    const token = crypto.randomUUID();
    await projectsRepo.setPublicToken(projectId, token);
    return token;
  },

  disablePublicLink: (projectId: string) => projectsRepo.setPublicToken(projectId, null),

  /** Public GitHub repo link — entered/edited by members themselves. */
  setRepoUrl: (projectId: string, url: string | null) => projectsRepo.setRepoUrl(projectId, url),

  // ── Trash ────────────────────────────────────────────────────────────────

  async softDelete(projectId: string): Promise<ActionResult<void>> {
    await projectsRepo.softDelete(projectId);
    return ok(undefined);
  },

  /** Only the owner restores, and only a project that is actually in Trash. */
  async restore(projectId: string, ownerId: string): Promise<ActionResult<void>> {
    const restored = await projectsRepo.restore(projectId, ownerId);
    return restored ? ok(undefined) : fail("Projekat ne postoji u kanti za otpatke");
  },

  /** Only the owner deletes permanently, and only from Trash. */
  async permanentDelete(projectId: string, ownerId: string): Promise<ActionResult<void>> {
    const deleted = await projectsRepo.permanentDelete(projectId, ownerId);
    return deleted ? ok(undefined) : fail("Projekat ne postoji u kanti za otpatke");
  },
};
