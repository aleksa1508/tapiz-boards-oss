"use client";

import { useRef, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@tapizlabs/ui";
import { useRouter } from "next/navigation";
import type { BoardColumnWithStories, StoryDto } from "@/domain/types";
import { moveStoryAction } from "@/lib/actions/board.actions";
import { useI18n } from "@/i18n/I18nProvider";

interface UseBoardDragDropOptions {
  projectId: string;
  columns: BoardColumnWithStories[];
  setColumns: React.Dispatch<React.SetStateAction<BoardColumnWithStories[]>>;
  dragDisabled: boolean;
}

export interface BoardDragDropHandlers {
  sensors: ReturnType<typeof useSensors>;
  activeStory: StoryDto | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

function findColumnId(cols: BoardColumnWithStories[], itemId: string): string | null {
  if (cols.find((c) => c.id === itemId)) return itemId;
  return cols.find((c) => c.stories.some((s) => s.id === itemId))?.id ?? null;
}

export function useBoardDragDrop({
  projectId,
  columns,
  setColumns,
  dragDisabled,
}: UseBoardDragDropOptions): BoardDragDropHandlers {
  const router = useRouter();
  const { showToast } = useToast();
  const { dict } = useI18n();
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);
  const snapshot = useRef<BoardColumnWithStories[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    snapshot.current = columns;
    setActiveStory(columns.flatMap((c) => c.stories).find((s) => s.id === event.active.id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    setColumns((cols) => {
      const fromId = findColumnId(cols, String(active.id));
      const toId = findColumnId(cols, String(over.id));
      if (!fromId || !toId || fromId === toId) return cols;
      const story = cols.find((c) => c.id === fromId)!.stories.find((s) => s.id === active.id);
      if (!story) return cols;
      return cols.map((c) => {
        if (c.id === fromId) return { ...c, stories: c.stories.filter((s) => s.id !== active.id) };
        if (c.id === toId) {
          const overIndex = c.stories.findIndex((s) => s.id === over.id);
          const insertAt = overIndex === -1 ? c.stories.length : overIndex;
          const next = [...c.stories];
          next.splice(insertAt, 0, { ...story, columnId: c.id });
          return { ...c, stories: next };
        }
        return c;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStory(null);
    const prev = snapshot.current;
    snapshot.current = null;
    if (dragDisabled || !over) {
      if (prev) setColumns(prev);
      return;
    }

    // Final order is derived from the current render's columns (cross-column
    // moves were already applied in handleDragOver) — not from inside a state
    // updater, which React may run after this handler has continued.
    const storyId = String(active.id);
    let nextCols = columns;
    const fromId = findColumnId(columns, storyId);
    const toId = findColumnId(columns, String(over.id));
    if (fromId && fromId === toId && active.id !== over.id) {
      const col = columns.find((c) => c.id === fromId)!;
      const oldIndex = col.stories.findIndex((s) => s.id === active.id);
      const newIndex = col.stories.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        nextCols = columns.map((c) =>
          c.id === fromId ? { ...c, stories: arrayMove(c.stories, oldIndex, newIndex) } : c,
        );
        setColumns(nextCols);
      }
    }

    const targetCol = nextCols.find((c) => c.stories.some((s) => s.id === storyId));
    if (!targetCol) return;
    const toIndex = targetCol.stories.findIndex((s) => s.id === storyId);
    const unchanged = prev?.find((c) => c.id === targetCol.id)?.stories.findIndex((s) => s.id === storyId);
    if (unchanged === toIndex) return;

    const rollback = (message: string) => {
      if (prev) setColumns(prev);
      showToast(message, false);
    };
    try {
      const result = await moveStoryAction(projectId, { storyId, toColumnId: targetCol.id, toIndex });
      if (!result.ok) rollback(result.error);
    } catch {
      rollback(dict.common.networkError);
    }
    router.refresh();
  };

  return { sensors, activeStory, handleDragStart, handleDragOver, handleDragEnd };
}
