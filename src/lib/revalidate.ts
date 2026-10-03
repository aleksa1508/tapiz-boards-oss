import { revalidatePath } from "next/cache";

/** Refreshes the cached server-rendered project pages after a board mutation. */
export function revalidateBoard(projectId: string): void {
  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}/sprints`);
}
