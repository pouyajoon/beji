"use client";

import { useAtom } from "../lib/jotai";
import { languageAtom } from "./atoms";
import { useEffect, useState } from "react";
import { loadMessages, defaultLocale, type AppLocale } from "../src/i18n";
import { DictionaryProvider } from "../i18n/DictionaryProvider";

// Minimal fallback messages to prevent errors during loading
const FALLBACK_MESSAGES: Record<string, unknown> = {
  Start: {
    subtitle: "Loading...",
    chooseEmojiLabel: "Choose Your Emoji",
    nameLabel: "Give Your Beji a Name",
    namePlaceholder: "e.g. Beji the Brave",
    startButton: "Start Adventure! 🚀",
    creating: "Creating...",
  },
  Login: {
    title: "Welcome to Beji 🎮",
    subtitle: "Connect with your Google account to start playing",
    signInButton: "Sign in with Google",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale] = useAtom(languageAtom);
  const [messages, setMessages] = useState<Record<string, unknown>>(FALLBACK_MESSAGES);
  const [currentLocale, setCurrentLocale] = useState<AppLocale>(defaultLocale);
  const [defaultMessagesLoaded, setDefaultMessagesLoaded] = useState(false);

  // Load default English messages immediately as fallback
  useEffect(() => {
    async function loadDefaultMessages() {
      try {
        const defaultMessages = await loadMessages(defaultLocale);
        setMessages(defaultMessages);
        setCurrentLocale(defaultLocale);
        setDefaultMessagesLoaded(true);
      } catch (error) {
        console.error("Failed to load default messages:", error);
        // Still set loaded flag to allow locale loading to proceed
        setDefaultMessagesLoaded(true);
      }
    }
    loadDefaultMessages();
  }, []);

  // Load locale-specific messages when locale changes and default messages are loaded
  useEffect(() => {
    if (!defaultMessagesLoaded) return;

    async function loadLocaleMessages(localeToLoad: AppLocale) {
      // Skip if already loading/loaded for this locale
      if (localeToLoad === currentLocale && messages && messages !== FALLBACK_MESSAGES) return;

      try {
        const loadedMessages = await loadMessages(localeToLoad);
        setMessages(loadedMessages);
        setCurrentLocale(localeToLoad);
      } catch (error) {
        console.error("Failed to load messages for locale:", localeToLoad, error);
        // Fallback to English if loading fails
        if (localeToLoad !== defaultLocale) {
          try {
            const fallbackMessages = await loadMessages(defaultLocale);
            setMessages(fallbackMessages);
            setCurrentLocale(defaultLocale);
          } catch (fallbackError) {
            console.error("Failed to load fallback messages:", fallbackError);
          }
        }
      }
    }

    loadLocaleMessages(locale);
  }, [locale, defaultMessagesLoaded, currentLocale]);

  // Always provide DictionaryProvider with at least fallback messages
  const effectiveLocale = currentLocale || defaultLocale;
  const isRtl = effectiveLocale === 'fa';

  return (
    <DictionaryProvider value={{ locale: effectiveLocale, messages }}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </DictionaryProvider>
  );
}

