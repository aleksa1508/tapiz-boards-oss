"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, EmptyState, InfoBanner, Plus, Surface, useToast } from "@tapizlabs/ui";
import type { BoardColumnDto, ProjectDto, ProjectMemberDto, SprintDto, SprintStatus, StoryDto } from "@/domain/types";
import type { SessionUser } from "@/lib/guards";
import { deleteSprintAction, setSprintStatusAction, undoSprintStartAction } from "@/lib/actions/sprints.actions";
import { useI18n } from "@/i18n/I18nProvider";
import { ProjectPageHeader } from "./ProjectPageHeader";
import { SprintFormPanel } from "./SprintFormPanel";
import { StoryCreateForm } from "./StoryCreateForm";
import { StoryDetailPanel } from "./story/StoryDetailPanel";
import { SprintCard } from "./sprint/SprintCard";
import { SprintStats } from "./sprint/SprintStats";
import { FinishSprintPanel } from "./FinishSprintPanel";

interface SprintsViewProps {
  project: ProjectDto;
  sprints: SprintDto[];
  /** Story-ji grupisani po sprintu (ključ = sprintId). */
  storiesBySprint: Record<string, StoryDto[]>;
  columns: BoardColumnDto[];
  members: ProjectMemberDto[];
  currentUser: SessionUser;
  canManage: boolean;
}

export function SprintsView({
  project,
  sprints,
  storiesBySprint,
  columns,
  members,
  currentUser,
  canManage,
}: SprintsViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { dict } = useI18n();
  const t = dict.sprints;

  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [createSprintId, setCreateSprintId] = useState<string | null>(null);
  const [openStory, setOpenStory] = useState<StoryDto | null>(null);
  const [finishTarget, setFinishTarget] = useState<SprintDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SprintDto | null>(null);
  const [undoTarget, setUndoTarget] = useState<SprintDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const handleStatus = async (sprint: SprintDto, status: SprintStatus) => {
    setStatusLoading(sprint.id);
    const result = await setSprintStatusAction(project.id, sprint.id, status);
    setStatusLoading(null);
    showToast(result.ok ? (status === "active" ? t.startedToast : t.finishedToast) : result.error, result.ok);
    router.refresh();
  };

  const handleUndo = async () => {
    if (!undoTarget) return;
    setStatusLoading(undoTarget.id);
    const result = await undoSprintStartAction(project.id, undoTarget.id);
    setStatusLoading(null);
    setUndoTarget(null);
    showToast(result.ok ? t.undoStartedToast : result.error, result.ok);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteSprintAction(project.id, deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    showToast(result.ok ? t.deletedToast : result.error, result.ok);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <ProjectPageHeader
        project={project}
        showProjectMeta={false}
        banner={<InfoBanner text={t.infoBanner} />}
      />
      <SprintStats
        sprints={sprints}
        actions={
          <Button
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setCreateSprintOpen(true)}
            className="h-9 w-full justify-center sm:w-auto"
          >
            {t.newSprint}
          </Button>
        }
      />

      {sprints.length === 0 ? (
        <Surface variant="raised" padding="md" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <EmptyState title={t.emptyTitle} message={t.emptyMessage} />
        </Surface>
      ) : (
        <div className="space-y-4">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              projectId={project.id}
              sprint={sprint}
              stories={storiesBySprint[sprint.id] ?? []}
              columns={columns}
              statusLoading={statusLoading === sprint.id}
              canManage={canManage}
              currentUser={currentUser}
              onOpenStory={setOpenStory}
              onCreateStory={() => {
                setCreateSprintId(sprint.id);
                setCreateStoryOpen(true);
              }}
              onStart={() => void handleStatus(sprint, "active")}
              onUndo={() => setUndoTarget(sprint)}
              onFinish={() => setFinishTarget(sprint)}
              onDelete={() => setDeleteTarget(sprint)}
            />
          ))}
        </div>
      )}

      <SprintFormPanel
        isOpen={createSprintOpen}
        projectId={project.id}
        suggestedName={`Sprint ${sprints.length + 1}`}
        onClose={() => setCreateSprintOpen(false)}
      />
      <StoryCreateForm
        isOpen={createStoryOpen}
        projectId={project.id}
        columns={columns}
        sprints={sprints}
        defaultColumnId={null}
        defaultSprintId={createSprintId}
        onClose={() => {
          setCreateStoryOpen(false);
          setCreateSprintId(null);
        }}
      />
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
      <FinishSprintPanel
        isOpen={finishTarget !== null}
        projectId={project.id}
        sprint={finishTarget}
        stories={finishTarget ? (storiesBySprint[finishTarget.id] ?? []) : []}
        columns={columns}
        sprints={sprints}
        onClose={() => setFinishTarget(null)}
      />
      <ConfirmDialog
        open={undoTarget !== null}
        title={t.undoStartTitle}
        description={t.undoStartDescription}
        confirmLabel={t.undoStart}
        cancelLabel={dict.common.cancel}
        loading={statusLoading !== null}
        onConfirm={() => void handleUndo()}
        onCancel={() => setUndoTarget(null)}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
