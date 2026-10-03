"use client";

import { Badge, InfoBanner, PageHeader, Surface } from "@tapizlabs/ui";
import { isOverdue } from "@/domain/types";
import type { PublicBoardColumn } from "./public-board";
import type { Dict } from "@/i18n/dictionaries";
import { formatIsoDate, todayIso } from "@/lib/date";

interface PublicBoardViewProps {
  title: string;
  subtitle: string;
  columns: PublicBoardColumn[];
  dict: Dict;
}

/** Javni read-only prikaz boarda — bez akcija, bez drag & drop-a. */
export function PublicBoardView({ title, subtitle, columns, dict }: PublicBoardViewProps) {
  const t = dict.board;
  const today = todayIso();

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />
      <InfoBanner text={t.publicBoardNote} variant="lock" />
      <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
        {columns.map((column) => (
          <Surface
            key={column.id}
            variant="surface"
            padding="none"
            className="flex w-[min(18rem,85vw)] shrink-0 flex-col overflow-hidden sm:w-76"
          >
            <div className="flex items-center justify-between gap-3 border-b border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) px-3 py-3.5">
              <h3 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em]">
                {column.name}
              </h3>
              <Badge variant="info">{column.stories.length}</Badge>
            </div>
            <div className="min-h-40 flex-1 space-y-3 px-3 py-3">
              {column.stories.map((story) => {
                const overdue = isOverdue(story.dueDate, today);
                return (
                  <Surface
                    key={story.id}
                    variant="raised"
                    padding="sm"
                    className="space-y-2"
                  >
                    <p className="text-sm font-semibold leading-snug">{story.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {story.priority !== "medium" && (
                        <Badge variant={story.priority === "high" ? "danger" : "muted"}>
                          {story.priority === "high" ? t.priorityHigh : t.priorityLow}
                        </Badge>
                      )}
                      {story.dueDate !== null && (
                        <Badge variant={overdue ? "danger" : "warning"}>
                          {formatIsoDate(story.dueDate)}
                        </Badge>
                      )}
                      {story.taskCount > 0 && (
                        <Badge variant={story.tasksDone === story.taskCount ? "success" : "muted"}>
                          ✓ {story.tasksDone}/{story.taskCount}
                        </Badge>
                      )}
                      {story.storyPoints !== null && (
                        <Badge variant="info">{story.storyPoints} SP</Badge>
                      )}
                    </div>
                    {story.assigneeName && (
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--tapiz-text-muted)">
                        {story.assigneeName}
                      </p>
                    )}
                  </Surface>
                );
              })}
              {column.stories.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-(--tapiz-text-muted)">—</p>
              )}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
