import { strToU8, zipSync } from "fflate";

export function createCsvArchive(files: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([filename, csv]) => [filename, strToU8(csv)]),
    ),
  );
}
