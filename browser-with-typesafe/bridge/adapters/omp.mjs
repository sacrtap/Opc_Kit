/**
 * omp adapter — drives omp's Eval `browser` prelude.
 *
 * omp exposes `browser.open()` (an Eval global) plus tab helpers such as
 * `ariaSnapshot()`, `ref()`, `scroll()`, `press()`, and `goto()`. This adapter
 * converts omp's ARIA snapshot into the shared IR and executes mechanical
 * actions through the same tab handle the host already opened.
 *
 * This adapter never opens or closes a browser and never enters text: the host
 * owns the session and all text input.
 */

import { parseAriaSnapshot } from '../aria-snapshot.mjs';
import { createIR } from '../ir.mjs';

const REQUIRED_TAB_METHODS = ['url', 'ariaSnapshot', 'ref', 'scroll', 'press'];

/**
 * Wrap an omp tab handle in the shared adapter contract.
 * Rejects a handle that cannot satisfy the contract instead of failing later
 * mid-run.
 */
export function createOmpAdapter(tab) {
  if (!tab || typeof tab !== 'object') throw new Error('createOmpAdapter requires a tab handle');
  for (const method of REQUIRED_TAB_METHODS) {
    if (typeof tab[method] !== 'function') {
      throw new Error(`omp tab is missing ${method}()`);
    }
  }

  return {
    name: 'omp',

    async getState() {
      const url = await tab.url();
      const snapshot = await tab.ariaSnapshot();
      return createIR({ url, nodes: parseAriaSnapshot(snapshot) });
    },

    async click(ref) {
      if (ref === null || ref === undefined) throw new Error('click requires a ref');
      await (await tab.ref(ref)).click();
    },

    async scroll({ direction, amount = 1, target }) {
      const sign = direction === 'up' ? -1 : 1;
      const pages = sign * amount;

      // A named container scrolls itself; the page scrolls otherwise.
      if (typeof target === 'string' && target) {
        const element = await tab.ref(target);
        await element.evaluate(`el => el.scrollBy(0, el.clientHeight * ${pages})`);
        return;
      }

      const viewport = Number(await tab.evaluate(() => window.innerHeight)) || 600;
      await tab.scroll(0, pages * viewport);
    },

    async pressKey(key) {
      await tab.press(key);
    },

    async reload() {
      if (typeof tab.reload === 'function') return tab.reload();
      if (typeof tab.goto !== 'function') {
        throw new Error('omp tab cannot reload: it exposes neither reload() nor goto()');
      }
      await tab.goto(await tab.url());
    },
  };
}
