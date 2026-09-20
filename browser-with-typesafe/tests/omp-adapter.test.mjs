import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLICK_ROLES, matchesName } from '../bridge/ir.mjs';
import { parseAriaSnapshot } from '../bridge/aria-snapshot.mjs';
import { createOmpAdapter } from '../bridge/adapters/omp.mjs';

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

const collapsed = fixture('omp-collapsed.snapshot.txt');
const expanded = fixture('omp-expanded.snapshot.txt');

test('parseAriaSnapshot reads the real omp collapsed snapshot', () => {
  const nodes = parseAriaSnapshot(collapsed);

  assert.deepEqual(
    nodes.find((node) => node.name === 'Expand section'),
    { ref: 'e7', role: 'button', name: 'Expand section' },
  );
  // `status [ref=e4]: idle` — the bare value after the colon is the name
  assert.deepEqual(
    nodes.find((node) => node.role === 'status'),
    { ref: 'e4', role: 'status', name: 'idle' },
  );
  // `text: "Status:"` — a quoted value after the colon is a name, not a container
  assert.equal(nodes.find((node) => node.name === 'Status:')?.role, 'text');
  // a container line ending in ':' yields an empty name rather than a bogus one
  assert.equal(nodes[0].ref, 'e1');
  assert.equal(nodes[0].name, '');
  // the collapsed page hides the report entirely
  assert.ok(!nodes.some((node) => node.name === 'Evaluation report'));
});

test('parseAriaSnapshot reads the real omp expanded snapshot', () => {
  const nodes = parseAriaSnapshot(expanded);

  const report = nodes.filter((node) => node.name === 'Evaluation report');
  assert.deepEqual(
    report.map((node) => node.role).sort(),
    ['heading', 'region'],
    'the region and its heading share a label',
  );

  const items = nodes.filter((node) => /^Evaluation item \d+$/.test(node.name));
  assert.equal(items.length, 60);
  assert.equal(items[0].role, 'listitem');

  const collapse = nodes.find((node) => node.name === 'Collapse section');
  assert.ok(collapse && collapse.ref);
  assert.ok(CLICK_ROLES.has(collapse.role));

  // every printable entry that is a real control carries an executable ref
  const anonymousRefs = nodes.filter((node) => node.ref && node.name === '' && node.role === 'generic');
  assert.ok(anonymousRefs.length >= 1, 'anonymous containers are still addressable by ref');
});

test('parseAriaSnapshot ignores non-list-item lines and survives empty input', () => {
  assert.deepEqual(parseAriaSnapshot(''), []);
  assert.deepEqual(parseAriaSnapshot('  plain text\nnot a snapshot\n'), []);
  const mixed = parseAriaSnapshot('- button "A" [ref=x1]\nrandom noise\n- link "B" [ref=x2]');
  assert.deepEqual(mixed, [
    { ref: 'x1', role: 'button', name: 'A' },
    { ref: 'x2', role: 'link', name: 'B' },
  ]);
});

test('parseAriaSnapshot preserves quoted names containing colons and commas', () => {
  const nodes = parseAriaSnapshot('- button "Save, Value: 3" [ref=e1]\n- text: "a: b"');
  assert.deepEqual(nodes[0], { ref: 'e1', role: 'button', name: 'Save, Value: 3' });
  assert.equal(nodes[1].name, 'a: b');
  // the value-suffix rule still applies to the parsed name
  assert.ok(matchesName(nodes[0].name, 'Save'));
});

test('createOmpAdapter rejects a handle that cannot satisfy the contract', () => {
  assert.throws(() => createOmpAdapter(null), /requires a tab handle/);
  assert.throws(() => createOmpAdapter({ url: () => {}, ref: () => {} }), /missing ariaSnapshot\(\)/);
});

test('createOmpAdapter converts snapshots to IR and drives actions through the tab', async () => {
  const toggles = [];
  const clicks = [];
  const evaluations = [];
  const tab = {
    async url() {
      return 'https://example.com/app';
    },
    async ariaSnapshot() {
      return toggles.length === 0 ? collapsed : expanded;
    },
    async ref(ref) {
      return {
        async click() {
          clicks.push(ref);
        },
        async evaluate(expression) {
          evaluations.push({ ref, expression });
        },
      };
    },
    async scroll(dx, dy) {
      evaluations.push({ ref: null, expression: `page ${dx},${dy}` });
    },
    async evaluate() {
      return 800;
    },
    async goto(url) {
      evaluations.push({ ref: null, expression: `goto ${url}` });
    },
    async press(key) {
      evaluations.push({ ref: null, expression: `press ${key}` });
    },
  };

  const adapter = createOmpAdapter(tab);
  assert.equal(adapter.name, 'omp');

  const state = await adapter.getState();
  assert.equal(state.origin, 'https://example.com');
  assert.ok(state.nodes.some((node) => node.name === 'Expand section'));

  await adapter.click('e7');
  assert.deepEqual(clicks, ['e7']);

  await adapter.scroll({ direction: 'down', amount: 2, target: 'e7' });
  assert.equal(evaluations.at(-1).expression, 'el => el.scrollBy(0, el.clientHeight * 2)');

  await adapter.scroll({ direction: 'up' });
  assert.equal(evaluations.at(-1).expression, 'page 0,-800');

  await adapter.pressKey('Escape');
  assert.equal(evaluations.at(-1).expression, 'press Escape');

  await adapter.reload();
  assert.equal(evaluations.at(-1).expression, 'goto https://example.com/app');
});

test('createOmpAdapter prefers a native reload() when the tab provides one', async () => {
  const calls = [];
  const adapter = createOmpAdapter({
    async url() {
      return 'https://example.com/app';
    },
    async ariaSnapshot() {
      return collapsed;
    },
    async ref() {
      throw new Error('unused');
    },
    async scroll() {},
    async press() {},
    async reload() {
      calls.push('reload');
    },
    async goto() {
      calls.push('goto');
    },
  });
  await adapter.reload();
  assert.deepEqual(calls, ['reload']);
});

test('createOmpAdapter reload falls back to goto when the tab exposes no reload', async () => {
  const visited = [];
  const adapter = createOmpAdapter({
    async url() {
      return 'https://example.com/app';
    },
    async ariaSnapshot() {
      return collapsed;
    },
    async ref() {
      throw new Error('unused');
    },
    async scroll() {},
    async press() {},
    async goto(url) {
      visited.push(url);
    },
  });
  await adapter.reload();
  assert.deepEqual(visited, ['https://example.com/app']);
});
