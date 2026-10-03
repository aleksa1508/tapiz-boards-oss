import { z } from "zod";

export const storySchema = z.object({
  title: z.string().trim().min(1, "Naslov je obavezan").max(255, "Naslov je predugačak"),
  description: z.string().trim().max(5000, "Opis je predugačak").optional().default(""),
});
export type StoryInput = z.infer<typeof storySchema>;

/** Detalji story-ja iz Jira-style modala: dodela, poeni, sprint, kolona, prioritet, rok. */
export const storyDetailsSchema = z.object({
  assigneeId: z.string().min(1).nullable().default(null),
  storyPoints: z
    .number()
    .int("Story points moraju biti ceo broj")
    .min(0, "Story points ne mogu biti negativni")
    .max(100, "Story points su preveliki")
    .nullable()
    .default(null),
  sprintId: z.string().min(1).nullable().default(null),
  columnId: z.string().min(1).nullable().default(null),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum roka")
    .nullable()
    .default(null),
});
export type StoryDetailsInput = z.infer<typeof storyDetailsSchema>;

export const storyTaskSchema = z.object({
  title: z.string().trim().min(1, "Naziv stavke je obavezan").max(255, "Naziv je predugačak"),
});
export type StoryTaskInput = z.infer<typeof storyTaskSchema>;

export const moveStorySchema = z.object({
  storyId: z.string().min(1),
  toColumnId: z.string().min(1).nullable().default(null),
  toIndex: z.number().int().min(0).max(100_000),
});
export type MoveStoryInput = z.infer<typeof moveStorySchema>;

export const commentSchema = z.object({
  storyId: z.string().min(1),
  body: z.string().trim().min(1, "Komentar ne može biti prazan").max(2000),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const columnSchema = z.object({
  name: z.string().trim().min(1, "Naziv kolone je obavezan").max(100),
});
