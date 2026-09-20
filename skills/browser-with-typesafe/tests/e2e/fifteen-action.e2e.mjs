/**
 * Playwright-scripted verification of the 15-action fixture and its self-report.
 *
 * Drives the fixture with a deterministic Playwright script — no model tokens
 * spent — and proves four independent things a paid A/B would otherwise be the
 * first to discover:
 *
 *   full    a scripted 15-action run reaches the expected end state and the
 *           page's own report says ok:true (the fixture is solvable, and the
 *           verdict is the page's, not the agent's claim)
 *   farmed  the same target sequence plus one extra toggle reaches 16 counted
 *           actions but breaks the end state => ok:false, so `ok` is an
 *           end-state verdict and not a satisfiable counter
 *   short   a deliberately short 5-action run reports ok:false, so the counter
 *           is not trivially satisfiable
 *   three   the original 3-action flow still reports ok:true with expected=3,
 *           which is the fixture contract the published 3-action A/B depends on
 *   policy  TASK_15's policy can select every one of the 15 steps against the
 *           live ARIA snapshot (and the fixture offers no text-entry or
 *           dropdown control), so the task definition and page agree
 *
 *   node tests/e2e/fifteen-action.e2e.mjs
 *
 * Environment:
 *   BWT_CHROMIUM_PATH  explicit Chromium/Chrome executable to launch
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlaywrightAdapter } from '../../bridge/adapters/playwright.mjs';
import { availableActions, discoverActions } from '../../bridge/core.mjs';
import { TASK_15 } from './task.mjs';

const require = createRequire(import.meta.url);
const FIXTURE = readFileSync(
  fileURLToPath(new URL('../fixtures/static-page.html', import.meta.url)),
  'utf8',
);

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

/**
 * Serve the fixture and record every self-report it posts. Mirrors
 * experiment-server.mjs so the fixture's hook is exercised against the same
 * endpoint shape the paid A/B uses.
 */
function startServer() {
  const reports = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (request.method === 'POST' && url.pathname === '/report') {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        try {
          reports.push(JSON.parse(body));
        } catch {
          // ignore malformed reports; a missing record reads as a failed run
        }
        response.writeHead(204).end();
      });
      return;
    }

    if (url.pathname === '/reports') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(reports, null, 2));
      return;
    }

    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(FIXTURE);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, reports }));
  });
}

/**
 * The 15 mechanical steps the fixture is built for, in order, expressed the way
 * the skill's own action discovery expresses them: a click on a uniquely named
 * control, a scroll down inside the named report container, or Escape.
 */
const FIFTEEN_STEPS = [
  { op: 'click', role: 'button', name: 'Expand section A' },
  { op: 'click', role: 'checkbox', name: 'Accept terms A1' },
  { op: 'click', role: 'checkbox', name: 'Accept terms A2' },
  { op: 'click', role: 'button', name: 'Expand section B' },
  { op: 'click', role: 'radio', name: 'Option B1' },
  { op: 'click', role: 'button', name: 'Expand section C' },
  { op: 'scroll', direction: 'down', container: 'Compliance report' },
  { op: 'click', role: 'checkbox', name: 'Accept terms C1' },
  { op: 'click', role: 'button', name: 'Expand section D' },
  { op: 'click', role: 'checkbox', name: 'Accept terms D1' },
  { op: 'scroll', direction: 'down', container: 'Compliance report' },
  { op: 'click', role: 'button', name: 'Expand section E' },
  { op: 'click', role: 'radio', name: 'Option E1' },
  { op: 'press', key: 'Escape' },
  { op: 'click', role: 'button', name: 'Confirm submission' },
];

/** The original 3-action flow, unchanged: expand, scroll, collapse. */
const THREE_STEPS = [
  { op: 'click', role: 'button', name: 'Expand section' },
  { op: 'scroll', direction: 'down', container: 'Evaluation report' },
  { op: 'click', role: 'button', name: 'Collapse section' },
];

async function scrollContainer(page, name) {
  await page
    .getByRole('region', { name, exact: true })
    .evaluate((element) => element.scrollBy(0, element.clientHeight));
}

async function performStep(page, step) {
  if (step.op === 'scroll') return scrollContainer(page, step.container);
  if (step.op === 'press') return page.keyboard.press(step.key);
  return page.getByRole(step.role, { name: step.name, exact: true }).click();
}

/**
 * Is `step` selectable from the live snapshot under TASK_15? Returns the
 * discovered action, or null. The candidate set is the same union `run()`
 * offers Jev each round, so a step that resolves here is a step the paid run
 * can actually choose.
 */
function discoverStep(ir, step) {
  const actions = [
    ...availableActions(ir, TASK_15.controls),
    ...discoverActions(ir, TASK_15.policy),
  ];
  if (step.op === 'click') {
    return actions.find((action) => action.op === 'click' && action.name === step.name) ?? null;
  }
  if (step.op === 'press') {
    return actions.find((action) => action.op === 'press' && action.key === step.key) ?? null;
  }
  const scroll = actions.find(
    (action) => action.op === 'scroll' && action.direction === step.direction,
  );
  if (!scroll) return null;
  const target = ir.nodes.find((node) => node.ref === scroll.target);
  return target?.name === step.container ? scroll : null;
}

/**
 * Script the steps against the page while checking, before each one, that the
 * skill's own discovery offers it. `steps` is the exact sequence to perform;
 * `expect` is the sequence the policy check requires (they differ only for the
 * deliberately farmed run).
 */
async function runScripted(page, { steps, expect = steps, checkPolicy }) {
  const adapter = createPlaywrightAdapter(page);
  const missed = [];
  for (let i = 0; i < steps.length; i += 1) {
    if (checkPolicy) {
      const wanted = expect[i];
      if (!discoverStep(await adapter.getState(), wanted)) missed.push(wanted.name ?? wanted.key);
    }
    await performStep(page, steps[i]);
    // Let the page settle (the self-report fires on every interaction).
    await page.waitForTimeout(50);
  }
  return { missed };
}

/** Report fields a scenario asserts on, read from the last report of that run. */
async function reportFor(reports, run) {
  // The hook fires on every interaction, so the run's verdict is its LAST
  // report. Taking the first would measure the first click, not the outcome.
  return reports.filter((record) => record.run === run).at(-1) ?? null;
}

function pick(report) {
  if (!report) return null;
  return {
    actions: report.actions ?? null,
    expected: report.expected ?? null,
    ok: report.ok ?? null,
    status: report.status ?? null,
    scrolls: report.scrolls ?? null,
    expandVisible: report.expandVisible ?? null,
    collapseVisible: report.collapseVisible ?? null,
    panelVisible: report.panelVisible ?? null,
  };
}

/** Text-entry and dropdown controls the skill cannot operate must not exist. */
async function textControls(page) {
  return page.evaluate(() =>
    document.querySelectorAll(
      'input[type=text], input[type=email], input[type=password], input[type=search], input[type=number], input[type=tel], input[type=url], input[type=date], textarea, select, [contenteditable]',
    ).length,
  );
}

async function main() {
  const { chromium } = loadPlaywright();
  const { server, reports } = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = {
    full: null,
    farmed: null,
    short: null,
    three: null,
    policy: null,
    fixture: {},
    passed: false,
  };

  /** Fresh page wired to the self-report hook, plus its browser to close. */
  const open = async (run, expected) => {
    const browser = await launchBrowser(chromium);
    const page = await browser.newPage();
    await page.goto(`${base}/?report=${base}/report&run=${run}&expected=${expected}`, {
      waitUntil: 'load',
    });
    return { browser, page };
  };

  try {
    // ── Fixture shape: no operation the skill cannot perform ────
    {
      const { browser, page } = await open('fixture', 15);
      results.fixture.textControls = await textControls(page);
      await browser.close().catch(() => {});
    }

    // ── Full 15-action run ─────────────────────────────────────
    {
      const { browser, page } = await open('full', 15);
      const { missed } = await runScripted(page, { steps: FIFTEEN_STEPS, checkPolicy: true });
      await page.waitForTimeout(200);
      results.full = { ...pick(await reportFor(reports, 'full')), undiscoverable: missed };
      await browser.close().catch(() => {});
    }

    // ── Farmed run: 16 counted actions, broken end state ───────
    {
      const { browser, page } = await open('farmed', 15);
      const farmed = [
        ...FIFTEEN_STEPS.slice(0, 2),
        { op: 'click', role: 'checkbox', name: 'Accept terms A1' }, // toggles A1 back off
        ...FIFTEEN_STEPS.slice(2),
      ];
      await runScripted(page, { steps: farmed, expect: FIFTEEN_STEPS });
      await page.waitForTimeout(200);
      results.farmed = pick(await reportFor(reports, 'farmed'));
      await browser.close().catch(() => {});
    }

    // ── Short 5-action run (must report ok:false) ──────────────
    {
      const { browser, page } = await open('short', 15);
      await runScripted(page, { steps: FIFTEEN_STEPS.slice(0, 5) });
      await page.waitForTimeout(200);
      results.short = pick(await reportFor(reports, 'short'));
      await browser.close().catch(() => {});
    }

    // ── Original 3-action flow (must still report ok:true) ─────
    {
      const { browser, page } = await open('three', 3);
      await runScripted(page, { steps: THREE_STEPS });
      await page.waitForTimeout(200);
      results.three = pick(await reportFor(reports, 'three'));
      await browser.close().catch(() => {});
    }

    // ── TASK_15 policy resolves every step from the live snapshot ──
    {
      const { browser, page } = await open('policy', 15);
      const { missed } = await runScripted(page, { steps: FIFTEEN_STEPS, checkPolicy: true });
      results.policy = { steps: FIFTEEN_STEPS.length, undiscoverable: missed };
      await browser.close().catch(() => {});
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  } finally {
    server.close();
  }

  // ── Verdict ───────────────────────────────────────────────────
  const fullOk =
    results.full?.ok === true &&
    results.full?.actions === 15 &&
    results.full?.expected === 15 &&
    results.full?.status === 'confirmed' &&
    results.full?.scrolls >= 2 &&
    results.full?.undiscoverable.length === 0;
  const farmedOk =
    results.farmed?.ok === false && results.farmed?.actions === 16 && results.farmed?.actions >= 15;
  const shortOk = results.short?.ok === false && results.short?.actions === 5;
  const threeOk =
    results.three?.ok === true &&
    results.three?.expected === 3 &&
    results.three?.status === 'collapsed' &&
    results.three?.scrolls >= 1 &&
    results.three?.expandVisible === true &&
    results.three?.collapseVisible === false &&
    results.three?.panelVisible === false;
  const policyOk = results.policy?.undiscoverable.length === 0;
  const fixtureOk = results.fixture?.textControls === 0;

  results.checks = { fullOk, farmedOk, shortOk, threeOk, policyOk, fixtureOk };
  results.passed = Object.values(results.checks).every(Boolean) && !results.error;

  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.passed ? 0 : 1;
}

await main();
