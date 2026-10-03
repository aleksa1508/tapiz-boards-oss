"use server";

import { z } from "zod";
import { columnSchema } from "@/domain/validation/story.schema";
import { boardService } from "@/application/board.service";
import { requireProjectManager } from "@/lib/guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { revalidateBoard } from "@/lib/revalidate";
import { runAction } from "../helpers";

const idSchema = z.string().min(1);

/** Empty/NULL = no limit; otherwise an integer 1-99. */
const wipLimitSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(1).max(99).nullable(),
);

export async function createColumnAction(projectId: unknown, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const id = idSchema.parse(projectId);
    await requireProjectManager(id);
    const parsed = columnSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await boardService.createColumn(id, parsed.data.name);
    if (!result.ok) return result;
    revalidateBoard(id);
    return ok(undefined);
  });
}

export async function renameColumnAction(
  projectId: unknown,
  columnId: unknown,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectManager(pid);
    const parsed = columnSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await boardService.renameColumn(pid, idSchema.parse(columnId), parsed.data.name);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function setColumnWipLimitAction(
  projectId: unknown,
  columnId: unknown,
  wipLimit: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectManager(pid);
    const parsed = wipLimitSchema.safeParse(wipLimit);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const result = await boardService.setColumnWipLimit(pid, idSchema.parse(columnId), parsed.data);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function setColumnDoneAction(
  projectId: unknown,
  columnId: unknown,
  isDone: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectManager(pid);
    const done = z.boolean().parse(isDone);
    const result = await boardService.setColumnDone(pid, idSchema.parse(columnId), done);
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}

export async function deleteColumnAction(projectId: unknown, columnId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const pid = idSchema.parse(projectId);
    await requireProjectManager(pid);
    const result = await boardService.removeColumn(pid, idSchema.parse(columnId));
    if (!result.ok) return result;
    revalidateBoard(pid);
    return ok(undefined);
  });
}
