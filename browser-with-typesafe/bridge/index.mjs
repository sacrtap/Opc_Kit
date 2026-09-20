/**
 * browser-with-typesafe — public entry point.
 *
 * Import this module to reach the decision engine and every adapter, or use
 * `detectAdapter()` to let the current host's capabilities choose one.
 *
 *   import { detectAdapter, createSession, loadConfig } from 'skill://browser-with-typesafe/bridge/index.mjs';
 *
 *   const { kind, adapter } = detectAdapter({ tab: myTab });
 *   const session = createSession(adapter, { ...(await loadConfig()), allowedOrigins: ['https://example.com'] });
 *   const outcome = await session.run({ goal, controls, policy });
 */

import { createCodexAdapter } from './adapters/codex.mjs';
import { createOmpAdapter } from './adapters/omp.mjs';
import { createPlaywrightAdapter } from './adapters/playwright.mjs';
import { createSession } from './core.mjs';

export * from './core.mjs';
export { parseAriaSnapshot } from './aria-snapshot.mjs';
export { createCodexAdapter } from './adapters/codex.mjs';
export { createOmpAdapter } from './adapters/omp.mjs';
export { createPlaywrightAdapter } from './adapters/playwright.mjs';

/** Adapter kinds this skill ships. */
export const ADAPTER_KINDS = ['omp', 'codex', 'playwright'];

/** Which runtime capability each adapter needs, in detection order. */
const DETECTORS = [
  {
    kind: 'omp',
    handle: 'tab',
    requires: (tab) => typeof tab?.ariaSnapshot === 'function',
    create: (handle, options) => createOmpAdapter(handle, options),
  },
  {
    kind: 'codex',
    handle: 'tab',
    requires: (tab) => typeof tab?.getAXState === 'function',
    create: (handle, options) => createCodexAdapter(handle, options),
  },
  {
    kind: 'playwright',
    handle: 'page',
    requires: (page) => typeof page?.getByRole === 'function' && typeof page?.locator === 'function',
    create: (handle, options) => createPlaywrightAdapter(handle, options),
  },
];

/**
 * Build an adapter for an explicitly known host.
 * Use this when the host already knows which runtime it is.
 */
export function adapterFor(kind, handle, options) {
  const detector = DETECTORS.find((candidate) => candidate.kind === kind);
  if (!detector) {
    throw new Error(`Unknown adapter kind "${kind}"; expected one of ${ADAPTER_KINDS.join(', ')}`);
  }
  return detector.create(handle, options);
}

/**
 * Choose an adapter from the handles the current host actually exposes.
 *
 * Pass whatever the host has — a computer-use `tab`, a Playwright `page`, or an
 * explicit `kind`. No host product is hard-coded or preferred beyond the
 * capability order below, and an unknown runtime fails loudly rather than
 * silently picking an untested backend.
 */
export function detectAdapter({ tab, page, kind, options } = {}) {
  if (kind) return { kind, adapter: adapterFor(kind, kind === 'playwright' ? page : tab, options) };

  for (const detector of DETECTORS) {
    const handle = detector.handle === 'tab' ? tab : page;
    if (detector.requires(handle)) {
      return { kind: detector.kind, adapter: detector.create(handle, options) };
    }
  }

  throw new Error(
    'No supported browser adapter matched this runtime: pass the tab handle your computer-use tool exposes, ' +
      'a Playwright page, or an explicit kind. This skill does not provide browser permissions or a driver.',
  );
}

/** Convenience: detect an adapter and open a session in one step. */
export function createAutoSession({ tab, page, kind, options, ...defaults } = {}) {
  const { kind: detected, adapter } = detectAdapter({ tab, page, kind, options });
  return { kind: detected, adapter, session: createSession(adapter, defaults) };
}
