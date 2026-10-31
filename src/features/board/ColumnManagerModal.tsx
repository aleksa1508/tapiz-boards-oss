"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CheckCircle,
  ConfirmDialog,
  FormError,
  Gear,
  Input,
  Plus,
  Trash,
  useToast,
} from "@tapizlabs/ui";
import { SidePanel } from "@/components/layout/SidePanel";
import type { BoardColumnDto } from "@/domain/types";
import {
  createColumnAction,
  deleteColumnAction,
  renameColumnAction,
  setColumnDoneAction,
  setColumnWipLimitAction,
} from "@/lib/actions/board.actions";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

interface ColumnManagerModalProps {
  isOpen: boolean;
  projectId: string;
  columns: BoardColumnDto[];
  onClose: () => void;
}

export function ColumnManagerModal({ isOpen, projectId, columns, onClose }: ColumnManagerModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { dict } = useI18n();
  const t = dict.board;
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [wips, setWips] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<BoardColumnDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset pri otvaranju tokom rendera (React šablon umesto setState u efektu).
  // Za kolone dodate dok je modal otvoren input pada na column.name fallback.
  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setNewName("");
      setError(null);
      setNames(Object.fromEntries(columns.map((c) => [c.id, c.name])));
      setWips(Object.fromEntries(columns.map((c) => [c.id, c.wipLimit?.toString() ?? ""])));
    }
  }

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    const result = await createColumnAction(projectId, { name: newName });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewName("");
    router.refresh();
  };

  const handleRename = async (column: BoardColumnDto) => {
    const name = names[column.id]?.trim();
    if (!name || name === column.name) return;
    setError(null);
    const result = await renameColumnAction(projectId, column.id, { name });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(t.columnRenamed, true);
    router.refresh();
  };

  const handleWip = async (column: BoardColumnDto) => {
    const raw = (wips[column.id] ?? "").trim();
    if (raw === (column.wipLimit?.toString() ?? "")) return;
    setError(null);
    const result = await setColumnWipLimitAction(projectId, column.id, raw === "" ? null : raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(t.wipSaved, true);
    router.refresh();
  };

  const handleToggleDone = async (column: BoardColumnDto) => {
    setError(null);
    const result = await setColumnDoneAction(projectId, column.id, !column.isDone);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(t.doneSaved, true);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    const result = await deleteColumnAction(projectId, deleting.id);
    setDeleteLoading(false);
    setDeleting(null);
    showToast(result.ok ? t.columnDeleted : result.error, result.ok);
    router.refresh();
  };

  return (
    <>
      <SidePanel
        open={isOpen}
        title={t.columnsTitle}
        subtitle={t.columnsSubtitle}
        icon={<Gear size={18} />}
        onClose={onClose}
        footer={
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.newColumnPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) void handleCreate();
                  }}
                />
              </div>
              <Button
                icon={<Plus size={14} />}
                onClick={() => void handleCreate()}
                loading={busy}
                disabled={!newName.trim()}
              >
                {dict.common.add}
              </Button>
            </div>
            <FormError message={error} />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-(--tapiz-text-muted)">{t.wipLimitHint}</p>
          <p className="text-xs text-(--tapiz-text-muted)">{t.doneColumnHint}</p>
          <ul className="space-y-2">
            {columns.map((column) => (
              <li key={column.id} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={names[column.id] ?? column.name}
                    onChange={(e) => setNames((n) => ({ ...n, [column.id]: e.target.value }))}
                    onBlur={() => void handleRename(column)}
                  />
                </div>
                <div className="w-16 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={wips[column.id] ?? ""}
                    placeholder={t.wipLimitPlaceholder}
                    title={t.wipLimitLabel}
                    onChange={(e) => setWips((w) => ({ ...w, [column.id]: e.target.value }))}
                    onBlur={() => void handleWip(column)}
                  />
                </div>
                <Button
                  variant={column.isDone ? "muted-primary" : "ghost"}
                  size="sm"
                  icon={<CheckCircle size={14} />}
                  title={t.doneColumnLabel}
                  onClick={() => void handleToggleDone(column)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash size={14} />}
                  title={dict.common.delete}
                  onClick={() => setDeleting(column)}
                />
              </li>
            ))}
          </ul>
        </div>
      </SidePanel>
      <ConfirmDialog
        open={deleting !== null}
        title={t.deleteColumnTitle}
        description={fmt(t.deleteColumnDescription, { name: deleting?.name ?? "" })}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        danger
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
