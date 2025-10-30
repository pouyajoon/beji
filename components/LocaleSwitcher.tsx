"use client";

import { usePathname } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";

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
    <div style={{ display: "flex", gap: 8 }}>
      {LOCALES.map(({ code, flag, label }) => (
        <Link
          key={code}
          href={makeHref(code)}
          aria-label={label}
          style={{
            fontSize: 20,
            lineHeight: "24px",
            textDecoration: "none",
            border: "1px solid var(--muted)",
            borderRadius: 6,
            padding: "4px 6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent"
          }}
        >
          <span aria-hidden>{flag}</span>
        </Link>
      ))}
    </div>
  );
}


