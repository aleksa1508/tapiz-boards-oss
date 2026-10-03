import { notFound } from "next/navigation";
import { projectsService } from "@/application/projects.service";
import type { ProjectDto } from "@/domain/types";
import { canManageProject, requirePageSession, type SessionUser } from "@/lib/guards";

export interface ProjectPageContext {
  user: SessionUser;
  project: ProjectDto;
  /** Whether the user manages the project (owner). */
  canManage: boolean;
}

/** Server-side access check for project pages: any active user can view
 * and work on any project on this deployment; owner can manage. */
export async function requireProjectPageAccess(projectId: string): Promise<ProjectPageContext> {
  const { user } = await requirePageSession();
  const projectResult = await projectsService.getById(projectId);
  if (!projectResult.ok) notFound();
  const project = projectResult.data;
  return { user, project, canManage: canManageProject(project, user) };
}
