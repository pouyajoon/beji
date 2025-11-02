"use client";

import { usePathname } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { Tooltip } from "./Tooltip";

const LOCALES = [
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "fa", flag: "🇮🇷", label: "فارسی" }
];

export default function LocaleSwitcher() {
  const pathname = usePathname();

  const makeHref = (targetLocale: string): Route => {
    const currentPath = pathname ?? '/';
    const segments = currentPath.split('/');
    const knownLocales = new Set(LOCALES.map(l => l.code));
    const firstSegment = segments[1] ?? '';
    if (segments.length > 1 && knownLocales.has(firstSegment)) {
      // Replace existing locale segment
      segments[1] = targetLocale;
      return (segments.join('/') || '/') as Route;
    }
    // No locale prefix present; add one
    return (`/${targetLocale}${currentPath.startsWith('/') ? currentPath : `/${currentPath}`}`) as Route;
  };

  return (
    <div style={{ display: "flex", gap: "clamp(4px, 1vw, 8px)", flexWrap: "wrap" }}>
      {LOCALES.map(({ code, flag, label }) => (
        <Tooltip key={code} label={label}>
          <Link
            href={makeHref(code)}
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
            }}
          >
            <span aria-hidden>{flag}</span>
          </Link>
        </Tooltip>
      ))}
    </div>
  );
}


