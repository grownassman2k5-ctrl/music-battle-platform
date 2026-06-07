"use client";

import { MockButton, Panel } from "./ui";

type ThemeSelectorProps = {
  activeTheme: string;
  themes: string[];
  onThemeChange: (theme: string) => void;
};

export function ThemeSelector({
  activeTheme,
  themes,
  onThemeChange,
}: ThemeSelectorProps) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">Theme</p>
      <h2 className="mt-1 text-xl font-bold text-white">{activeTheme}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {themes.map((theme) => (
          <MockButton
            className={activeTheme === theme ? "border-[#f7c948] bg-[#f7c948]/20" : ""}
            key={theme}
            onClick={() => onThemeChange(theme)}
            tone={activeTheme === theme ? "primary" : "ghost"}
          >
            {theme}
          </MockButton>
        ))}
      </div>
    </Panel>
  );
}
