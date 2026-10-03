import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { projectsService } from "@/application/projects.service";
import { usersService } from "@/application/users.service";
import { fullName, type ProjectDto, type Role, type UserDto } from "@/domain/types";

export interface SessionUser {
  id: string;
  role: Role;
  name: string;
}

export class UnauthorizedError extends Error {
  constructor(message = "Nemate dozvolu za ovu akciju") {
    super(message);
  }
}

/** Route that clears a session whose account was deactivated/deleted (see api/session/end). */
export const REVOKED_SESSION_PATH = "/api/session/end";

export type SessionState =
  | { kind: "anonymous" }
  | { kind: "revoked" }
  | { kind: "active"; user: SessionUser; profile: UserDto };

/**
 * Resolves the JWT session against the database. The JWT alone stays valid for
 * its whole lifetime, so a deactivated/deleted account or a changed role must be
 * enforced here. `usersService.getById` is request-cached, so layout + page +
 * guards share one query.
 */
export async function resolveSession(): Promise<SessionState> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { kind: "anonymous" };
  const profile = await usersService.getById(id);
  if (!profile || !profile.isActive) return { kind: "revoked" };
  return {
    kind: "active",
    user: { id: profile.id, role: profile.role, name: fullName(profile) },
    profile,
  };
}

/** Page-side variant: anonymous → /login, revoked → sign out. */
export async function requirePageSession(): Promise<{ user: SessionUser; profile: UserDto }> {
  const state = await resolveSession();
  if (state.kind === "anonymous") redirect("/login");
  if (state.kind === "revoked") redirect(REVOKED_SESSION_PATH);
  return { user: state.user, profile: state.profile };
}

export async function requireUser(): Promise<SessionUser> {
  const state = await resolveSession();
  if (state.kind !== "active") throw new UnauthorizedError("Niste prijavljeni");
  return state.user;
}

/** Instance/account management privileges — admin only. No special project/board rights. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new UnauthorizedError();
  return user;
}

async function requireProject(projectId: string): Promise<ProjectDto> {
  const projectResult = await projectsService.getById(projectId);
  if (!projectResult.ok) throw new UnauthorizedError(projectResult.error);
  return projectResult.data;
}

/** Whether the user manages the project's board (currently: owner only). */
export function canManageProject(project: ProjectDto, user: SessionUser): boolean {
  return project.ownerId === user.id;
}

/** Owner of the project — trash, restore, permanent delete. */
export async function requireProjectOwner(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectDto }> {
  const user = await requireUser();
  const project = await requireProject(projectId);
  if (project.ownerId !== user.id) {
    throw new UnauthorizedError("Samo vlasnik projekta može ovu akciju");
  }
  return { user, project };
}

/** Manages the project board (columns, members, public link, moderation): owner only. */
export async function requireProjectManager(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectDto }> {
  const user = await requireUser();
  const project = await requireProject(projectId);
  if (!canManageProject(project, user)) {
    throw new UnauthorizedError("Samo vlasnik projekta može ovu akciju");
  }
  return { user, project };
}

/**
 * Access to the board/project: any active user on this deployment (open-access
 * model). Returns the project too so callers can derive moderation rights
 * without a second lookup.
 */
export async function requireProjectMember(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectDto; canManage: boolean }> {
  const user = await requireUser();
  const project = await requireProject(projectId);
  return { user, project, canManage: canManageProject(project, user) };
}
