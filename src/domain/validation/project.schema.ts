import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Naziv projekta mora imati bar 3 znaka")
    .max(100, "Naziv projekta može imati najviše 100 znakova"),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Public GitHub repo: https://github.com/owner/repo (no subpaths). */
export const repoUrlSchema = z
  .string()
  .trim()
  .regex(
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/,
    "Link mora biti oblika https://github.com/vlasnik/repo",
  )
  .transform((url) => url.replace(/\/$/, ""));

/** Calendar day / month range (yyyy-mm-dd). */
export const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum")
  .refine((day) => !Number.isNaN(Date.parse(`${day}T00:00:00Z`)), "Neispravan datum");
