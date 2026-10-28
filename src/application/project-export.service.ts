import { fullName, type ProjectDto, type ProjectExportData } from "@/domain/types";
import { boardRepo } from "@/infrastructure/repositories/board.repo";
import { eventsRepo } from "@/infrastructure/repositories/events.repo";
import { projectsRepo } from "@/infrastructure/repositories/projects.repo";
import { sprintsRepo } from "@/infrastructure/repositories/sprints.repo";
import { usersRepo } from "@/infrastructure/repositories/users.repo";

export const projectExportService = {
  async load(project: ProjectDto): Promise<ProjectExportData> {
    const [owner, projectCreatedAt] = await Promise.all([
      usersRepo.findById(project.ownerId),
      projectsRepo.createdAt(project.id),
    ]);
    if (!owner) throw new Error("Vlasnik projekta nije pronađen");
    if (!projectCreatedAt) throw new Error("Datum kreiranja projekta nije pronađen");

    const [members, columns, sprints, stories, activities] = await Promise.all([
      projectsRepo.membersForExport(project.id),
      boardRepo.columns(project.id),
      sprintsRepo.listForExport(project.id),
      boardRepo.storiesForExport(project.id),
      eventsRepo.listForExport(project.id),
    ]);

    const storyIds = stories.map((story) => story.id);
    const sprintIds = sprints.map((sprint) => sprint.id);
    const [tasks, comments, retrospectives] = await Promise.all([
      boardRepo.tasksForStories(storyIds),
      boardRepo.commentsForStoriesExport(storyIds),
      sprintsRepo.retroItemsForSprintsExport(sprintIds),
    ]);

    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        ownerId: owner.id,
        ownerName: fullName(owner),
        ownerEmail: owner.email,
        githubRepo: project.repoUrl,
        createdAt: projectCreatedAt.toISOString(),
      },
      members: members.map((member) => ({
        ...member,
        isOwner: member.userId === owner.id,
      })),
      columns,
      sprints,
      stories,
      tasks,
      comments,
      retrospectives,
      activities,
    };
  },
};
