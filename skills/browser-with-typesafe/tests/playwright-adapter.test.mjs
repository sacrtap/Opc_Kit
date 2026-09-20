import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlaywrightAdapter } from '../bridge/adapters/playwright.mjs';

const SNAPSHOT = [
  '- heading "Report workspace" [level=1]',
  '- paragraph:',
  '  - text: "Status:"',
  '  - status: idle',
  '- region "Evaluation report":',
  '  - heading "Evaluation report" [level=2]',
  '  - listitem: Evaluation item 1',
  '- button "Save"',
  '- button "Save"',
  '- button "Expand section"',
].join('\n');

/** Minimal Playwright page double recording locator resolution. */
function fakePage(snapshot = SNAPSHOT) {
  const calls = [];
  return {
    calls,
    page: {
      url: () => 'https://example.com/app',
      locator: (selector) => ({
        async ariaSnapshot(options) {
          calls.push({ op: 'ariaSnapshot', selector, options });
          return snapshot;
        },
      }),
      getByRole: (role, options) => ({
        nth: (nth) => ({
          async click(clickOptions) {
            calls.push({ op: 'click', role, name: options?.name ?? null, nth, clickOptions });
          },
          async evaluate(fn, arg) {
            calls.push({ op: 'evaluate', role, name: options?.name ?? null, nth, arg });
          },
        }),
      }),
      async evaluate() {
        return 800;
      },
      mouse: {
        async wheel(dx, dy) {
          calls.push({ op: 'wheel', dx, dy });
        },
      },
      keyboard: {
        async press(key) {
          calls.push({ op: 'press', key });
        },
      },
      async reload() {
        calls.push({ op: 'reload' });
      },
    },
  };
}

test('createPlaywrightAdapter rejects a non-page handle', () => {
  assert.throws(() => createPlaywrightAdapter(null), /requires a Playwright page/);
  assert.throws(() => createPlaywrightAdapter({ locator: () => {} }), /requires a Playwright page/);
});

test('createPlaywrightAdapter converts the page into IR with ordinal refs', async () => {
  const { page } = fakePage();
  const adapter = createPlaywrightAdapter(page);
  assert.equal(adapter.name, 'playwright');

  const state = await adapter.getState();
  assert.equal(state.origin, 'https://example.com');
  assert.equal(state.nodes[0].ref, 'n0');
  assert.deepEqual(
    { role: state.nodes[0].role, name: state.nodes[0].name },
    { role: 'heading', name: 'Report workspace' },
  );
  assert.ok(state.nodes.some((node) => node.name === 'Status:'));
  assert.ok(state.nodes.every((node) => node.ref !== null), 'every node is addressable');
});

test('createPlaywrightAdapter disambiguates duplicate role+name pairs by occurrence', async () => {
  const { page, calls } = fakePage();
  const adapter = createPlaywrightAdapter(page);
  const state = await adapter.getState();

  const saves = state.nodes.filter((node) => node.name === 'Save');
  assert.deepEqual(saves.map((node) => node.ref), ['n7', 'n8']);

  await adapter.click('n7');
  await adapter.click('n8');
  assert.deepEqual(
    calls.filter((call) => call.op === 'click').map((call) => call.nth),
    [0, 1],
    'the second Save resolves to the second occurrence',
  );
});

test('createPlaywrightAdapter maps the remaining actions onto the Playwright API', async () => {
  const { page, calls } = fakePage();
  const adapter = createPlaywrightAdapter(page);
  const state = await adapter.getState();

  const expand = state.nodes.find((node) => node.name === 'Expand section');
  await adapter.click(expand.ref);
  assert.deepEqual(calls.at(-1), {
    op: 'click',
    role: 'button',
    name: 'Expand section',
    nth: 0,
    clickOptions: { timeout: 15000 },
  });

  // a named container scrolls itself
  const report = state.nodes.find((node) => node.name === 'Evaluation report' && node.role === 'region');
  await adapter.scroll({ direction: 'down', amount: 2, target: report.ref });
  assert.deepEqual(
    calls.at(-1),
    { op: 'evaluate', role: 'region', name: 'Evaluation report', nth: 0, arg: 2 },
  );

  // an untargeted scroll wheels the page by a viewport
  await adapter.scroll({ direction: 'up' });
  assert.deepEqual(calls.at(-1), { op: 'wheel', dx: 0, dy: -800 });

  await adapter.pressKey('PageDown');
  assert.deepEqual(calls.at(-1), { op: 'press', key: 'PageDown' });

  await adapter.reload();
  assert.deepEqual(calls.at(-1), { op: 'reload' });
});

test('createPlaywrightAdapter refuses a ref from a superseded snapshot', async () => {
  const { page } = fakePage();
  const adapter = createPlaywrightAdapter(page);
  await adapter.getState();
  await assert.rejects(() => adapter.click('n999'), /Unknown or stale ref: n999/);
  await assert.rejects(() => adapter.click('8'), /Unknown or stale ref: 8/);
});
