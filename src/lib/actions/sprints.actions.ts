"use server";

import { z } from "zod";
import {
  finishSprintSchema,
  retroItemSchema,
  sprintSchema,
  sprintStatusSchema,
} from "@/domain/validation/sprint.schema";
import { sprintsService } from "@/application/sprints.service";
import { eventsService } from "@/application/events.service";
import { requireProjectMember } from "@/lib/guards";
import { revalidateBoard } from "@/lib/revalidate";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { runAction } from "./helpers";

const idSchema = z.string().min(1);

export async function createSprintAction(projectId: unknown, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const parsed = sprintSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    await sprintsService.create(pid, parsed.data);
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function setSprintStatusAction(
  projectId: unknown,
  sprintId: unknown,
  status: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsedStatus = sprintStatusSchema.safeParse(status);
    if (!parsedStatus.success) return fail("Nepoznat status sprinta");
    const sprintResult = await sprintsService.setStatus(pid, idSchema.parse(sprintId), parsedStatus.data);
    if (!sprintResult.ok) return sprintResult;
    const sprint = sprintResult.data;
    if (parsedStatus.data === "active") {
      await eventsService.log(pid, user.id, "sprint_started", sprint.name);
    } else if (parsedStatus.data === "completed") {
      await eventsService.log(pid, user.id, "sprint_completed", sprint.name);
    }
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function undoSprintStartAction(projectId: unknown, sprintId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const result = await sprintsService.undoStart(pid, idSchema.parse(sprintId));
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function finishSprintAction(
  projectId: unknown,
  sprintId: unknown,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = finishSprintSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await sprintsService.finishSprint(
      pid,
      idSchema.parse(sprintId),
      parsed.data.targetSprintId,
    );
    if (!result.ok) return result;
    await eventsService.log(pid, user.id, "sprint_completed", result.data.sprint.name);
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteSprintAction(projectId: unknown, sprintId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const result = await sprintsService.remove(pid, idSchema.parse(sprintId));
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

// ── Sprint retrospective ─────────────────────────────────────────────────────

export async function getSprintRetroAction(
  projectId: unknown,
  sprintId: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof sprintsService.getRetro>> extends ActionResult<infer T> ? T : never>> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    return await sprintsService.getRetro(pid, idSchema.parse(sprintId));
  });
}

export async function addSprintRetroItemAction(
  projectId: unknown,
  sprintId: unknown,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = retroItemSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await sprintsService.addRetroItem(pid, idSchema.parse(sprintId), user.id, parsed.data);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteSprintRetroItemAction(
  projectId: unknown,
  itemId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user, canManage: canModerate } = await requireProjectMember(pid);
    const result = await sprintsService.removeRetroItem(pid, idSchema.parse(itemId), user.id, canModerate);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}
