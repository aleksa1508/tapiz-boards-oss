"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserDto } from "@/domain/types";
import { projectImportService } from "@/application/project-import.service";
import {
  projectImportRelationshipError,
  projectImportSchema,
} from "@/domain/validation/project-import.schema";
import { requireAdmin, requireUser } from "@/lib/guards";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { usersService } from "@/application/users.service";
import { runAction } from "./helpers";

const userMappingsSchema = z.record(z.string().uuid(), z.string().uuid());
const sourceProjectIdSchema = z.string().uuid();
const MAX_IMPORT_JSON_BYTES = 9 * 1024 * 1024;

export async function checkProjectImportDuplicateAction(
  sourceProjectIdInput: unknown,
): Promise<ActionResult<{ importedAt: string | null } | null>> {
  return runAction(async () => {
    await requireUser();
    const sourceProjectId = sourceProjectIdSchema.safeParse(sourceProjectIdInput);
    if (!sourceProjectId.success) return fail("ID izvornog projekta nije ispravan.");
    return ok(await projectImportService.findExistingImport(sourceProjectId.data));
  });
}

export async function getProjectImportUsersAction(): Promise<ActionResult<UserDto[]>> {
  return runAction(async () => {
    await requireAdmin();
    return ok(await usersService.listActive());
  });
}

export async function importProjectAction(
  input: unknown,
  mappingsInput: unknown,
  confirmDuplicateInput: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof projectImportService.import>>>> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = projectImportSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${issue.path.join(".")}: ${issue.message}`);
    }
    if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > MAX_IMPORT_JSON_BYTES) {
      return fail("JSON datoteka prelazi ograničenje od 9 MB.");
    }

    const relationshipError = projectImportRelationshipError(parsed.data);
    if (relationshipError) return fail(relationshipError);

    const mappings = userMappingsSchema.safeParse(mappingsInput);
    if (!mappings.success) return fail("Mapiranje korisnika nije ispravno.");
    const confirmDuplicate = z.boolean().safeParse(confirmDuplicateInput);
    if (!confirmDuplicate.success) return fail("Potvrda ponovnog uvoza nije ispravna.");
    if (Object.keys(mappings.data).length > 0 && user.role !== "admin") {
      return fail("Samo administrator može povezati uvezene autore s lokalnim nalozima.");
    }

    const result = await projectImportService.import(
      parsed.data,
      user.id,
      mappings.data,
      confirmDuplicate.data,
    );
    if (result.status === "imported") revalidatePath("/");
    return ok(result);
  });
}
