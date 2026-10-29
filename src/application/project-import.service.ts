import type { ProjectImportData } from "@/domain/validation/project-import.schema";
import { getProjectImportIdentities } from "@/domain/validation/project-import.schema";
import {
  findExistingProjectImport,
  insertImportedProject,
  type ExistingProjectImport,
  type ProjectImportResult,
} from "@/infrastructure/repositories/project-import.repo";

export const projectImportService = {
  findExistingImport(sourceProjectId: string): Promise<ExistingProjectImport | null> {
    return findExistingProjectImport(sourceProjectId);
  },

  import(
    data: ProjectImportData,
    ownerId: string,
    sourceUserMappings: Record<string, string>,
    confirmDuplicate: boolean,
  ): Promise<ProjectImportResult> {
    const identityIds = new Set(getProjectImportIdentities(data).map((identity) => identity.sourceId));
    if (Object.keys(sourceUserMappings).some((sourceId) => !identityIds.has(sourceId))) {
      throw new Error("Mapiranje sadrži identitet koji ne postoji u datoteci.");
    }
    return insertImportedProject(data, ownerId, sourceUserMappings, confirmDuplicate);
  },
};
