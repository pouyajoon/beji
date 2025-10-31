import { expect, test } from 'vitest';
import getPort from 'get-port';
import { spawn } from 'node:child_process';

// Starts Next.js in dev mode and verifies SSR for a locale route (e.g., /en)
const run = process.env.INTEGRATION === '1' ? test : test.skip;

run('SSR renders the locale-prefixed home page with translations', async () => {
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

    // Try hitting the locale route
    let resOk = false;
    let body = '';
    for (let i = 0; i < 25 && !resOk; i++) {
        try {
            const res = await fetch(`http://localhost:${port}/en`);
            body = await res.text();
            resOk = res.status === 200 && body.length > 0;
        } catch {
            // ignore and retry
        }
        if (!resOk) await new Promise((r) => setTimeout(r, 200));
    }

    // Cleanup
    child.kill('SIGINT');

    if (!resOk) {
        // surface logs for debugging
        // eslint-disable-next-line no-console
        console.error('stdout:', stdoutChunks.join(''));
        // eslint-disable-next-line no-console
        console.error('stderr:', stderrChunks.join(''));
    }

    expect(resOk).toBe(true);
    // Assert that an English translation string is present
    expect(body).toMatch(/Choose your emoji and give it a name/i);
}, 60000);


