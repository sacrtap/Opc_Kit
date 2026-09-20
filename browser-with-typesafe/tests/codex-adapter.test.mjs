import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createCodexAdapter, parseCodexLine, parseCodexState, parseCodexUrl } from '../bridge/adapters/codex.mjs';
import { run } from '../bridge/core.mjs';
import { stubDecide } from './helpers.mjs';

const ENV_FILE = fileURLToPath(new URL('./fixtures/credentials.env', import.meta.url));
const BASE = { envFile: ENV_FILE, provider: 'typesafe', allowedOrigins: ['https://example.com'] };

const SAMPLE = [
  'Browser tab: chrome, title "Settings", URL: "https://example.com/settings".',
  '1 heading Settings',
  '2 button Save',
  '3 text field Search',
  '4 radio button (checked) Description: Enable alerts',
  '5 menu item Notification preferences',
  '6 combo box Theme',
  '7 tab Results',
  'not a node line',
].join('\n');

test('parseCodexUrl reads the tab URL and fails closed when it is absent', () => {
  assert.equal(parseCodexUrl(SAMPLE), 'https://example.com/settings');
  assert.throws(() => parseCodexUrl('1 button Save'), /Cannot verify browser origin/);
});

test('parseCodexLine handles every documented AX line shape', () => {
  assert.deepEqual(parseCodexLine('2 button Save'), { ref: '2', role: 'button', name: 'Save' });
  assert.deepEqual(parseCodexLine('3 text field Search'), {
    ref: '3',
    role: 'text field',
    name: 'Search',
  });
  assert.deepEqual(parseCodexLine('4 radio button (checked) Description: Enable alerts'), {
    ref: '4',
    role: 'radio button',
    name: 'Enable alerts',
  });
  assert.deepEqual(parseCodexLine('5 menu item Notification preferences'), {
    ref: '5',
    role: 'menu item',
    name: 'Notification preferences',
  });
  assert.deepEqual(parseCodexLine('8 link'), { ref: '8', role: 'link', name: '' });
  assert.equal(parseCodexLine('Browser tab: chrome, URL: "https://example.com/".'), null);
  assert.equal(parseCodexLine('not a node line'), null);
});

test('parseCodexState normalizes native roles through the shared IR', () => {
  const nodes = parseCodexState(SAMPLE);
  assert.equal(nodes.length, 7);
  assert.deepEqual(nodes[0], { ref: '1', role: 'heading', name: 'Settings' });
  assert.deepEqual(nodes[3], { ref: '4', role: 'radio button', name: 'Enable alerts' });
  assert.deepEqual(nodes[4], { ref: '5', role: 'menu item', name: 'Notification preferences' });
});

test('createCodexAdapter rejects a handle that cannot satisfy the contract', () => {
  assert.throws(() => createCodexAdapter(undefined), /requires a tab handle/);
  assert.throws(() => createCodexAdapter({ click: () => {} }), /missing getAXState\(\)/);
});

test('createCodexAdapter maps IR actions onto the Codex tab contract', async () => {
  const calls = [];
  const tab = {
    async getAXState(options) {
      calls.push({ op: 'getAXState', options });
      return SAMPLE;
    },
    async click(index) {
      calls.push({ op: 'click', index });
    },
    async scroll(target, direction, amount) {
      calls.push({ op: 'scroll', target, direction, amount });
    },
    async pressKey(key) {
      calls.push({ op: 'pressKey', key });
    },
    async reload() {
      calls.push({ op: 'reload' });
    },
  };

  const adapter = createCodexAdapter(tab);
  assert.equal(adapter.name, 'codex');

  const state = await adapter.getState();
  assert.equal(state.origin, 'https://example.com');
  assert.equal(state.nodes.length, 7);
  assert.deepEqual(calls[0].options, { emit: false, disableDiffing: true });

  await adapter.click('2');
  assert.deepEqual(calls.at(-1), { op: 'click', index: 2 });

  await assert.rejects(() => adapter.click('not-a-number'), /numeric ref/);

  // an explicitly targeted scroll is passed straight through to the tab
  await adapter.scroll({ direction: 'down', amount: 2, target: '5' });
  assert.deepEqual(calls.at(-1), { op: 'scroll', target: 5, direction: 'down', amount: 2 });

  // an untargeted scroll pages the viewport, as the reference implementation did
  await adapter.scroll({ direction: 'down', amount: 3 });
  assert.deepEqual(calls.slice(-3), [
    { op: 'pressKey', key: 'PageDown' },
    { op: 'pressKey', key: 'PageDown' },
    { op: 'pressKey', key: 'PageDown' },
  ]);
  await adapter.scroll({ direction: 'up', amount: 1 });
  assert.deepEqual(calls.at(-1), { op: 'pressKey', key: 'PageUp' });

  await adapter.pressKey('Escape');
  assert.deepEqual(calls.at(-1), { op: 'pressKey', key: 'Escape' });

  await adapter.reload();
  assert.deepEqual(calls.at(-1), { op: 'reload' });
});

/** A Codex CUA tab backed by a tiny page model, used for the loop regression. */
function mockCodexTab() {
  const calls = [];
  let expanded = false;
  let scrolls = 0;

  const nodes = () =>
    expanded
      ? [
          { role: 'heading', name: 'Report workspace' },
          { role: 'text', name: `Status: expanded` },
          { role: 'text', name: `Scrolls: ${scrolls}` },
          { role: 'region', name: 'Evaluation report' },
          { role: 'button', name: 'Collapse section' },
        ]
      : [
          { role: 'heading', name: 'Report workspace' },
          { role: 'text', name: `Status: ${scrolls > 0 ? 'collapsed' : 'idle'}` },
          { role: 'text', name: `Scrolls: ${scrolls}` },
          { role: 'button', name: 'Expand section' },
        ];

  return {
    calls,
    get rendered() {
      return [
        'Browser tab: chrome, title "Report workspace", URL: "https://example.com/app".',
        ...nodes().map((node, index) => `${index + 1} ${node.role} ${node.name}`),
      ].join('\n');
    },
    async getAXState() {
      return this.rendered;
    },
    async click(index) {
      const target = nodes()[index - 1];
      calls.push({ op: 'click', index, name: target?.name });
      if (target?.name === 'Expand section') expanded = true;
      if (target?.name === 'Collapse section') expanded = false;
    },
    async scroll(target, direction, amount) {
      calls.push({ op: 'scroll', target, direction, amount });
      if (direction === 'down') scrolls += amount;
    },
    async pressKey(key) {
      calls.push({ op: 'pressKey', key });
      if (key === 'PageDown') scrolls += 1;
    },
    async reload() {
      calls.push({ op: 'reload' });
    },
  };
}

test('the shared decision loop drives a mock Codex tab end to end', async () => {
  let phase = 0;
  const restore = stubDecide(({ criteria }) => {
    const byDescription = (text) =>
      Object.entries(criteria).find(([, description]) => description === text)?.[0];
    const steps = [
      'Click Expand section',
      'Scroll down 2 pages within Evaluation report',
      'Click Collapse section',
    ];
    const next = phase < steps.length ? byDescription(steps[phase]) : undefined;
    if (next) {
      phase += 1;
      return next;
    }
    return 'DONE';
  });

  try {
    const tab = mockCodexTab();
    const adapter = createCodexAdapter(tab);
    const outcome = await run(adapter, {
      ...BASE,
      goal: 'Expand the report, scroll it, then collapse it.',
      controls: [
        { op: 'click', name: 'Expand section' },
        { op: 'click', name: 'Collapse section' },
      ],
      policy: {
        scrollDirections: ['down'],
        scrollAmount: 2,
        scrollTargetName: 'Evaluation report',
      },
    });

    assert.equal(outcome.status, 'needs_verification');
    assert.deepEqual(
      tab.calls.map((call) => call.op),
      ['click', 'scroll', 'click'],
      'one mechanical action per decided step, in order',
    );
    assert.equal(tab.calls[0].name, 'Expand section');
    assert.equal(tab.calls[1].direction, 'down');
    assert.equal(tab.calls[1].amount, 2);
    assert.equal(
      tab.calls[1].target,
      4,
      'the named container resolves to its own current index, not a stale one',
    );
    assert.equal(tab.calls[2].name, 'Collapse section');

    const final = await adapter.getState();
    assert.ok(final.nodes.some((node) => node.name === 'Status: collapsed'));
    assert.ok(final.nodes.some((node) => node.name === 'Scrolls: 2'));
    assert.equal(outcome.history.filter((item) => item.executed).length, 3);
  } finally {
    restore();
  }
});
