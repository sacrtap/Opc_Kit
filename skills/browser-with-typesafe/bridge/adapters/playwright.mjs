/**
 * Playwright / CDP adapter.
 *
 * Covers hosts that drive a real browser through Playwright or CDP — Cursor,
 * Claude Code, Workbuddy, Zcode, and any MCP browser server exposing a
 * Playwright `page`.
 *
 * Element identity: ARIA snapshots carry no handles, so this adapter addresses
 * nodes by an ordinal ref (`n<i>`) and re-resolves them with
 * `getByRole(role, { name, exact: true }).nth(nth)` at action time. Roles are
 * canonicalized by the IR, so two nodes that share a role and name stay
 * distinguishable through the occurrence index.
 *
 * The adapter never opens a browser and never navigates. Text entry happens
 * only through `type(ref, text)`, driven by a decided `fill` action whose
 * value came from the fill helper — never ad hoc.
 */

import { parseAriaSnapshot } from '../aria-snapshot.mjs';
import { createIR } from '../ir.mjs';

/** Canonical roles whose Playwright spelling differs. */
const ROLE_FALLBACKS = { textarea: 'textbox' };

/** Wrap a Playwright `page` in the shared adapter contract. */
export function createPlaywrightAdapter(page, { timeoutMs = 15000 } = {}) {
  if (!page || typeof page.locator !== 'function' || typeof page.getByRole !== 'function') {
    throw new Error('createPlaywrightAdapter requires a Playwright page');
  }

  let refs = new Map();

  function locatorFor(ref) {
    const descriptor = refs.get(ref);
    if (!descriptor) throw new Error(`Unknown or stale ref: ${ref}`);
    const role = ROLE_FALLBACKS[descriptor.role] ?? descriptor.role;
    const base = descriptor.name
      ? page.getByRole(role, { name: descriptor.name, exact: true })
      : page.getByRole(role);
    return base.nth(descriptor.nth);
  }

  return {
    name: 'playwright',

    async getState() {
      const url = page.url();
      const snapshot = await page.locator('body').ariaSnapshot({ timeout: timeoutMs });

      refs = new Map();
      const occurrences = new Map();
      const nodes = parseAriaSnapshot(snapshot).map((node, index) => {
        const ref = `n${index}`;
        const key = `${node.role}\u0000${node.name}`;
        const nth = occurrences.get(key) ?? 0;
        occurrences.set(key, nth + 1);
        refs.set(ref, { role: node.role, name: node.name, nth });
        return { ref, role: node.role, name: node.name };
      });

      return createIR({ url, nodes });
    },

    async click(ref) {
      await locatorFor(ref).click({ timeout: timeoutMs });
    },

    async type(ref, text) {
      await locatorFor(ref).fill(text, { timeout: timeoutMs });
    },

    async scroll({ direction, amount = 1, target }) {
      const pages = (direction === 'up' ? -1 : 1) * amount;

      // A named container scrolls itself; the page scrolls otherwise.
      if (typeof target === 'string' && target) {
        await locatorFor(target).evaluate((element, by) => element.scrollBy(0, element.clientHeight * by), pages);
        return;
      }

      const viewport = Number(await page.evaluate(() => window.innerHeight)) || 600;
      await page.mouse.wheel(0, pages * viewport);
    },

    async pressKey(key) {
      await page.keyboard.press(key);
    },

    async reload() {
      await page.reload({ timeout: timeoutMs });
    },
  };
}
