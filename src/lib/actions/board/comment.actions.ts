"use server";

import { z } from "zod";
import { commentSchema } from "@/domain/validation/story.schema";
import { boardService } from "@/application/board.service";
import { eventsService } from "@/application/events.service";
import { requireProjectMember } from "@/lib/guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { runAction } from "../helpers";
import { revalidateBoard } from "@/lib/revalidate";

const idSchema = z.string().min(1);

export async function addCommentAction(projectId: unknown, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user } = await requireProjectMember(pid);
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const storyResult = await boardService.getProjectStory(pid, parsed.data.storyId);
    if (!storyResult.ok) return storyResult;
    const story = storyResult.data;
    await boardService.addComment(parsed.data.storyId, user.id, parsed.data.body);
    await eventsService.log(pid, user.id, "comment_added", story.title, story.id);
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteCommentAction(
  projectId: unknown,
  commentId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    const { user, canManage: canModerate } = await requireProjectMember(pid);
    const result = await boardService.removeComment(pid, idSchema.parse(commentId), user.id, canModerate);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function getCommentsAction(
  projectId: unknown,
  storyId: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof boardService.getComments>>>> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectMember(pid);
    const storyResult = await boardService.getProjectStory(pid, idSchema.parse(storyId));
    if (!storyResult.ok) return storyResult;
    return ok(await boardService.getComments(storyResult.data.id));
  });
}
