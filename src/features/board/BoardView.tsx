"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  EmptyState,
  InfoBanner,
  SectionCard,
  Surface,
} from "@tapizlabs/ui";
import type {
  BoardColumnWithStories,
  ProjectDto,
  ProjectMemberDto,
  SprintDto,
  StoryDto,
} from "@/domain/types";
import type { SessionUser } from "@/lib/guards";
import { useI18n } from "@/i18n/I18nProvider";
import { ProjectPageHeader } from "./ProjectPageHeader";
import { BoardColumnView } from "./BoardColumnView";
import { StoryCardContent } from "./StoryCard";
import { StoryDetailPanel } from "./story/StoryDetailPanel";
import { StoryCreateForm } from "./StoryCreateForm";
import { ColumnManagerModal } from "./ColumnManagerModal";
import { ProjectSettingsPanel } from "./ProjectSettingsPanel";
import { ProjectMembersModal } from "@/features/projects/ProjectMembersModal";
import { ProjectCalendarPanel } from "./ProjectCalendarPanel";
import { BoardInsightsPanel } from "./BoardInsightsPanel";
import { BoardSprintBar } from "./BoardSprintBar";
import { BoardFilters } from "./board/BoardFilters";
import { useBoardFilters } from "./useBoardFilters";
import { useBoardDragDrop } from "./useBoardDragDrop";
import { ProjectExportPanel } from "./board/ProjectExportPanel";

interface BoardViewProps {
  project: ProjectDto;
  columns: BoardColumnWithStories[];
  members: ProjectMemberDto[];
  sprints: SprintDto[];
  currentUser: SessionUser;
  canManage: boolean;
}

export function BoardView({
  project,
  columns: initial,
  members,
  sprints,
  currentUser,
  canManage,
}: BoardViewProps) {
  const { dict } = useI18n();
  const activeSprint = sprints.find((sprint) => sprint.status === "active") ?? null;
  const [columns, setColumns] = useState(initial);
  const [openStory, setOpenStory] = useState<StoryDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const filters = useBoardFilters();
  const { filtersActive } = filters;
  const dragDisabled = filtersActive;

  const visibleColumns = filters.applyFilters(columns);

  // Uskladi optimistički state kad server pošalje nove kolone (React šablon).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setColumns(initial);
  }

  const { sensors, activeStory, handleDragStart, handleDragOver, handleDragEnd } =
    useBoardDragDrop({ projectId: project.id, columns, setColumns, dragDisabled });

  return (
    <div className="space-y-5">
      <ProjectPageHeader
        project={project}
        showProjectMeta={false}
        banner={<InfoBanner text={dict.board.infoBanner} />}
      />
      <BoardSprintBar sprint={activeSprint} columns={columns} />
      <BoardFilters
        search={filters.search}
        filterAssignee={filters.filterAssignee}
        filterPriority={filters.filterPriority}
        filtersActive={filtersActive}
        members={members}
        canManage={canManage}
        hasActiveSprint={activeSprint !== null}
        onSearchChange={filters.setSearch}
        onAssigneeChange={filters.setFilterAssignee}
        onPriorityChange={filters.setFilterPriority}
        onClearFilters={filters.clearFilters}
        onCalendarOpen={() => setCalendarOpen(true)}
        onExportOpen={() => setExportOpen(true)}
        onInsightsToggle={() => setInsightsOpen(true)}
        onCreateStory={() => setCreateOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      {filtersActive && <InfoBanner text={dict.board.filtersDragDisabled} />}
      <StoryCreateForm
        isOpen={createOpen}
        projectId={project.id}
        columns={columns}
        sprints={sprints}
        defaultColumnId={columns[0]?.id ?? null}
        defaultSprintId={activeSprint?.id ?? null}
        onClose={() => setCreateOpen(false)}
      />
      {activeSprint === null ? (
        <SectionCard title={dict.board.tabBoard}>
          <EmptyState
            title={dict.board.noActiveSprintTitle}
            message={dict.board.noActiveSprintMessage}
          />
        </SectionCard>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <Surface
            variant="muted"
            padding="sm"
            className="min-h-[60vh] overflow-hidden lg:min-h-[calc(100vh-16rem)] animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:snap-none sm:gap-4">
              {visibleColumns.map((column) => (
                <BoardColumnView key={column.id} column={column} onOpenStory={setOpenStory} dragDisabled={dragDisabled} />
              ))}
            </div>
          </Surface>
          <DragOverlay>
            {activeStory && (
              <div className="w-72 rotate-2">
                <StoryCardContent story={activeStory} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      <StoryDetailPanel
        projectId={project.id}
        story={openStory}
        currentUser={currentUser}
        columns={columns}
        members={members}
        sprints={sprints}
        canModerate={canManage}
        onClose={() => setOpenStory(null)}
      />
      <ColumnManagerModal
        isOpen={manageOpen}
        projectId={project.id}
        columns={columns}
        onClose={() => setManageOpen(false)}
      />
      <ProjectSettingsPanel
        open={settingsOpen}
        project={project}
        canManage={canManage}
        onManageColumns={() => setManageOpen(true)}
        onManageMembers={() => setMembersOpen(true)}
        onClose={() => setSettingsOpen(false)}
      />
      {canManage && (
        <ProjectMembersModal project={membersOpen ? project : null} onClose={() => setMembersOpen(false)} />
      )}
      <ProjectCalendarPanel open={calendarOpen} projectId={project.id} onClose={() => setCalendarOpen(false)} />
      {canManage && (
        <ProjectExportPanel
          open={exportOpen}
          projectId={project.id}
          onClose={() => setExportOpen(false)}
        />
      )}
      <BoardInsightsPanel
        open={insightsOpen}
        columns={columns}
        members={members}
        onClose={() => setInsightsOpen(false)}
      />
    </div>
  );
}
