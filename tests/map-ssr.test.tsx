import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { Map } from '../components/Map';

describe('Map SSR', () => {
  it('renders to an HTML string without throwing', () => {
    const html = renderToString(<Map />);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});


