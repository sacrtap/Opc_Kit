import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADAPTER_KINDS,
  adapterFor,
  createAutoSession,
  detectAdapter,
} from '../bridge/index.mjs';

const ompTab = {
  url: async () => 'https://example.com/',
  ariaSnapshot: async () => '- button "A" [ref=e1]',
  ref: async () => ({ click: async () => {}, evaluate: async () => {} }),
  scroll: async () => {},
  press: async () => {},
};

const codexTab = {
  getAXState: async () => 'Browser tab: chrome, URL: "https://example.com/".\n1 button A',
  click: async () => {},
  scroll: async () => {},
  pressKey: async () => {},
  reload: async () => {},
};

const page = {
  url: () => 'https://example.com/',
  locator: () => ({ ariaSnapshot: async () => '- button "A"' }),
  getByRole: () => ({ nth: () => ({ click: async () => {} }) }),
  evaluate: async () => 600,
  mouse: { wheel: async () => {} },
  keyboard: { press: async () => {} },
  reload: async () => {},
};

test('adapterFor rejects an unknown kind instead of guessing', () => {
  assert.throws(() => adapterFor('nope', ompTab), /Unknown adapter kind "nope"/);
  assert.deepEqual(ADAPTER_KINDS, ['omp', 'codex', 'playwright']);
});

test('detectAdapter picks the adapter from the handles the host actually exposes', () => {
  assert.equal(detectAdapter({ tab: ompTab }).kind, 'omp');
  assert.equal(detectAdapter({ tab: codexTab }).kind, 'codex');
  assert.equal(detectAdapter({ page }).kind, 'playwright');
});

test('detectAdapter prefers the omp capability order and honours an explicit kind', () => {
  // a tab exposing both signatures is treated as omp, which is the declared order
  const hybrid = { ...ompTab, getAXState: codexTab.getAXState };
  assert.equal(detectAdapter({ tab: hybrid }).kind, 'omp');

  // an explicit kind overrides detection
  assert.equal(detectAdapter({ kind: 'codex', tab: codexTab }).kind, 'codex');
  assert.equal(detectAdapter({ kind: 'playwright', page }).kind, 'playwright');
});

test('detectAdapter fails loudly when nothing matches', () => {
  assert.throws(() => detectAdapter({}), /No supported browser adapter matched this runtime/);
  assert.throws(() => detectAdapter({ tab: {} }), /No supported browser adapter matched/);
});

test('detectAdapter surfaces an unusable handle rather than reporting a match', () => {
  // has the marker method but not the rest of the contract
  assert.throws(() => detectAdapter({ tab: { ariaSnapshot: async () => '' } }), /missing url\(\)/);
});

test('createAutoSession returns the detected kind, adapter, and a session', async () => {
  const { kind, adapter, session } = createAutoSession({
    tab: ompTab,
    allowedOrigins: ['https://example.com'],
    goal: 'g',
    controls: [{ op: 'press', key: 'Escape' }],
  });
  assert.equal(kind, 'omp');
  assert.equal(adapter.name, 'omp');
  assert.equal(typeof session.run, 'function');
  assert.equal(typeof session.metrics, 'function');

  const state = await adapter.getState();
  assert.equal(state.origin, 'https://example.com');
});
