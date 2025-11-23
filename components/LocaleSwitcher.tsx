"use client";

import { languageAtom } from "./atoms";
import { Tooltip } from "./Tooltip";
import { useSetAtom } from "../lib/jotai";
import type { AppLocale } from "../src/i18n";

const LOCALES: { code: AppLocale; flag: string; label: string }[] = [
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "fa", flag: "🇮🇷", label: "فارسی" }
];

export default function LocaleSwitcher() {
  const setLanguage = useSetAtom(languageAtom);

  const handleLanguageChange = (code: AppLocale) => {
    setLanguage(code);
  };

  return (
    <div style={{ display: "flex", gap: "clamp(4px, 1vw, 8px)", flexWrap: "wrap" }}>
      {LOCALES.map(({ code, flag, label }) => (
        <Tooltip key={code} label={label}>
          <button
            onClick={() => handleLanguageChange(code)}
            aria-label={label}
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              lineHeight: "1",
              textDecoration: "none",
              border: "1px solid var(--muted)",
              borderRadius: "clamp(4px, 1vw, 6px)",
              padding: "clamp(3px, 0.75vw, 4px) clamp(4px, 1vw, 6px)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg)",
              minWidth: "clamp(28px, 7vw, 32px)",
              minHeight: "clamp(28px, 7vw, 32px)",
              cursor: "pointer",
            }}
          >
            <span aria-hidden>{flag}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}


