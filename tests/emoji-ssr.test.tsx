import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import EmojiPage from '../app/emoji/page';

describe('Emoji page SSR', () => {
  it('renders to an HTML string without throwing', () => {
    const html = renderToString(<EmojiPage />);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});


