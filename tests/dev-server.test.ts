import { expect, test } from 'vitest';
import getPort from 'get-port';
import { spawn } from 'node:child_process';

// This test starts Next.js in dev mode on a random port,
// verifies the index page responds, and then shuts it down.
const run = process.env.INTEGRATION === '1' ? test : test.skip;

run('next dev starts and serves the home page', async () => {
  const port = await getPort();
  const child = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'next', 'dev', '-p', String(port)],
    {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let ready = false;
  const readyRegex = /started server on/i;
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d: string) => {
    stdoutChunks.push(d);
    if (readyRegex.test(d)) ready = true;
  });
  child.stderr.on('data', (d: string) => {
    stderrChunks.push(d);
  });

  // Wait until server logs readiness or until timeout
  const start = Date.now();
  const timeoutMs = 30000;
  while (!ready && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 200));
  }

  // If not detected by log, still try hitting the server a few times
  let ok = false;
  for (let i = 0; i < 25 && !ok; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      ok = res.status === 200;
    } catch {
      // ignore and retry
    }
    if (!ok) await new Promise((r) => setTimeout(r, 200));
  }

  // Cleanup
  child.kill('SIGINT');

  if (!ok) {
    // surface logs for debugging
    // eslint-disable-next-line no-console
    console.error('stdout:', stdoutChunks.join(''));
    // eslint-disable-next-line no-console
    console.error('stderr:', stderrChunks.join(''));
  }

  expect(ok).toBe(true);
}, 60000);


