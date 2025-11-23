import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-router-dom before importing the component
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Route: ({ element }: { element: React.ReactNode }) => <>{element}</>,
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


