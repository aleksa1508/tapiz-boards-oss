"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  FileUpload,
  FormError,
  Select,
} from "@tapizlabs/ui";
import type { UserDto } from "@/domain/types";
import {
  getProjectImportIdentities,
  projectImportRelationshipError,
  projectImportSchema,
  type ProjectImportData,
  type ProjectImportIdentity,
} from "@/domain/validation/project-import.schema";
import { useI18n } from "@/i18n/I18nProvider";
import {
  checkProjectImportDuplicateAction,
  getProjectImportUsersAction,
  importProjectAction,
} from "@/lib/actions/project-import.actions";
import { SidePanel } from "@/components/layout/SidePanel";

const MAX_FILE_BYTES = 9 * 1024 * 1024;
const emptyCounts = {
  members: 0,
  columns: 0,
  sprints: 0,
  stories: 0,
  tasks: 0,
  comments: 0,
  retrospectives: 0,
  activities: 0,
};

interface ImportProjectPanelProps {
  open: boolean;
  isAdmin: boolean;
  onClose: () => void;
}

export function ImportProjectPanel({ open, isAdmin, onClose }: ImportProjectPanelProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashboard;
  const [data, setData] = useState<ProjectImportData | null>(null);
  const [identities, setIdentities] = useState<ProjectImportIdentity[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previousImport, setPreviousImport] = useState<{ importedAt: string | null } | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previousOpen, setPreviousOpen] = useState(false);
  if (open && !previousOpen) {
    setPreviousOpen(true);
    setData(null);
    setIdentities([]);
    setMappings({});
    setUsers([]);
    setError(null);
    setPreviousImport(null);
    setDuplicateDialogOpen(false);
    setDuplicateConfirmed(false);
  } else if (!open && previousOpen) {
    setPreviousOpen(false);
  }

  const readFile = async (file: File | undefined) => {
    setData(null);
    setIdentities([]);
    setMappings({});
    setPreviousImport(null);
    setDuplicateDialogOpen(false);
    setDuplicateConfirmed(false);
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError(t.importJsonOnly);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t.importFileTooLarge);
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(await file.text());
    } catch {
      setError(t.importInvalidJson);
      return;
    }

    const parsed = projectImportSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join(".")}: ${issue.message}`);
      return;
    }
    const relationshipError = projectImportRelationshipError(parsed.data);
    if (relationshipError) {
      setError(relationshipError);
      return;
    }

    const duplicateResult = await checkProjectImportDuplicateAction(parsed.data.project.id);
    if (!duplicateResult.ok) {
      setError(duplicateResult.error);
      return;
    }

    if (isAdmin) {
      const result = await getProjectImportUsersAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsers(result.data);
    }

    setData(parsed.data);
    setIdentities(getProjectImportIdentities(parsed.data));
    setPreviousImport(duplicateResult.data);
    if (duplicateResult.data) setDuplicateDialogOpen(true);
  };

  const cancelDuplicateImport = () => {
    setData(null);
    setIdentities([]);
    setMappings({});
    setPreviousImport(null);
    setDuplicateConfirmed(false);
    setDuplicateDialogOpen(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitImport = async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const result = await importProjectAction(data, mappings, duplicateConfirmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.status === "confirmation-required") {
        setPreviousImport(result.data.previousImport);
        setDuplicateDialogOpen(true);
        return;
      }
      onClose();
      router.push(`/projects/${result.data.projectId}/board`);
      router.refresh();
    } catch (importError) {
      console.error("Project import failed:", importError);
      setError(t.importFailed);
    } finally {
      setLoading(false);
    }
  };

  const counts = data
    ? {
        members: data.members.length,
        columns: data.columns.length,
        sprints: data.sprints.length,
        stories: data.stories.length,
        tasks: data.tasks.length,
        comments: data.comments.length,
        retrospectives: data.retrospectives.length,
        activities: data.activities.length,
      }
    : emptyCounts;
  const mappedCount = Object.values(mappings).filter(Boolean).length;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t.importTitle}
      subtitle={t.importDescription}
      icon={<FileUpload size={18} />}
      width="lg"
      footer={
        <div className="space-y-2">
          <FormError message={error} />
          <Button
            className="w-full justify-center"
            icon={<FileUpload size={16} />}
            loading={loading}
            disabled={!data || Boolean(previousImport && !duplicateConfirmed)}
            onClick={() => void submitImport()}
          >
            {t.importSubmit}
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="shrink-0 space-y-2">
          <label htmlFor="project-import-file" className="block text-sm font-semibold">
            {t.importChooseFile}
          </label>
          <input
            id="project-import-file"
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            disabled={loading}
            onChange={(event) => void readFile(event.currentTarget.files?.[0])}
            className="block w-full text-sm text-(--tapiz-text-secondary) file:mr-3 file:rounded-lg file:border file:border-(--tapiz-border-strong) file:bg-(--tapiz-bg-surface) file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
          <p className="text-xs leading-5 text-(--tapiz-text-muted)">{t.importFileLimit}</p>
        </div>

        {data && (
          <>
            <section className="shrink-0 space-y-2">
              <h3 className="text-sm font-semibold">{t.importCountsTitle}</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <Count label={t.importProjectCount} value={1} />
                <Count label={t.importMembersCount} value={counts.members} />
                <Count label={t.importColumnsCount} value={counts.columns} />
                <Count label={t.importSprintsCount} value={counts.sprints} />
                <Count label={t.importStoriesCount} value={counts.stories} />
                <Count label={t.importTasksCount} value={counts.tasks} />
                <Count label={t.importCommentsCount} value={counts.comments} />
                <Count label={t.importRetrospectivesCount} value={counts.retrospectives} />
                <Count label={t.importActivitiesCount} value={counts.activities} />
              </dl>
            </section>

            <section className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden border-t border-(--tapiz-border-subtle) pt-4">
              <div>
                <h3 className="text-sm font-semibold">{t.importIdentityTitle}</h3>
                <p className="mt-1 text-xs leading-5 text-(--tapiz-text-muted)">
                  {isAdmin ? t.importIdentityAdminHelp : t.importIdentityHelp}
                </p>
              </div>
              {isAdmin && (
                <p className="text-xs text-(--tapiz-text-muted)">
                  {t.importMappedCount.replace("{mapped}", String(mappedCount)).replace("{total}", String(identities.length))}
                </p>
              )}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-2">
                {identities.map((identity) => (
                  <div key={identity.sourceId} className="grid gap-1.5 sm:grid-cols-2 sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{identity.name}</p>
                      <p className="truncate text-xs text-(--tapiz-text-muted)">
                        {identity.email}{identity.isMember ? ` · ${t.importProjectMember}` : ""}
                      </p>
                    </div>
                    {isAdmin ? (
                      <Select
                        aria-label={t.importMapIdentity.replace("{name}", identity.name)}
                        value={mappings[identity.sourceId] ?? ""}
                        disabled={loading}
                        onChange={(event) => setMappings((current) => {
                          const next = { ...current };
                          if (event.target.value) next[identity.sourceId] = event.target.value;
                          else delete next[identity.sourceId];
                          return next;
                        })}
                      >
                        <option value="">{t.importKeepExternal}</option>
                        {users.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.firstName} {candidate.lastName} ({candidate.email})
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-xs text-(--tapiz-text-muted)">{t.importKeepExternal}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      <ConfirmDialog
        open={duplicateDialogOpen}
        title={t.importDuplicateTitle}
        description={t.importDuplicateDescription}
        confirmLabel={t.importDuplicateConfirm}
        cancelLabel={dict.common.cancel}
        onConfirm={() => {
          setDuplicateConfirmed(true);
          setDuplicateDialogOpen(false);
        }}
        onCancel={cancelDuplicateImport}
      />
    </SidePanel>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-(--tapiz-border-subtle) px-3 py-2">
      <dt className="text-(--tapiz-text-muted)">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
