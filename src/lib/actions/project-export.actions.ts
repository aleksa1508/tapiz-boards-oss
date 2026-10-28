"use server";

import { z } from "zod";
import { projectExportService } from "@/application/project-export.service";
import { requireProjectManager } from "@/lib/guards";
import { ok, type ActionResult } from "@/lib/action-result";
import { runAction } from "./helpers";
import type { ProjectExportData } from "@/domain/types";

const projectIdSchema = z.string().uuid();

export async function getProjectExportDataAction(
  projectId: unknown,
): Promise<ActionResult<ProjectExportData>> {
  return runAction(async () => {
    const id = projectIdSchema.parse(projectId);
    const { project } = await requireProjectManager(id);
    return ok(await projectExportService.load(project));
  });
}
