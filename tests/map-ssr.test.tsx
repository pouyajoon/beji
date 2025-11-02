import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';

// Mock next/navigation before importing the component
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

import { Map } from '../components/Map';
import { DictionaryProvider } from '../i18n/DictionaryProvider';

describe('Map SSR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders to an HTML string without throwing', () => {
    const html = renderToString(
      <DictionaryProvider value={{ locale: 'en', messages: {} }}>
        <Map />
      </DictionaryProvider>
    );
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});


