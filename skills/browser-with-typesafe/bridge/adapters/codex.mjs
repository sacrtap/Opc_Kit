/**
 * Codex adapter — drives the Codex Computer Use (`cua_repl`) tab contract.
 *
 * This is the regression-parity adapter: it wraps exactly the tab API the
 * reference `jev-browser-use` bridge used, so a Codex host reaches the same
 * decision engine as every other host.
 *
 * Tab contract consumed here:
 *   tab.getAXState({ emit:false, disableDiffing:true }) -> textual AX state
 *   tab.click(index) / tab.scroll(target, direction, amount) / tab.pressKey(key)
 *   tab.reload()
 *   tab.type(index, text) or tab.insert(index, text) for `fill` (contract-only)
 *
 * Nodes are addressed by their own numeric index, which is what that contract
 * accepts, so `ref` is the index rendered as a string.
 *
 * This adapter never opens a browser.
 */

import { createIR } from '../ir.mjs';

/** Multi-word roles this host emits; ordered longest-first at match time. */
const MULTIWORD_ROLES = ['text field', 'text area', 'combo box', 'radio button', 'menu item'];

const TAB_URL = /^Browser tab:.* URL: "([^"]+)"\./m;

/** Read the tab URL out of a Codex AX state. Fails closed when absent. */
export function parseCodexUrl(state) {
  const url = String(state ?? '').match(TAB_URL)?.[1];
  if (!url) throw new Error('Cannot verify browser origin');
  return url;
}

/**
 * Parse one `getAXState` line: `<index> <role> [(attrs)] [Description: ]<name>`.
 * Returns null for the header and any line that is not a node.
 */
export function parseCodexLine(line) {
  const match = String(line).match(/^(\d+)\s+(.+)$/);
  if (!match) return null;

  const ref = match[1];
  let rest = match[2].trim();

  let role = MULTIWORD_ROLES.find(
    (candidate) =>
      rest.toLowerCase() === candidate || rest.toLowerCase().startsWith(`${candidate} `),
  );
  if (role) {
    rest = rest.slice(role.length).trim();
  } else {
    const first = rest.match(/^[^\s(]+/);
    if (!first) return null;
    role = first[0];
    rest = rest.slice(role.length).trim();
  }

  if (rest.startsWith('(')) {
    const close = rest.indexOf(')');
    if (close !== -1) rest = rest.slice(close + 1).trim();
  }

  return { ref, role, name: rest.replace(/^Description:\s*/, '').trim() };
}

/** Parse a whole Codex AX state into IR nodes. */
export function parseCodexState(state) {
  const nodes = [];
  for (const line of String(state ?? '').split(/\r?\n/)) {
    const node = parseCodexLine(line.trim());
    if (node) nodes.push(node);
  }
  return nodes;
}

const REQUIRED_TAB_METHODS = ['getAXState', 'click', 'scroll', 'pressKey', 'reload'];

/** Wrap a Codex CUA tab handle in the shared adapter contract. */
export function createCodexAdapter(tab) {
  if (!tab || typeof tab !== 'object') throw new Error('createCodexAdapter requires a tab handle');
  for (const method of REQUIRED_TAB_METHODS) {
    if (typeof tab[method] !== 'function') {
      throw new Error(`Codex tab is missing ${method}()`);
    }
  }

  const readState = () => tab.getAXState({ emit: false, disableDiffing: true });

  return {
    name: 'codex',

    async getState() {
      const snapshot = await readState();
      return createIR({ url: parseCodexUrl(snapshot), nodes: parseCodexState(snapshot) });
    },

    async click(ref) {
      const index = Number(ref);
      if (!Number.isInteger(index)) throw new Error(`Codex click requires a numeric ref, got ${ref}`);
      await tab.click(index);
    },

    async type(ref, text) {
      // Contract-only stub: the Computer Use tab contract has no fixed
      // typing method name, so this dispatches to `type` or `insert` and fails
      // loudly when the runtime exposes neither. Exercised by contract tests
      // only — no Codex runtime is available here.
      const index = Number(ref);
      if (!Number.isInteger(index)) throw new Error(`Codex type requires a numeric ref, got ${ref}`);
      const writer = tab.type ?? tab.insert;
      if (typeof writer !== 'function') {
        throw new Error('Codex tab cannot type: it exposes neither type() nor insert()');
      }
      await writer.call(tab, index, text);
    },

    async scroll({ direction, amount = 1, target }) {
      // An explicit target (a named container or a host-supplied point) is passed
      // straight through; otherwise scroll by paging the viewport, as the
      // reference implementation did.
      if (target !== undefined && target !== null) {
        await tab.scroll(typeof target === 'string' ? Number(target) : target, direction, amount);
        return;
      }
      const key = direction === 'down' ? 'PageDown' : 'PageUp';
      for (let i = 0; i < amount; i += 1) await tab.pressKey(key);
    },

    async pressKey(key) {
      await tab.pressKey(key);
    },

    async reload() {
      await tab.reload();
    },
  };
}
