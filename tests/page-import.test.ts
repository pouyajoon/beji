import { expect, test } from 'vitest';

test('importing app/page.tsx should not throw (catches regressions)', async () => {
  let threw = false;
  try {
    await import('../app/page');
  } catch (err) {
    threw = true;
  }
  // We assert that it DOES NOT throw once the issue is fixed.
  // Initially this will fail if there is an invalid `require` usage.
  expect(threw).toBe(false);
});


