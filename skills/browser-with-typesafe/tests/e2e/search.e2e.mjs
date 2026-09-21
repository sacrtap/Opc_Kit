/**
 * Playwright-scripted verification of the search+filter+form fixture
 * (expected=4) and its self-report.
 *
 * Drives the fixture with a deterministic Playwright script — no model tokens
 * spent — and proves the fixture's contract the paid A/B depends on:
 *
 *   full     the complete 4-action flow (fill query, click the target row,
 *            fill name, fill email), reading the run-seeded values from the
 *            page prompt the way the host must, reaches the end state and the
 *            page's own report says ok:true — and every step was selectable
 *            from the live snapshot under the skill's discovery rules
 *   gate     the flow is genuinely state-dependent: before the query there are
 *            no result rows and no form fields; a WRONG query renders nothing
 *            and a wrong row does not advance; the correct query renders
 *            several similar rows and only the target row opens the form
 *   short    a deliberately short 1-action run (query only) reports ok:false,
 *            so the counter is not trivially satisfiable
 *   partial  a 3-action run (query + row + name only) reports ok:false and
 *            status "form", so both field values are required
 *   three    the original 3-action flow still reports ok:true with expected=3
 *   wizard   the wizard flow (expected=10) still routes its report through the
 *            wizard status, so the new branch left the 3/10/15 reports intact
 *   fifteen  the 15-action fixture contract still holds: for expected=15 the
 *            DOM contains zero text-entry controls (the search flow is rendered
 *            only for expected=4)
 *
 *   node tests/e2e/search.e2e.mjs
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
import { TEXT_ROLES } from '../../bridge/ir.mjs';

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

/** Serve the fixture and record every self-report it posts. */
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
 * The search flow's 4 mechanical steps, expressed the way the skill's own
 * discovery expresses them: a fill on a uniquely named text-entry control (the
 * value comes from the run-seeded page prompt) and a click on the uniquely
 * named target row. `seeded` is parsed from the page prompt, exactly as the
 * host must read it.
 */
function searchSteps(seeded) {
  return [
    { op: 'fill', role: 'searchbox', name: 'Search products', value: seeded.query },
    { op: 'click', role: 'button', name: seeded.target },
    { op: 'fill', role: 'textbox', name: 'Name', value: seeded.name },
    { op: 'fill', role: 'textbox', name: 'Email', value: seeded.email },
  ];
}

/** The original 3-action flow, unchanged: expand, scroll, collapse. */
const THREE_STEPS = [
  { op: 'click', role: 'button', name: 'Expand section' },
  { op: 'scroll', direction: 'down', container: 'Evaluation report' },
  { op: 'click', role: 'button', name: 'Collapse section' },
];

/** Policy the skill's discovery needs to select the search flow's steps. */
const SEARCH_POLICY = {
  click: true,
  scrollDirections: [],
  denyNames: [/delete/i],
  requireHostNames: [/publish/i, /send/i],
};

/**
 * Parse the run-seeded values out of the page's prompt. The prompt format is
 * fixed by the fixture: four double-quoted values, in order — query, target
 * product, name, email.
 */
function parsePrompt(text) {
  const quoted = [...String(text).matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quoted.length !== 4 || quoted.some((value) => !value)) {
    throw new Error(`unexpected search prompt: ${text}`);
  }
  return { query: quoted[0], target: quoted[1], name: quoted[2], email: quoted[3] };
}

/**
 * Is `step` selectable from the live snapshot under the skill's discovery?
 * Clicks must resolve through availableActions/discoverActions exactly as the
 * engine offers them each round; a fill's fixture-side contract is a TEXT_ROLES
 * node with a unique name and a ref — the shape fill candidates require.
 */
function discoverStep(ir, step) {
  const actions = [...availableActions(ir, []), ...discoverActions(ir, SEARCH_POLICY)];
  if (step.op === 'click') {
    return actions.find((action) => action.op === 'click' && action.name === step.name) ?? null;
  }
  // The fixture renders a labelled input as BOTH a `text: <label>` node and
  // the `textbox "<label>"` control, so the find must require the TEXT_ROLES
  // role — the shape fill candidates are built from.
  const node = ir.nodes.find(
    (candidate) => candidate.name === step.name && TEXT_ROLES.has(candidate.role),
  );
  return node && node.ref !== null ? node : null;
}

async function scrollContainer(page, name) {
  await page
    .getByRole('region', { name, exact: true })
    .evaluate((element) => element.scrollBy(0, element.clientHeight));
}

async function performStep(page, step) {
  if (step.op === 'scroll') return scrollContainer(page, step.container);
  if (step.op === 'fill') {
    return page.getByRole(step.role, { name: step.name, exact: true }).fill(step.value);
  }
  return page.getByRole(step.role, { name: step.name, exact: true }).click();
}

/**
 * Script the steps against the page while checking, before each one, that the
 * skill's own discovery offers it. Returns the steps the discovery could not
 * resolve (empty means every step is selectable, i.e. a skill run can actually
 * choose it).
 */
async function runScripted(page, { steps }) {
  const adapter = createPlaywrightAdapter(page);
  const missed = [];
  for (let i = 0; i < steps.length; i += 1) {
    if (!discoverStep(await adapter.getState(), steps[i])) missed.push(steps[i].name ?? steps[i].key);
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
    run: report.run ?? null,
    status: report.status ?? null,
    actions: report.actions ?? null,
    expected: report.expected ?? null,
    ok: report.ok ?? null,
    scrolls: report.scrolls ?? null,
    expandVisible: report.expandVisible ?? null,
    collapseVisible: report.collapseVisible ?? null,
    panelVisible: report.panelVisible ?? null,
    keys: report ? Object.keys(report).sort() : null,
  };
}

/** Text-entry controls present in the DOM (the 15-action fixture contract). */
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
    gate: null,
    short: null,
    partial: null,
    three: null,
    wizard: null,
    fifteen: null,
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
    // ── Full 4-action run (values read from the page prompt) ──
    {
      const { browser, page } = await open('full', 4);
      const seeded = parsePrompt(await page.locator('#searchPrompt').textContent());
      const { missed } = await runScripted(page, { steps: searchSteps(seeded) });
      await page.waitForTimeout(200);
      results.full = {
        ...pick(await reportFor(reports, 'full')),
        seeded,
        undiscoverable: missed,
      };
      await browser.close().catch(() => {});
    }

    // ── State dependence + wrong-query/wrong-row rejection ────
    {
      const { browser, page } = await open('gate', 4);
      const seeded = parsePrompt(await page.locator('#searchPrompt').textContent());
      const live = {
        before: {
          buttons: await page.getByRole('button').count(),
          textboxes: await page.getByRole('textbox').count(),
          searchboxes: await page.getByRole('searchbox').count(),
        },
      };
      // A wrong query renders nothing.
      await page.getByRole('searchbox', { name: 'Search products', exact: true }).fill('zzz');
      await page.waitForTimeout(50);
      live.afterWrongQuery = {
        buttons: await page.getByRole('button').count(),
        feedback: await page.locator('#searchFeedback').textContent(),
      };
      // The correct query renders several similar rows; no form yet.
      await page.getByRole('searchbox', { name: 'Search products', exact: true }).fill(seeded.query);
      await page.waitForTimeout(50);
      live.afterQuery = {
        buttons: await page.getByRole('button').count(),
        textboxes: await page.getByRole('textbox').count(),
        names: await page.getByRole('button').allTextContents(),
      };
      // A wrong row must not open the form.
      const wrongRow =
        (await page.getByRole('button').allTextContents()).find((name) => name !== seeded.target) ??
        null;
      if (wrongRow) {
        await page.getByRole('button', { name: wrongRow, exact: true }).click();
        await page.waitForTimeout(50);
      }
      live.afterWrongRow = {
        textboxes: await page.getByRole('textbox').count(),
        feedback: await page.locator('#searchFeedback').textContent(),
      };
      // The target row opens the form; filling name only must not complete it.
      await page.getByRole('button', { name: seeded.target, exact: true }).click();
      await page.waitForTimeout(50);
      live.afterTargetRow = { textboxes: await page.getByRole('textbox').count() };
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(seeded.name);
      await page.waitForTimeout(50);
      live.afterName = { status: await page.locator('#searchStatus').textContent() };
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(seeded.email);
      await page.waitForTimeout(200);
      results.gate = { seeded, live, ...pick(await reportFor(reports, 'gate')) };
      await browser.close().catch(() => {});
    }

    // ── Short 1-action run (must report ok:false) ──────────────
    {
      const { browser, page } = await open('short', 4);
      const seeded = parsePrompt(await page.locator('#searchPrompt').textContent());
      await page.getByRole('searchbox', { name: 'Search products', exact: true }).fill(seeded.query);
      await page.waitForTimeout(200);
      results.short = pick(await reportFor(reports, 'short'));
      await browser.close().catch(() => {});
    }

    // ── Partial 3-action run (query + row + name only, ok:false) ──
    {
      const { browser, page } = await open('partial', 4);
      const seeded = parsePrompt(await page.locator('#searchPrompt').textContent());
      await runScripted(page, { steps: searchSteps(seeded).slice(0, 3) });
      await page.waitForTimeout(200);
      results.partial = pick(await reportFor(reports, 'partial'));
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

    // ── Wizard flow routing (expected=10, report stays on wizard status) ──
    {
      const { browser, page } = await open('wizard', 10);
      // Read the step-1 target word from the freshly rendered prompt, then
      // answer exactly one step: enough to observe which status feeds the
      // report on the expected=10 branch.
      const prompt = await page.locator('#wizardPrompt').textContent();
      const target = prompt.match(/"([^"]+)"/)?.[1];
      if (target) {
        await page.getByRole('button', { name: target, exact: true }).click();
        await page.waitForTimeout(200);
      }
      results.wizard = { target, ...pick(await reportFor(reports, 'wizard')) };
      await browser.close().catch(() => {});
    }

    // ── 15-action fixture contract: zero text-entry controls for expected=15 ──
    {
      const { browser, page } = await open('fifteen', 15);
      results.fixture.textControls = await textControls(page);
      results.fixture.searchStatusExists = await page.evaluate(
        () => document.getElementById('searchStatus') !== null,
      );
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
    results.full?.actions === 4 &&
    results.full?.expected === 4 &&
    results.full?.status === 'complete' &&
    results.full?.undiscoverable.length === 0;
  const gateOk =
    results.gate?.ok === true &&
    results.gate?.live?.before?.buttons === 0 &&
    results.gate?.live?.before?.textboxes === 0 &&
    results.gate?.live?.before?.searchboxes === 1 &&
    results.gate?.live?.afterWrongQuery?.buttons === 0 &&
    String(results.gate?.live?.afterWrongQuery?.feedback ?? '').includes('No products match') &&
    results.gate?.live?.afterQuery?.buttons === 5 &&
    results.gate?.live?.afterQuery?.textboxes === 0 &&
    results.gate?.live?.afterQuery?.names?.includes(results.gate?.seeded?.target) &&
    results.gate?.live?.afterWrongRow?.textboxes === 0 &&
    String(results.gate?.live?.afterWrongRow?.feedback ?? '').includes('not the requested product') &&
    results.gate?.live?.afterTargetRow?.textboxes === 2 &&
    results.gate?.live?.afterName?.status === 'form';
  const shortOk = results.short?.ok === false && results.short?.actions === 1;
  const partialOk =
    results.partial?.ok === false &&
    results.partial?.actions === 3 &&
    results.partial?.status === 'form';
  const threeOk =
    results.three?.ok === true &&
    results.three?.expected === 3 &&
    results.three?.status === 'collapsed' &&
    results.three?.scrolls >= 1 &&
    results.three?.expandVisible === true &&
    results.three?.collapseVisible === false &&
    results.three?.panelVisible === false;
  const wizardOk =
    results.wizard?.target &&
    results.wizard?.expected === 10 &&
    results.wizard?.actions === 1 &&
    results.wizard?.status === 'pending' &&
    results.wizard?.ok === false &&
    results.wizard?.keys?.join(',') ===
      'actions,collapseVisible,expandVisible,expected,ok,panelVisible,run,scrolls,status';
  const fixtureOk = results.fixture?.textControls === 0 && results.fixture?.searchStatusExists === false;

  results.checks = { fullOk, gateOk, shortOk, partialOk, threeOk, wizardOk, fixtureOk };
  results.passed = Object.values(results.checks).every(Boolean) && !results.error;

  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.passed ? 0 : 1;
}

await main();
