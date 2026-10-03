"use client";

import { Button, Gear, Layers, UserPlus } from "@tapizlabs/ui";
import type { ProjectDto } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";
import { SidePanel } from "@/components/layout/SidePanel";
import { PublicLinkCard } from "./PublicLinkCard";
import { RepoLinkCard } from "./RepoLinkCard";

interface ProjectSettingsPanelProps {
  open: boolean;
  project: ProjectDto;
  canManage: boolean;
  /** Otvara ColumnManagerModal (živi u BoardView-u). */
  onManageColumns: () => void;
  /** Opens ProjectMembersModal (lives in BoardView). */
  onManageMembers: () => void;
  onClose: () => void;
}

/**
 * Drawer sa svim "setup" karticama projekta (javni link, GitHub repo, kolone).
 * Izvučeno iz vertikalnog stacka iznad boarda da glavni sadržaj bude odmah vidljiv.
 */
export function ProjectSettingsPanel({
  open,
  project,
  canManage,
  onManageColumns,
  onManageMembers,
  onClose,
}: ProjectSettingsPanelProps) {
  const { dict } = useI18n();
  const t = dict.board;

  return (
    <SidePanel
      open={open}
      title={t.teamSettings}
      subtitle={t.teamSettingsSubtitle}
      icon={<Gear size={18} />}
      width="md"
      onClose={onClose}
      footer={
        canManage ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<UserPlus size={16} />}
              onClick={() => {
                onClose();
                onManageMembers();
              }}
              className="flex-1 justify-center"
            >
              {dict.teams.members}
            </Button>
            <Button
              variant="secondary"
              icon={<Layers size={16} />}
              onClick={() => {
                onClose();
                onManageColumns();
              }}
              className="flex-1 justify-center"
            >
              {t.columns}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canManage && <PublicLinkCard project={project} />}
        <RepoLinkCard project={project} />
      </div>
    </SidePanel>
  );
}
