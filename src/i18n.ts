export const locales = ['en', 'fr', 'it', 'fa'] as const;
export type AppLocale = typeof locales[number];
export const defaultLocale: AppLocale = 'en';

export async function loadMessages(locale: AppLocale) {
  return (await import(`../messages/${locale}.json`)).default as Record<string, unknown>;
}




