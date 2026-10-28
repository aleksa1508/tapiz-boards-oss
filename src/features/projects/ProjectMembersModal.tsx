"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  FormError,
  Spinner,
  UserMinus,
  UserPlus,
  useToast,
} from "@tapizlabs/ui";
import type { ProjectDto, ProjectMemberDto, UserDto } from "@/domain/types";
import { fullName } from "@/domain/types";
import {
  addProjectMemberAction,
  getMemberCandidatesAction,
  getProjectMembersAction,
  removeProjectMemberAction,
} from "@/lib/actions/projects.actions";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { SidePanel } from "@/components/layout/SidePanel";

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
        checked ? "border-violet-600 bg-violet-600" : "border-gray-300 bg-white"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" fill="currentColor">
          <path d="M7.7 13.3 4.4 10l-1.1 1.1 4.4 4.4L16.8 6.4l-1.1-1.1z" />
        </svg>
      )}
    </div>
  );
}

interface ProjectMembersModalProps {
  project: ProjectDto | null;
  onClose: () => void;
}

export function ProjectMembersModal({ project, onClose }: ProjectMembersModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { dict } = useI18n();
  const t = dict.teams;
  const [members, setMembers] = useState<ProjectMemberDto[] | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");                     
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [removing, setRemoving] = useState<ProjectMemberDto | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const loadMembers = useCallback(async (projectId: string) => {
    const result = await getProjectMembersAction(projectId);
    if (result.ok) setMembers(result.data);
    else setError(result.error);
  }, []);

  const [prevProject, setPrevProject] = useState<ProjectDto | null>(null);
  if (project !== prevProject) {
    setPrevProject(project);
    setMembers(null);
    setUsers([]);
    setSelectedIds([]);
    setSearch("");      
    setError(null);
  }

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    void Promise.all([getProjectMembersAction(project.id), getMemberCandidatesAction(project.id)]).then(
      ([membersResult, usersResult]) => {
        if (cancelled) return;
        if (membersResult.ok) setMembers(membersResult.data);
        else setError(membersResult.error);
        if (usersResult.ok) setUsers(usersResult.data);
        else setError(usersResult.error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [project]);

const candidates = useMemo(() => {
  const memberIds = new Set((members ?? []).map((m) => m.userId));
  return users.filter((u) => !memberIds.has(u.id));
}, [users, members]);

// candidates after filtering by search query (name or email)
const filteredCandidates = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return candidates;
  return candidates.filter(
    (u) => fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
}, [candidates, search]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allFilteredSelected =
    filteredCandidates.length > 0 && filteredCandidates.every((u) => selectedIds.includes(u.id));

  const toggleAllFiltered = () => {
    const ids = filteredCandidates.map((u) => u.id);
    setSelectedIds((prev) =>
      allFilteredSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
    );
  };

  const handleAdd = async () => {
    if (!project || selectedIds.length === 0) return;
    setError(null);
    setAddLoading(true);

    const results = await Promise.allSettled(
      selectedIds.map((id) => addProjectMemberAction(project.id, id)),
    );

    setAddLoading(false);

    const failedIds = selectedIds.filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" || !r.value.ok;
    });
    const addedCount = selectedIds.length - failedIds.length;

    if (failedIds.length > 0) {
      const firstError = results
        .map((r) => (r.status === "fulfilled" && !r.value.ok ? r.value.error : null))
        .find(Boolean);
      setError(firstError ?? t.addPartialError);
    }

    setSelectedIds(failedIds);

    if (addedCount > 0) {
      showToast(fmt(t.membersAdded, { count: addedCount }), true);
      await loadMembers(project.id);
      router.refresh();
    }
  };

  const confirmRemove = async () => {
    if (!project || !removing) return;
    setRemoveLoading(true);
    const result = await removeProjectMemberAction(project.id, removing.userId);
    setRemoveLoading(false);
    setRemoving(null);
    showToast(result.ok ? t.memberRemoved : result.error, result.ok);
    if (result.ok) {
      await loadMembers(project.id);
      router.refresh();
    }
  };

  return (
    <>
      <SidePanel
        open={project !== null}
        onClose={onClose}
        title={fmt(t.membersTitle, { code: project?.name ?? "" })}
        subtitle={t.membersSubtitle}
        icon={<UserPlus size={18} />}
        footer={
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-(--tapiz-text-muted)">
                {selectedIds.length > 0
                  ? fmt(t.selectedCount, { count: selectedIds.length })
                  : t.noneSelected}
              </span>
              <Button
                className="justify-center"
                icon={<UserPlus size={14} />}
                onClick={() => void handleAdd()}
                loading={addLoading}
                disabled={selectedIds.length === 0}
              >
                {selectedIds.length > 0 ? `${dict.common.add} (${selectedIds.length})` : dict.common.add}
              </Button>
            </div>
            <FormError message={error} />
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <section className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden border-b border-(--tapiz-border-subtle)">
            <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-(--tapiz-text-muted)">
              {fmt(t.membersSection, { count: members?.length ?? 0 })}
            </h3>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {members === null ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : members.length === 0 ? (
                <EmptyState title={t.emptyMembersTitle} message={t.emptyMembersMessage} />
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center gap-3 rounded-xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) px-3 py-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="truncate text-xs text-(--tapiz-text-muted)">{m.email}</p>
                        </div>
                      </div>
                      {m.userId !== project?.ownerId && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          icon={<UserMinus size={14} />}
                          onClick={() => setRemoving(m)}
                        >
                          {dict.common.remove}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
            <div className="space-y-2 px-4 pb-2 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-(--tapiz-text-muted)">
                {t.addMembersSection}
              </h3>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchMemberPlaceholder}
                className="w-full rounded-xl border border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />

              {filteredCandidates.length > 0 && (
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    className="font-medium text-violet-600 hover:underline"
                  >
                    {allFilteredSelected ? t.deselectAll : t.selectAll}
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-(--tapiz-text-muted) hover:underline"
                    >
                      {t.clearSelection}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4">
              {filteredCandidates.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                      isSelected
                        ? "border-violet-400 bg-violet-50"
                        : "border-(--tapiz-border-subtle) bg-(--tapiz-bg-surface) hover:bg-gray-50"
                    }`}
                  >
                    <Avatar name={fullName(u)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{fullName(u)}</p>
                      <p className="truncate text-xs text-(--tapiz-text-muted)">{u.email}</p>
                    </div>
                    <CheckMark checked={isSelected} />
                  </button>
                );
              })}

              {filteredCandidates.length === 0 && (
                <p className="py-8 text-center text-sm text-(--tapiz-text-muted)">
                  {candidates.length === 0
                    ? t.allAlreadyAdded
                    : t.noResults}
                </p>
              )}
            </div>
          </section>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={removing !== null}
        title={t.removeTitle}
        description={fmt(t.removeDescription, { name: removing ? `${removing.firstName} ${removing.lastName}` : "" })}
        confirmLabel={dict.common.remove}
        cancelLabel={dict.common.cancel}
        danger
        loading={removeLoading}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}