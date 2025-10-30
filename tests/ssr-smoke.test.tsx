import { expect, test } from 'vitest';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

test('SSR render of app/page.tsx should not throw', async () => {
  const mod = await import('../app/page.tsx');
  const Page = mod.default;
  let threw = false;
  try {
    ReactDOMServer.renderToString(React.createElement(Page));
  } catch {
    threw = true;
  }
  expect(threw).toBe(false);
});

test('SSR render of app/emoji/page.tsx should not throw', async () => {
  const mod = await import('../app/emoji/page.tsx');
  const Page = mod.default;
  let threw = false;
  try {
    ReactDOMServer.renderToString(React.createElement(Page));
  } catch {
    threw = true;
  }
  expect(threw).toBe(false);
});


