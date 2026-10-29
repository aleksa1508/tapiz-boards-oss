"use client";

import { Star } from "@tapizlabs/ui";
import type { ProjectDto } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";
import { PersonalTeamsSection } from "@/features/projects/personal/PersonalTeamsSection";
import { DashboardAppInfoCard } from "./DashboardAppInfoCard";
import { DashboardHero } from "./DashboardHero";
import { SectionHeader } from "./SectionHeader";

interface DashboardProps {
  firstName: string;
  projects: ProjectDto[];
  currentUserId: string;
  isAdmin: boolean;
}

export function Dashboard({ firstName, projects, currentUserId, isAdmin }: DashboardProps) {
  const { dict } = useI18n();
  const t = dict.dashboard;

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 sm:space-y-8">
      <DashboardHero
        firstName={firstName}
        description={t.studentDescription}
        stats={[{ label: t.personalTeams, value: projects.length, icon: Star }]}
      />

      <section>
        <SectionHeader num="00" title={t.personalTeams} />
        <PersonalTeamsSection projects={projects} currentUserId={currentUserId} isAdmin={isAdmin} />
      </section>

      <section>
        <SectionHeader num="01" title={dict.settings.nav.info} />
        <DashboardAppInfoCard />
      </section>
    </div>
  );
}
