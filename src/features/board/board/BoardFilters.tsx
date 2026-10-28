"use client";

import { useId } from "react";
import { BarChart, Button, Calendar, Download, Gear, Plus, SearchInput, Select, X } from "@tapizlabs/ui";
import type { ProjectMemberDto } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";

export const ALL = "__all__";

interface BoardFiltersProps {
  search: string;
  filterAssignee: string;
  filterPriority: string;
  filtersActive: boolean;
  members: ProjectMemberDto[];
  canManage: boolean;
  hasActiveSprint: boolean;
  onSearchChange: (v: string) => void;
  onAssigneeChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onClearFilters: () => void;
  onCalendarOpen: () => void;
  onExportOpen: () => void;
  onInsightsToggle: () => void;
  /** Opciono — kad nije prosleđeno, dugme za kolone se ne prikazuje (premešteno u Подешавања drawer). */
  onManageColumns?: () => void;
  onCreateStory: () => void;
  onSettingsOpen: () => void;
}

export function BoardFilters({
  search,
  filterAssignee,
  filterPriority,
  filtersActive,
  members,
  canManage,
  hasActiveSprint,
  onSearchChange,
  onAssigneeChange,
  onPriorityChange,
  onClearFilters,
  onCalendarOpen,
  onExportOpen,
  onInsightsToggle,
  onManageColumns,
  onCreateStory,
  onSettingsOpen,
}: BoardFiltersProps) {
  const { dict } = useI18n();
  const fieldId = useId();
  const controlClassName =
    "h-11 border-(--tapiz-border-strong) bg-(--tapiz-bg-surface) text-sm shadow-none transition-colors hover:border-(--tapiz-accent) focus:border-(--tapiz-accent)";

  return (
    <div className="animate-in fade-in slide-in-from-top-1 flex flex-col gap-2 rounded-xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface-muted) p-3 duration-200 lg:flex-row lg:flex-wrap lg:items-center">
      {/* Filteri — na mobilnom puna širina (search red, selecti 2-kol), na lg jedan red */}
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={dict.board.searchPlaceholder}
        clearable
        wrapperClassName="w-full min-w-0 lg:w-48 lg:flex-none"
        inputClassName={controlClassName}
        iconClassName="text-(--tapiz-text-muted)"
      />
      <Button
        variant="ghost"
        icon={<Gear size={18} />}
        onClick={onSettingsOpen}
        aria-label={dict.board.teamSettings}
        className="h-11 w-11 shrink-0 justify-center border-none px-0 shadow-none"
      />
      <div className="grid grid-cols-2 gap-2 lg:flex lg:w-auto">
        <Select
          id={`${fieldId}-assignee`}
          aria-label={dict.board.colAssignee}
          value={filterAssignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          className={`${controlClassName} w-full lg:w-44`}
        >
          <option value={ALL}>{dict.board.filterAssigneeAll}</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </Select>
        <Select
          id={`${fieldId}-priority`}
          aria-label={dict.board.priorityLabel}
          value={filterPriority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className={`${controlClassName} w-full lg:w-44`}
        >
          <option value={ALL}>{dict.board.filterPriorityAll}</option>
          <option value="high">{dict.board.priorityHigh}</option>
          <option value="medium">{dict.board.priorityMedium}</option>
          <option value="low">{dict.board.priorityLow}</option>
        </Select>
      </div>
      {filtersActive && (
        <Button
          variant="ghost"
          size="sm"
          icon={<X size={14} />}
          onClick={onClearFilters}
          className="h-11 w-full justify-center px-3 text-[11px] font-semibold uppercase tracking-[0.14em] lg:w-auto"
        >
          {dict.board.clearFilters}
        </Button>
      )}

      {/* Akcije — na mobilnom 2-kol grid pune širine, na lg inline desno */}
      <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex lg:flex-wrap lg:items-center">
        {canManage && (
          <Button
            variant="secondary"
            size="md"
            icon={<Download size={16} />}
            onClick={onExportOpen}
            aria-label={dict.board.exportTitle}
            title={dict.board.exportTitle}
            className="h-11 w-full justify-center lg:w-auto"
          >
            {dict.board.exportData}
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          icon={<Calendar size={16} />}
          onClick={onCalendarOpen}
          className="h-11 w-full justify-center lg:w-auto"
        >
          {dict.calendar.title}
        </Button>
        <Button
          variant="secondary"
          size="md"
          icon={<BarChart size={16} />}
          onClick={onInsightsToggle}
          className="h-11 w-full justify-center lg:w-auto"
        >
          {dict.board.insightsTitle}
        </Button>
        {canManage && onManageColumns && (
          <Button
            variant="secondary"
            size="md"
            icon={<Gear size={16} />}
            onClick={onManageColumns}
            className="h-11 w-full justify-center lg:w-auto"
          >
            {dict.board.columns}
          </Button>
        )}
        {hasActiveSprint && (
          <Button
            size="md"
            icon={<Plus size={16} />}
            onClick={onCreateStory}
            className="col-span-2 h-11 w-full justify-center px-5 lg:col-span-1 lg:w-auto"
          >
            {dict.board.newStory}
          </Button>
        )}
      </div>
    </div>
  );
}
