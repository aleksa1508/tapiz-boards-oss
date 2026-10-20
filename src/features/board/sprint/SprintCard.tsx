"use client";

import {
  ArrowRight,
  Avatar,
  Badge,
  Button,
  Check,
  ChevronRight,
  Plus,
  Progress,
  Surface,
  Trash,
  RefreshCw,
} from "@tapizlabs/ui";
import type { BoardColumnDto, SprintDto, SprintStatus, StoryDto } from "@/domain/types";
import { doneColumnId, storyProgress } from "@/domain/services/board-insights";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { SprintRetroSection } from "../SprintRetroSection";

const STATUS_VARIANT: Record<SprintStatus, "muted" | "success" | "info"> = {
  planned: "muted",
  active: "success",
  completed: "info",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

interface SprintCardProps {
  projectId: string;
  sprint: SprintDto;
  stories: StoryDto[];
  columns: BoardColumnDto[];
  statusLoading: boolean;
  canManage: boolean;
  currentUser: { id: string; name: string; role: "admin" | "member" };
  onOpenStory: (story: StoryDto) => void;
  onCreateStory: () => void;
  onStart: () => void;
  onUndo: () => void;
  onFinish: () => void;
  onDelete: () => void;
}

export function SprintCard({
  projectId,
  sprint,
  stories,
  columns,
  statusLoading,
  canManage,
  currentUser,
  onOpenStory,
  onCreateStory,
  onStart,
  onUndo,
  onFinish,
  onDelete,
}: SprintCardProps) {
  const { dict } = useI18n();
  const t = dict.sprints;
  const statusLabel: Record<SprintStatus, string> = {
    planned: t.statusPlanned,
    active: t.statusActive,
    completed: t.statusCompleted,
  };
  const columnName = (columnId: string | null) =>
    columnId === null ? dict.board.backlog : (columns.find((c) => c.id === columnId)?.name ?? "—");
  const progress = storyProgress(stories, doneColumnId(columns));
  const pct =
    progress.totalPoints === 0 ? 0 : Math.round((progress.donePoints / progress.totalPoints) * 100);
  // Brojači iz žive liste storija (sprint.storyCount/totalPoints su snapshot — ne osvežavaju se).
  const storyCount = progress.totalCount;
  const totalPoints = progress.totalPoints;
  const durationDays = Math.max(
    1,
    Math.round((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / 86400000) + 1,
  );
  const statusTone =
    sprint.status === "active"
      ? "border-l-success"
      : sprint.status === "completed"
        ? "border-l-primary-300"
        : "border-l-(--tapiz-border-strong)";

  return (
    <Surface
      variant="raised"
      padding="md"
      className={`animate-in fade-in slide-in-from-bottom-2 space-y-4 border-l-2 duration-300 ${statusTone}`}
    >
      {/* Zaglavlje: ime + status + datumi, cilj ispod */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold tracking-tight text-(--tapiz-text-primary)">
              {sprint.name}
            </h3>
            <Badge variant={STATUS_VARIANT[sprint.status]}>{statusLabel[sprint.status]}</Badge>
          </div>
          {sprint.goal?.trim() && (
            <p className="mt-1 text-sm text-(--tapiz-text-secondary)">{sprint.goal}</p>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-semibold text-(--tapiz-accent)">
          {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
        </span>
      </div>

      {/* Sažeta traka: čipovi + progress + akcije */}
      <div className="flex flex-col gap-3 border-y border-(--tapiz-border-subtle) py-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-(--tapiz-text-secondary)">
          <span>
            <span className="font-display text-sm font-bold text-(--tapiz-text-primary)">{storyCount}</span>{" "}
            {storyCount === 1 ? t.storyOne : t.storyMany}
          </span>
          <span>
            <span className="font-display text-sm font-bold text-(--tapiz-text-primary)">{totalPoints}</span> SP
          </span>
          <span>
            <span className="font-display text-sm font-bold text-(--tapiz-text-primary)">{durationDays}</span>d
          </span>
        </div>

        {stories.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xs">
            <Progress
              value={progress.donePoints}
              max={Math.max(progress.totalPoints, 1)}
              tone={progress.donePoints === progress.totalPoints ? "success" : "accent"}
              className="min-w-0 flex-1"
            />
            <span
              className={`shrink-0 font-display text-xs font-bold ${pct === 100 ? "text-(--tapiz-accent)" : "text-(--tapiz-text-primary)"}`}
            >
              {pct}%
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {sprint.status !== "completed" && (
            <Button size="sm" icon={<Plus size={14} />} onClick={onCreateStory}>
              {dict.board.newStory}
            </Button>
          )}
          {sprint.status === "planned" && (
            <Button size="sm" variant="secondary" icon={<ArrowRight size={14} />} loading={statusLoading} onClick={onStart}>
              {t.start}
            </Button>
          )}
          {sprint.status === "active" && (
            <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} loading={statusLoading} onClick={onUndo}>
              {t.undoStart}
            </Button>
          )}
          {sprint.status === "active" && (
            <Button size="sm" variant="secondary" icon={<Check size={14} />} loading={statusLoading} onClick={onFinish}>
              {t.finish}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash size={14} />}
            onClick={onDelete}
            aria-label={t.deleteSprint}
            className="text-(--tapiz-text-muted) hover:border-warn/40! hover:text-warn!"
          >
            {dict.common.delete}
          </Button>
        </div>
      </div>

      {stories.length === 0 ? (
        <p className="text-sm text-(--tapiz-text-muted)">{t.noStories}</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface)">
          {stories.map((story) => (
            <li
              key={story.id}
              className="group flex items-center gap-3 border-b border-(--tapiz-border-subtle) px-3 py-2 transition-colors last:border-b-0 hover:bg-(--tapiz-bg-surface-raised)"
            >
              <span
                className="transition-transform group-hover:scale-105"
                title={
                  story.assigneeName
                    ? fmt(dict.board.assignedTo, { name: story.assigneeName })
                    : fmt(dict.board.authorTooltip, { name: story.authorName })
                }
              >
                <Avatar name={story.assigneeName ?? story.authorName} size="xs" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--tapiz-text-primary)">{story.title}</p>
                {story.description?.trim() && (
                  <p className="truncate text-xs text-(--tapiz-text-muted)">{story.description}</p>
                )}
              </div>
              <Badge variant="muted">{columnName(story.columnId)}</Badge>
              {story.storyPoints !== null && <Badge variant="info">{story.storyPoints} SP</Badge>}
              <Button
                size="sm"
                variant="ghost"
                icon={<ChevronRight size={14} />}
                onClick={() => onOpenStory(story)}
                className="shrink-0"
              >
                {dict.board.details}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {sprint.status === "completed" && (
        <SprintRetroSection
          projectId={projectId}
          sprint={sprint}
          currentUser={currentUser}
          canModerate={canManage}
        />
      )}
    </Surface>
  );
}
