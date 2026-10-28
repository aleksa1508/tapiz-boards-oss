import type { ProjectExportData } from "@/domain/types";
import { createCsvArchive } from "./archive";
import { createProjectCsvFiles } from "./csv";
import { downloadBlob } from "./download";

export type ProjectExportFormat = "csv" | "json";

function createExportBaseName(projectName: string): string {
  return projectName
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "projekat";
}

export function downloadProjectExport(data: ProjectExportData, format: ProjectExportFormat): void {
  const baseName = createExportBaseName(data.project.name);

  if (format === "json") {
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }),
      `${baseName}-export.json`,
    );
    return;
  }

  const archive = createCsvArchive(createProjectCsvFiles(data));
  const archiveBuffer = new ArrayBuffer(archive.byteLength);
  new Uint8Array(archiveBuffer).set(archive);
  downloadBlob(new Blob([archiveBuffer], { type: "application/zip" }), `${baseName}-export.zip`);
}
