"use server";

import { z } from "zod";
import { storyTaskSchema } from "@/domain/validation/story.schema";
import { boardService } from "@/application/board.service";
import { eventsService } from "@/application/events.service";
import { requireProjectMember } from "@/lib/guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { runAction } from "../helpers";
import { revalidateBoard } from "@/lib/revalidate";

const idSchema = z.string().min(1);

export async function getStoryTasksAction(
  projectId: unknown,
  storyId: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof boardService.getTasks>> extends ActionResult<infer T> ? T : never>> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    return await boardService.getTasks(pid, idSchema.parse(storyId));
  });
}

export async function addStoryTaskAction(
  projectId: unknown,
  storyId: unknown,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const parsed = storyTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await boardService.addTask(pid, idSchema.parse(storyId), parsed.data.title);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function setStoryTaskDoneAction(
  projectId: unknown,
  taskId: unknown,
  done: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const isDone = z.boolean().parse(done);
    const infoResult = await boardService.setTaskDone(pid, idSchema.parse(taskId), isDone);
    if (!infoResult.ok) return infoResult;
    const info = infoResult.data;
    if (isDone) {
      await eventsService.log(pid, user.id, "task_done", `${info.taskTitle} · ${info.storyTitle}`, info.storyId);
    }
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteStoryTaskAction(projectId: unknown, taskId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const result = await boardService.removeTask(pid, idSchema.parse(taskId));
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}
