"use client";

import { useState } from "react";
import { Button, Download, FormError, Select } from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { SidePanel } from "@/components/layout/SidePanel";
import { getProjectExportDataAction } from "@/lib/actions/project-export.actions";
import { downloadProjectExport, type ProjectExportFormat } from "./export/project-export";

interface ProjectExportPanelProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

export function ProjectExportPanel({ open, projectId, onClose }: ProjectExportPanelProps) {
  const { dict } = useI18n();
  const t = dict.board;
  const [format, setFormat] = useState<ProjectExportFormat>("json");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectExportDataAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadProjectExport(result.data, format);
      onClose();
    } catch (exportError) {
      console.error("Project data export failed:", exportError);
      setError(t.exportFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t.exportTitle}
      subtitle={t.exportDescription}
      icon={<Download size={18} />}
      footer={
        <div className="space-y-2">
          <FormError message={error} />
          <Button
            className="w-full justify-center"
            icon={<Download size={16} />}
            loading={loading}
            onClick={() => void exportProject()}
          >
            {t.exportSubmit}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label htmlFor="project-export-format" className="block text-sm font-semibold">
          {t.exportFormatLabel}
        </label>
        <Select
          id="project-export-format"
          value={format}
          onChange={(event) => {
            const value = event.target.value;
            setFormat(value === "csv" ? "csv" : "json");
          }}
          disabled={loading}
        >
          <option value="json">{t.exportJsonOption}</option>
          <option value="csv">{t.exportCsvOption}</option>
        </Select>
        <p className="text-sm leading-6 text-(--tapiz-text-muted)">
          {format === "csv" ? t.exportCsvHelp : t.exportJsonHelp}
        </p>
      </div>
    </SidePanel>
  );
}
