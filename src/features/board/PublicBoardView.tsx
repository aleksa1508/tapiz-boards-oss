"use client";

import { useEffect, useState } from "react";
import { Badge, InfoBanner, PageHeader, Surface } from "@tapizlabs/ui";
import { isOverdue } from "@/domain/types";
import type { Dict } from "@/i18n/dictionaries";
import { fmt } from "@/i18n/config";
import { formatIsoDate, todayIso } from "@/lib/date";
import type { PublicBoardColumn, PublicStory } from "./public-board";

interface PublicBoardViewProps {
  title: string;
  subtitle: string;
  columns: PublicBoardColumn[];
  backlog: PublicStory[];
  dict: Dict;
}

function StoryPreview({
  story, dict, onOpen,
}: {
  story: PublicStory;
  dict: Dict;
  onOpen: (story: PublicStory) => void;
}) {
  const t = dict.board;
  const overdue = isOverdue(story.dueDate, todayIso());
  return (
    <button
      type="button"
      onClick={() => onOpen(story)}
      aria-label={story.title + " — " + t.details}
      className="w-full rounded-xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface-raised) p-3 text-left transition-colors hover:border-(--tapiz-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tapiz-accent)"
    >
      <span className="block text-sm font-semibold leading-snug">{story.title}</span>
      {story.description && (
        <span className="mt-1 block line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-(--tapiz-text-muted)">
          {story.description}
        </span>
      )}
      <span className="mt-2 flex flex-wrap items-center gap-1.5">
        {story.sprintName && <Badge variant="default">{story.sprintName}</Badge>}
        {story.priority !== "medium" && (
          <Badge variant={story.priority === "high" ? "danger" : "muted"}>
            {story.priority === "high" ? t.priorityHigh : t.priorityLow}
          </Badge>
        )}
        {story.dueDate && (
          <Badge variant={overdue ? "danger" : "warning"}>{formatIsoDate(story.dueDate)}</Badge>
        )}
        {story.taskCount > 0 && (
          <Badge variant={story.tasksDone === story.taskCount ? "success" : "muted"}>
            ✓ {story.tasksDone}/{story.taskCount}
          </Badge>
        )}
        {story.storyPoints !== null && <Badge variant="info">{story.storyPoints} SP</Badge>}
        {story.commentCount > 0 && <Badge variant="muted">{story.commentCount} {t.colComments.toLowerCase()}</Badge>}
      </span>
      <span className="mt-2 block text-xs text-(--tapiz-text-secondary)">
        {story.assigneeName ?? story.authorName}
      </span>
      <span className="mt-2 block font-mono text-[11px] font-semibold text-(--tapiz-accent)">
        {t.details} →
      </span>
    </button>
  );
}

/** A public token grants read-only access to board, backlog and story details. */
export function PublicBoardView({ title, subtitle, columns, backlog, dict }: PublicBoardViewProps) {
  const t = dict.board;
  const [selected, setSelected] = useState<PublicStory | null>(null);
  const boardCount = columns.reduce((count, column) => count + column.stories.length, 0);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) p-4 sm:p-6">
        <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-(--tapiz-accent)">
          OPEN SOURCE / COMMUNITY EDITION
        </p>
        <PageHeader title={title} subtitle={subtitle} />
        <div className="mt-4"><InfoBanner text={t.publicBoardNote} variant="lock" /></div>
      </div>

      <nav aria-label={t.details} className="flex flex-wrap items-center gap-2">
        <a href="#public-board" className="rounded-full border border-(--tapiz-border-strong) px-4 py-2 text-sm font-semibold hover:border-(--tapiz-accent)">
          {t.tabBoard} · {boardCount}
        </a>
        <a href="#public-backlog" className="rounded-full border border-(--tapiz-border-strong) px-4 py-2 text-sm font-semibold hover:border-(--tapiz-accent)">
          {t.backlog} · {backlog.length}
        </a>
      </nav>

      <section id="public-board" aria-label={t.tabBoard} className="space-y-3 scroll-mt-24">
        <h2 className="font-display text-xl font-bold">{t.tabBoard} <span className="text-(--tapiz-text-muted)">({boardCount})</span></h2>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
          {columns.map((column) => (
            <Surface
              key={column.id}
              variant="surface"
              padding="none"
              className="flex w-[min(18rem,85vw)] shrink-0 flex-col overflow-hidden sm:w-76"
            >
              <div className="flex items-center justify-between gap-3 border-b border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) px-3 py-3.5">
                <h3 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em]">{column.name}</h3>
                <Badge variant="info">{column.stories.length}</Badge>
              </div>
              <div className="min-h-40 flex-1 space-y-3 px-3 py-3">
                {column.stories.map((story) => (
                  <StoryPreview key={story.id} story={story} dict={dict} onOpen={setSelected} />
                ))}
                {column.stories.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-(--tapiz-text-muted)">—</p>
                )}
              </div>
            </Surface>
          ))}
        </div>
      </section>

      <section id="public-backlog" aria-label={t.backlog} className="space-y-3 scroll-mt-24">
        <h2 className="font-display text-xl font-bold">{t.backlog} <span className="text-(--tapiz-text-muted)">({backlog.length})</span></h2>
        {backlog.length === 0 ? (
          <Surface variant="raised" padding="md"><p className="text-sm text-(--tapiz-text-muted)">{t.backlogEmptyTitle}</p></Surface>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {backlog.map((story) => (
              <StoryPreview key={story.id} story={story} dict={dict} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      {selected !== null && (
        <div
          className="fixed inset-0 z-140 flex justify-end bg-black/65 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            className="flex h-full w-full flex-col overflow-hidden border-l border-(--tapiz-border-strong) bg-(--tapiz-bg-surface) shadow-2xl sm:max-w-xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-(--tapiz-border-subtle) px-5 py-4">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-(--tapiz-accent)">{t.details} / READ ONLY</p>
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <p className="mt-1 text-xs text-(--tapiz-text-muted)">
                  {fmt(t.storyAuthorMeta, { name: selected.authorName, date: selected.createdAt })}
                </p>
              </div>
              <button type="button" autoFocus onClick={() => setSelected(null)} aria-label={dict.common.close}
                className="shrink-0 rounded-md border border-(--tapiz-border-subtle) px-3 py-1.5 text-sm hover:border-(--tapiz-accent)">
                ✕
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-(--tapiz-text-muted)">{t.assigneeLabel}</dt><dd className="mt-1 font-medium">{selected.assigneeName ?? t.nobody}</dd></div>
                <div><dt className="text-xs text-(--tapiz-text-muted)">{t.priorityLabel}</dt><dd className="mt-1 font-medium">{selected.priority === "high" ? t.priorityHigh : selected.priority === "low" ? t.priorityLow : t.priorityMedium}</dd></div>
                <div><dt className="text-xs text-(--tapiz-text-muted)">{t.sprintLabel}</dt><dd className="mt-1 font-medium">{selected.sprintName ?? t.noSprint}</dd></div>
                <div><dt className="text-xs text-(--tapiz-text-muted)">{t.storyPointsLabel}</dt><dd className="mt-1 font-medium">{selected.storyPoints ?? "—"}</dd></div>
                <div><dt className="text-xs text-(--tapiz-text-muted)">{t.dueDateLabel}</dt><dd className="mt-1 font-medium">{selected.dueDate ? formatIsoDate(selected.dueDate) : "—"}</dd></div>
              </dl>
              <div className="border-t border-(--tapiz-border-subtle) pt-4">
                <h3 className="mb-2 text-sm font-semibold">{t.descriptionLabel}</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-(--tapiz-text-secondary)">{selected.description || "—"}</p>
              </div>
              <div className="border-t border-(--tapiz-border-subtle) pt-4">
                <h3 className="mb-3 text-sm font-semibold">{t.tasksTitle} ({selected.tasksDone}/{selected.taskCount})</h3>
                {selected.tasks.length === 0 ? <p className="text-sm text-(--tapiz-text-muted)">{t.noTasks}</p> : (
                  <ul className="space-y-2">
                    {selected.tasks.map((task) => (
                      <li key={task.id} className="flex items-start gap-2 text-sm">
                        <span aria-hidden="true" className="text-(--tapiz-accent)">{task.done ? "☑" : "☐"}</span>
                        <span className={task.done ? "line-through opacity-60" : ""}>{task.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-(--tapiz-border-subtle) pt-4">
                <h3 className="mb-3 text-sm font-semibold">{t.activityComments} ({selected.comments.length})</h3>
                {selected.comments.length === 0 ? <p className="text-sm text-(--tapiz-text-muted)">{t.noComments}</p> : (
                  <ul className="space-y-4">
                    {selected.comments.map((comment) => (
                      <li key={comment.id}>
                        <p className="text-xs text-(--tapiz-text-muted)"><strong className="text-(--tapiz-text-primary)">{comment.authorName}</strong> · {comment.createdAt}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
