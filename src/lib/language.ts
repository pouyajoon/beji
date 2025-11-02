import type { AppLocale } from '../i18n';
import { locales, defaultLocale } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'beji:language';

/**
 * Detects the best language from browser settings
 * Priority: 1. localStorage, 2. navigator.languages, 3. navigator.language, 4. system default, 5. fallback to English
 */
export function detectLanguage(): AppLocale {
    // First check localStorage
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && (locales as readonly string[]).includes(stored)) {
            return stored as AppLocale;
        }

        // Check navigator.languages (preferred languages array)
        const navLanguages = navigator?.languages;
        if (navLanguages && Array.isArray(navLanguages) && navLanguages.length > 0) {
            for (const lang of navLanguages) {
                if (lang && typeof lang === 'string') {
                    const parts = lang.split('-');
                    const langCode = parts[0]?.toLowerCase();
                    if (langCode && (locales as readonly string[]).includes(langCode)) {
                        return langCode as AppLocale;
                    }
                }
            }
        }

        // Check navigator.language (primary language)
        const navLanguage = navigator?.language;
        if (navLanguage && typeof navLanguage === 'string') {
            const parts = navLanguage.split('-');
            const langCode = parts[0]?.toLowerCase();
            if (langCode && (locales as readonly string[]).includes(langCode)) {
                return langCode as AppLocale;
            }
        }
    }

    // Fallback to default locale (English)
    return defaultLocale;
}

