/**
 * Playwright end-to-end verification.
 *
 * Runs the exact task the omp run verifies, against a locally launched headless
 * browser, and asserts the same observable result. Exits non-zero on any
 * failure so the run is verifiable from a shell.
 *
 *   node tests/e2e/playwright.e2e.mjs
 *
 * Environment:
 *   BWT_CHROMIUM_PATH  explicit Chromium/Chrome executable to launch
 *   BWT_KEEP_OPEN=1    leave the browser open after the run
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlaywrightAdapter } from '../../bridge/adapters/playwright.mjs';
import { loadConfig } from '../../bridge/core.mjs';
import { isCleanStop, runTask, verify } from './task.mjs';

const require = createRequire(import.meta.url);
const FIXTURE = readFileSync(fileURLToPath(new URL('../fixtures/static-page.html', import.meta.url)), 'utf8');

/** Playwright may live outside this package; resolve it without adding a dependency. */
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core', join(homedir(), 'node_modules', 'playwright')];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try the next location
    }
  }
  throw new Error('playwright is not installed; run `npm i -D playwright` or set BWT_CHROMIUM_PATH');
}

async function launchBrowser(chromium) {
  const attempts = [];
  if (process.env.BWT_CHROMIUM_PATH) attempts.push({ executablePath: process.env.BWT_CHROMIUM_PATH });
  attempts.push({ channel: 'chrome' });
  attempts.push({});

  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch({ headless: true, ...options });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(FIXTURE);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const { chromium } = loadPlaywright();
  const server = await startServer();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const origin = new URL(url).origin;
  const config = await loadConfig();

  const browser = await launchBrowser(chromium);
  const page = await browser.newPage();
  const report = { url, adapter: 'playwright', steps: [], checks: {}, passed: false };

  try {
    await page.goto(url, { waitUntil: 'load' });

    const adapter = createPlaywrightAdapter(page);
    const { outcome, metrics } = await runTask(adapter, { origin, config });
    const verdict = verify(await adapter.getState());

    report.status = outcome.status;
    report.handoff = outcome.handoff;
    report.elapsedMs = outcome.elapsedMs;
    report.metrics = metrics;
    report.steps = outcome.history.map((item) => ({
      choice: item.choice,
      action: item.action,
      confidence: item.confidence,
      executed: item.executed === true,
      usage: item.usage ?? null,
    }));
    report.checks = verdict.checks;
    report.scrolls = verdict.scrolls;
    report.passed = isCleanStop(outcome) && verdict.passed;

    if (!report.passed && outcome.error) report.error = outcome.error;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (!process.env.BWT_KEEP_OPEN) {
      await browser.close().catch(() => {});
      server.close();
    }
  }

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}

await main();
