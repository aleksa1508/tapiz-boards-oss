"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@tapizlabs/ui";
import type { StoryDto } from "@/domain/types";
import { moveStoryAction } from "@/lib/actions/board.actions";
import { useI18n } from "@/i18n/I18nProvider";

interface UseBacklogDragDropOptions {
  projectId: string;
  stories: StoryDto[];
  setStories: React.Dispatch<React.SetStateAction<StoryDto[]>>;
  dragDisabled: boolean;
}

export interface BacklogDragDropHandlers {
  sensors: ReturnType<typeof useSensors>;
  activeStory: StoryDto | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

/**
 * Backlog ranking (drag-reorder). The rank lives in `stories.position`; `moveStoryAction`
 * with `toColumnId: null` renumbers the backlog list (see move.queries).
 */
export function useBacklogDragDrop({
  projectId,
  stories,
  setStories,
  dragDisabled,
}: UseBacklogDragDropOptions): BacklogDragDropHandlers {
  const router = useRouter();
  const { showToast } = useToast();
  const { dict } = useI18n();
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);
  const snapshot = useRef<StoryDto[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    snapshot.current = stories;
    setActiveStory(stories.find((s) => s.id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveStory(null);
    const prev = snapshot.current;
    snapshot.current = null;
    if (dragDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stories.findIndex((s) => s.id === active.id);
    const newIndex = stories.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stories, oldIndex, newIndex);
    setStories(reordered);

    const rollback = (message: string) => {
      if (prev) setStories(prev);
      showToast(message, false);
    };
    try {
      const result = await moveStoryAction(projectId, {
        storyId: String(active.id),
        toColumnId: null,
        toIndex: newIndex,
      });
      if (!result.ok) rollback(result.error);
    } catch {
      rollback(dict.common.networkError);
    }
    router.refresh();
  };

  return { sensors, activeStory, handleDragStart, handleDragEnd };
}
