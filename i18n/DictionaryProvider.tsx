"use client";

import { createContext, useContext } from 'react';

type DictionaryContextValue = {
  locale: string;
  messages: Record<string, any>;
};

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  value,
  children
}: {
  value: DictionaryContextValue;
  children: React.ReactNode;
}) {
  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
}

export function useMessages<T = any>(): { locale: string; messages: T } {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error('useMessages must be used within a DictionaryProvider');
  }
  return ctx as unknown as { locale: string; messages: T };
}


