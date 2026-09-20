import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const BRIDGE = fileURLToPath(new URL('../bridge', import.meta.url));

const read = (...parts) => readFileSync(join(BRIDGE, ...parts), 'utf8');

/**
 * The adapter layer is the only place allowed to know about a host. If the engine
 * or the IR ever gains a host API reference, the "one engine, N hosts" property —
 * and with it every claim in the docs — silently stops being true.
 */
test('the core and the IR reference no host browser API', () => {
  // `tab.` / `page.` mean host-API member access (`tab.click(...)`), not the word
  // "page" followed by a full stop in model-facing prose. Require an identifier.
  const forbidden = /cua_repl|getAXState|ariaSnapshot|mcp__|tab\.\w|page\.\w|browser\.open/;

  for (const file of ['core.mjs', 'ir.mjs', 'aria-snapshot.mjs']) {
    const source = read(file);
    assert.ok(!forbidden.test(source), `${file} must not reference a host browser API`);
  }
});

test('the core depends on nothing outside the standard library and the IR', () => {
  const imports = [...read('core.mjs').matchAll(/^import\s[^;]+from\s+'([^']+)';/gm)].map(
    (match) => match[1],
  );

  assert.ok(imports.length > 0, 'expected the core to import something');
  for (const specifier of imports) {
    const allowed = specifier.startsWith('node:') || specifier.startsWith('./');
    assert.ok(allowed, `core.mjs must not import "${specifier}"`);
  }
});

test('adapters are the only modules that touch a host contract', () => {
  const adapters = readdirSync(join(BRIDGE, 'adapters')).filter((name) => name.endsWith('.mjs'));
  assert.deepEqual(adapters.sort(), ['codex.mjs', 'omp.mjs', 'playwright.mjs']);

  // each adapter must expose exactly one factory, named after its host
  for (const file of adapters) {
    const source = read('adapters', file);
    assert.match(source, /export function create\w+Adapter\(/, `${file} must export a factory`);
  }
});
