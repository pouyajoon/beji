import type { ReactNode } from 'react';
import { type AppLocale, loadMessages } from '../../src/i18n';
import { DictionaryProvider } from '../../i18n/DictionaryProvider';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  const isRtl = locale === 'fa';

  return (
    <DictionaryProvider value={{ locale, messages }}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </DictionaryProvider>
  );
}


