import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import HomePage from '../app/page';

describe('HomePage SSR', () => {
  it('renders to an HTML string without throwing', () => {
    const html = renderToString(<HomePage />);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    // Basic content smoke checks
    expect(html).toContain('Beji');
    expect(html).toContain('Responsive card A');
  });
});


