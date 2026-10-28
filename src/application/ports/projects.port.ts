import type { ProjectDto, ProjectMemberDto, ProjectExportMember } from "@/domain/types";

export interface ProjectsRepo {
  /** All non-deleted projects the user is a member of. */
  listForUser(userId: string): Promise<ProjectDto[]>;
  /** Every non-deleted project, regardless of membership. */
  listAll(): Promise<ProjectDto[]>;
  /** Non-deleted projects owned by the user that are in Trash — used by the Trash view. */
  listTrashForUser(userId: string): Promise<ProjectDto[]>;
  findById(id: string): Promise<ProjectDto | null>;
  createdAt(id: string): Promise<Date | null>;
  /** Same as findById but also returns soft-deleted projects — used by restore/permanent-delete. */
  findByIdIncludingDeleted(id: string): Promise<ProjectDto | null>;
  findByPublicToken(token: string): Promise<ProjectDto | null>;
  setPublicToken(projectId: string, token: string | null): Promise<void>;
  setRepoUrl(projectId: string, url: string | null): Promise<void>;
  /** Creates a project with default board columns and the owner as its first member. */
  create(ownerId: string, name: string): Promise<ProjectDto>;
  softDelete(id: string): Promise<void>;
  /** Restores a trashed project of `ownerId`; false if no such project is in Trash. */
  restore(id: string, ownerId: string): Promise<boolean>;
  /** Permanently deletes a trashed project of `ownerId` and all child data
   * (columns, sprints, stories, comments, events, members); false if none matched. */
  permanentDelete(id: string, ownerId: string): Promise<boolean>;
  transferOwnership(id: string, newOwnerId: string): Promise<void>;
  /** Projects owned by the user, including Trash — used by admin account-deletion checks. */
  countOwnedByUser(userId: string): Promise<number>;
  members(projectId: string): Promise<ProjectMemberDto[]>;
  membersForExport(projectId: string): Promise<ProjectExportMember[]>;
  isMember(projectId: string, userId: string): Promise<boolean>;
  /** False when the user is already a member (primary key conflict). */
  addMember(projectId: string, userId: string): Promise<boolean>;
  removeMember(projectId: string, userId: string): Promise<void>;
}
