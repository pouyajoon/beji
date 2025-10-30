import type { ReactNode } from 'react';
import { type AppLocale, loadMessages } from '../../src/i18n';
import { DictionaryProvider } from '../../i18n/DictionaryProvider';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as AppLocale;
  const messages = await loadMessages(typedLocale);
  const isRtl = typedLocale === 'fa';

  return (
    <DictionaryProvider value={{ locale: typedLocale, messages }}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </DictionaryProvider>
  );
}


