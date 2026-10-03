"use server";

import { z } from "zod";
import {
  moveStorySchema,
  storyDetailsSchema,
  storySchema,
} from "@/domain/validation/story.schema";
import { boardService } from "@/application/board.service";
import { eventsService } from "@/application/events.service";
import { requireProjectMember } from "@/lib/guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { runAction } from "../helpers";
import { revalidateBoard } from "@/lib/revalidate";

const idSchema = z.string().min(1);

async function columnLabel(projectId: string, columnId: string | null): Promise<string> {
  if (columnId === null) return "Backlog";
  const columns = await boardService.getColumns(projectId);
  return columns.find((col) => col.id === columnId)?.name ?? "—";
}

export async function createStoryAction(
  projectId: unknown,
  input: unknown,
  columnId?: unknown,
  sprintId?: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = storySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const col = columnId == null ? null : idSchema.parse(columnId);
    const sid = sprintId == null ? null : idSchema.parse(sprintId);
    const result = await boardService.createStory(pid, user.id, { ...parsed.data, columnId: col, sprintId: sid });
    if (!result.ok) return result;
    await eventsService.log(pid, user.id, "story_created", parsed.data.title);
    revalidateBoard(pid);
    return ok(undefined);
  });
}

/** Updates title/description and details in one HTTP call — used by StoryDetailPanel. */
export async function updateStoryFullAction(
  projectId: unknown,
  storyId: unknown,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = z
      .object({
        title: storySchema.shape.title,
        description: storySchema.shape.description,
        assigneeId: storyDetailsSchema.shape.assigneeId,
        storyPoints: storyDetailsSchema.shape.storyPoints,
        sprintId: storyDetailsSchema.shape.sprintId,
        columnId: storyDetailsSchema.shape.columnId,
        priority: storyDetailsSchema.shape.priority,
        dueDate: storyDetailsSchema.shape.dueDate,
      })
      .safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const storyResult = await boardService.getProjectStory(pid, idSchema.parse(storyId));
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    const { title, description, ...details } = parsed.data;
    const result = await boardService.updateStoryFull(pid, story, { title, description }, details);
    if (!result.ok) return result;
    await eventsService.log(pid, user.id, "story_updated", title, story.id);
    if (details.columnId !== story.columnId) {
      const label = await columnLabel(pid, details.columnId);
      await eventsService.log(pid, user.id, "story_moved", `${title} → ${label}`, story.id);
    }
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteStoryAction(projectId: unknown, storyId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const storyResult = await boardService.getProjectStory(pid, idSchema.parse(storyId));
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    await boardService.removeStory(story.id);
    await eventsService.log(pid, user.id, "story_deleted", story.title);
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function moveStoryAction(projectId: unknown, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = moveStorySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await boardService.moveStory(pid, parsed.data);
    if (!result.ok) return result;
    const story = result.data;
    if (parsed.data.toColumnId !== story.columnId) {
      const label = await columnLabel(pid, parsed.data.toColumnId);
      await eventsService.log(pid, user.id, "story_moved", `${story.title} → ${label}`, story.id);
    }
    revalidateBoard(pid);
    return ok(undefined);
  });
}
