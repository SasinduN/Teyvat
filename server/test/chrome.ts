/**
 * Just enough of the Chrome DevTools Protocol to run code in a real headless
 * Chrome: launch it, open a page, evaluate an async expression, close it.
 *
 * Browser behaviour (EXIF orientation, canvas encoding, what decodes) can
 * only be tested in a browser. This drives the installed Chrome directly with
 * Node's built-in WebSocket, so the tests need no new dependency and no
 * browser download.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

function cleanProfile(profile: string) {
  // Crashpad can briefly retain handles after Chrome exits on Windows.
  // Cleanup must not replace the original browser failure in the report.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  catch (error) { console.warn('[chrome] Temporary profile cleanup failed:', error instanceof Error ? error.message : error); }
}

export function findChrome(): string | null {
  for (const path of CANDIDATES) if (path && existsSync(path)) return path;
  return null;
}

interface CdpMessage {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message: string };
}

export interface Page {
  /** Evaluates `expression` (which may return a promise) and returns its JSON value. */
  evaluate<T>(expression: string): Promise<T>;
  /** Any DevTools Protocol command on this page (viewport, screenshots, key presses). */
  send(method: string, params?: object): Promise<Record<string, unknown>>;
}

export interface Chrome {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

/**
 * How long Chrome gets to open its DevTools endpoint. A cold first launch on a
 * CI runner has taken over 10 s (it failed CI on main once at 10 s), so: 30 s,
 * and one retry with a fresh profile. Both fit inside HOOK_TIMEOUT (120 s).
 */
const STARTUP_TIMEOUT_MS = 30_000;
const STARTUP_ATTEMPTS = 2;

export async function launchChrome(executable: string): Promise<Chrome> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await launchOnce(executable);
    } catch (error) {
      if (attempt >= STARTUP_ATTEMPTS || !(error instanceof ChromeStartupError)) throw error;
      console.warn(`[chrome] ${error.message} Retrying (attempt ${attempt + 1} of ${STARTUP_ATTEMPTS}).`);
    }
  }
}

class ChromeStartupError extends Error {}

async function launchOnce(executable: string): Promise<Chrome> {
  const profile = mkdtempSync(join(tmpdir(), 'teyvat-chrome-'));
  const child: ChildProcess = spawn(
    executable,
    [
      '--headless=new',
      ...(process.env.CHROME_DISABLE_GPU === '1' ? ['--disable-gpu'] : []),
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      // GitHub's Ubuntu runners restrict the user namespaces Chrome's sandbox
      // needs, so there it can't start sandboxed. Only in CI, and only ever
      // for these tests' own pages.
      ...(process.env.CI ? ['--no-sandbox'] : []),
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  // Chrome writes the port it picked, and the browser endpoint, here.
  const portFile = join(profile, 'DevToolsActivePort');
  let endpoint = '';
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!endpoint && Date.now() < deadline) {
    if (existsSync(portFile)) {
      const [port, path] = readFileSync(portFile, 'utf8').split('\n');
      if (port && path) endpoint = `ws://127.0.0.1:${port.trim()}${path.trim()}`;
    }
    if (!endpoint) await sleep(100);
  }
  if (!endpoint) {
    child.kill();
    cleanProfile(profile);
    throw new ChromeStartupError(
      `Chrome did not start its DevTools endpoint within ${STARTUP_TIMEOUT_MS / 1000} s.`
    );
  }

  const socket = new WebSocket(endpoint);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome.')), { once: true });
    socket.addEventListener('close', () => reject(new Error('Chrome closed before connecting.')), { once: true });
  });

  let nextId = 1;
  const pending = new Map<number, { settle: (message: CdpMessage) => void; reject: (error: Error) => void }>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id !== undefined) pending.get(message.id)?.settle(message);
  });
  const disconnect = () => {
    for (const command of pending.values()) command.reject(new Error('Chrome disconnected during a DevTools command.'));
    pending.clear();
  };
  socket.addEventListener('close', disconnect);
  socket.addEventListener('error', disconnect);

  function send(method: string, params: object = {}, sessionId?: string): Promise<Record<string, unknown>> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) { reject(new Error(`Chrome is disconnected (${method}).`)); return; }
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome did not answer ${method} within 15 seconds.`));
      }, 15_000);
      pending.set(id, {
        reject: (error) => { clearTimeout(timer); reject(error); },
        settle: (message) => {
          clearTimeout(timer);
          pending.delete(id);
          if (message.error) reject(new Error(`${method}: ${message.error.message}`));
          else resolve(message.result ?? {});
        }
      });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  return {
    async newPage() {
      const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })) as { targetId: string };
      const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })) as {
        sessionId: string;
      };

      return {
        send: (method: string, params: object = {}) => send(method, params, sessionId),
        async evaluate<T>(expression: string): Promise<T> {
          const result = (await send(
            'Runtime.evaluate',
            { expression, awaitPromise: true, returnByValue: true },
            sessionId
          )) as {
            result: { value?: unknown };
            exceptionDetails?: { exception?: { description?: string }; text?: string };
          };
          if (result.exceptionDetails) {
            const d = result.exceptionDetails;
            throw new Error(d.exception?.description ?? d.text ?? 'evaluation failed');
          }
          return result.result.value as T;
        }
      };
    },

    async close() {
      await send('Browser.close').catch(() => undefined);
      socket.close();
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null) resolve();
        else child.once('exit', () => resolve());
        setTimeout(() => {
          child.kill();
          resolve();
        }, 5000).unref();
      });
      cleanProfile(profile);
    }
  };
}
