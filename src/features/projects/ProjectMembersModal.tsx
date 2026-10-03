"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Combobox,
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

interface ProjectMembersModalProps {
  /** Open when set; only the project owner gets this panel. */
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
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [removing, setRemoving] = useState<ProjectMemberDto | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const loadMembers = useCallback(async (projectId: string) => {
    const result = await getProjectMembersAction(projectId);
    if (result.ok) setMembers(result.data);
    else setError(result.error);
  }, []);

  // Reset on open during render (React pattern instead of setState in an effect).
  const [prevProject, setPrevProject] = useState<ProjectDto | null>(null);
  if (project !== prevProject) {
    setPrevProject(project);
    setMembers(null);
    setUsers([]);
    setSelected("");
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

  const memberIds = new Set((members ?? []).map((m) => m.userId));
  const candidates = users.filter((u) => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!project || !selected) return;
    setError(null);
    setAddLoading(true);
    const result = await addProjectMemberAction(project.id, selected);
    setAddLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSelected("");
    await loadMembers(project.id);
    router.refresh();
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
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={candidates.map((u) => ({
                    value: u.id,
                    label: `${fullName(u)} (${u.email})`,
                  }))}
                  placeholder={t.selectPerson}
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                />
              </div>
              <Button
                className="justify-center"
                icon={<UserPlus size={14} />}
                onClick={() => void handleAdd()}
                loading={addLoading}
                disabled={!selected}
              >
                {dict.common.add}
              </Button>
            </div>
            <FormError message={error} />
          </div>
        }
      >
        <div className="space-y-4">
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
