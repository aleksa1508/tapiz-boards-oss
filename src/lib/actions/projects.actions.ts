"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createProjectSchema, repoUrlSchema } from "@/domain/validation/project.schema";
import { projectsService } from "@/application/projects.service";
import { eventsService } from "@/application/events.service";
import { usersService } from "@/application/users.service";
import { fullName, type UserDto } from "@/domain/types";
import {
  requireProjectManager,
  requireProjectMember,
  requireProjectOwner,
  requireUser,
} from "@/lib/guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { runAction } from "./helpers";

const idSchema = z.string().min(1);

export async function addProjectMemberAction(projectId: unknown, userId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    const { user } = await requireProjectManager(id);
    const memberId = idSchema.parse(userId);
    const result = await projectsService.addMember(id, memberId);
    if (!result.ok) return result;
    await eventsService.log(id, user.id, "member_added", fullName(result.data));
    revalidatePath("/");
    return ok(undefined);
  });
}

export async function removeProjectMemberAction(
  projectId: unknown,
  userId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    const { user, project } = await requireProjectManager(id);
    const memberId = idSchema.parse(userId);
    if (project.ownerId === memberId) {
      return fail("Vlasnik projekta se ne može ukloniti");
    }
    const member = await usersService.getById(memberId);
    await projectsService.removeMember(id, memberId);
    await eventsService.log(id, user.id, "member_removed", member ? fullName(member) : "");
    revalidatePath("/");
    return ok(undefined);
  });
}

/** Active accounts the owner can add to the project (membership = assignable to stories). */
export async function getMemberCandidatesAction(projectId: unknown): Promise<ActionResult<UserDto[]>> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectManager(id);
    return ok(await usersService.listActive());
  });
}

export async function getProjectMembersAction(
  projectId: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof projectsService.members>>>> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectMember(id);
    return ok(await projectsService.members(id));
  });
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<{ projectId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await projectsService.create(user.id, parsed.data.name);
    if (!result.ok) return result;
    revalidatePath("/");
    return ok({ projectId: result.data.id });
  });
}

// ── Public read-only board link ─────────────────────────────────────────────

export async function enablePublicLinkAction(
  projectId: unknown,
): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectManager(id);
    const token = await projectsService.enablePublicLink(id);
    revalidatePath(`/projects/${id}/board`);
    return ok({ token });
  });
}

export async function disablePublicLinkAction(projectId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectManager(id);
    await projectsService.disablePublicLink(id);
    revalidatePath(`/projects/${id}/board`);
    return ok(undefined);
  });
}

// ── Public GitHub repo link ──────────────────────────────────────────────────

export async function setProjectRepoAction(projectId: unknown, url: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    const { user } = await requireProjectMember(id);
    const parsed = repoUrlSchema.safeParse(url);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    await projectsService.setRepoUrl(id, parsed.data);
    await eventsService.log(id, user.id, "repo_linked", parsed.data);
    revalidatePath(`/projects/${id}/board`);
    return ok(undefined);
  });
}

export async function clearProjectRepoAction(projectId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectMember(id);
    await projectsService.setRepoUrl(id, null);
    revalidatePath(`/projects/${id}/board`);
    return ok(undefined);
  });
}

// ── Trash ────────────────────────────────────────────────────────────────────

export async function softDeleteProjectAction(projectId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectOwner(id);
    const result = await projectsService.softDelete(id);
    if (!result.ok) return result;
    revalidatePath("/");
    revalidatePath("/trash");
    return ok(undefined);
  });
}

export async function restoreProjectAction(projectId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    const user = await requireUser();
    const result = await projectsService.restore(id, user.id);
    if (!result.ok) return result;
    revalidatePath("/");
    revalidatePath("/trash");
    return ok(undefined);
  });
}

export async function permanentDeleteProjectAction(projectId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    const user = await requireUser();
    const result = await projectsService.permanentDelete(id, user.id);
    if (!result.ok) return result;
    revalidatePath("/trash");
    return ok(undefined);
  });
}
