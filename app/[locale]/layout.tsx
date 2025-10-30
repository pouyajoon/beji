import type { ReactNode } from 'react';
import { locales, defaultLocale, type AppLocale, loadMessages } from '../../src/i18n';
import { DictionaryProvider } from '../../i18n/DictionaryProvider';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const candidate = locale as string;
  const effectiveLocale = (locales as readonly string[]).includes(candidate)
    ? (candidate as AppLocale)
    : defaultLocale;
  const messages = await loadMessages(effectiveLocale);
  const isRtl = effectiveLocale === 'fa';

  return (
    <DictionaryProvider value={{ locale: effectiveLocale, messages }}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </DictionaryProvider>
  );
}


