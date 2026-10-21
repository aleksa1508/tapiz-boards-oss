"use client";

import { Check, Moon, Sun } from "@tapizlabs/ui";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { SettingsSection } from "./SettingsRowPrimitives";

function ThemeModeTile({ label, icon, selected, onSelect }: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
        selected
          ? "border-primary-300/60 bg-primary-300/10 text-primary-300"
          : "border-border bg-ink-300/40 text-txt-3 hover:border-primary-300/40 hover:bg-ink-300"
      }`}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className={`text-[13px] font-semibold ${selected ? "text-primary-300" : "text-txt-2"}`}>{label}</span>
    </button>
  );
}

/** One OSS palette in both themes. No imported indigo/rose skins. */
export function SettingsAppearanceSection() {
  const { dict } = useI18n();
  const t = dict.settings.appearance;
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <SettingsSection title={t.themeTitle}>
        <p className="mb-1 text-[13px] leading-snug text-txt-3">{t.themeDesc}</p>
        <div className="grid grid-cols-2 gap-3">
          <ThemeModeTile label={t.light} icon={<Sun size={20} />} selected={theme === "light"} onSelect={() => theme === "dark" && toggleTheme()} />
          <ThemeModeTile label={t.dark} icon={<Moon size={20} />} selected={theme === "dark"} onSelect={() => theme === "light" && toggleTheme()} />
        </div>
      </SettingsSection>
      <SettingsSection title={t.skinTitle}>
        <p className="mb-3 text-[13px] leading-relaxed text-txt-3">{t.skinDesc}</p>
        <div className="flex items-center gap-3 rounded-xl border border-primary-300/45 bg-primary-300/8 px-4 py-3">
          <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-md border border-border">
            <span className="h-9 w-6 bg-[#182329]" />
            <span className="h-9 w-6 bg-[#0b5e66]" />
            <span className="h-9 w-6 bg-[#e2eff0]" />
          </span>
          <span className="flex-1 text-sm font-semibold text-txt-1">{t.skins.default}</span>
          <Check size={17} className="shrink-0 text-primary-300" />
        </div>
      </SettingsSection>
    </div>
  );
}
