/**
 * omp end-to-end verification (primary verification surface).
 *
 * Drives a real omp browser tab through the shared decision engine and the omp
 * adapter, then leaves independent verification to the caller.
 *
 * This module is executed from omp's Eval runtime, where the `browser` prelude
 * and the tab handle exist. Running it with plain `node` is not supported: the
 * `browser` global is host-provided.
 *
 *   const tab = await browser.open({ name: 'bwt-e2e', url });
 *   const { outcome, metrics, adapter } = await runOmpE2E(tab, { origin });
 *   await verifyFresh(adapter);
 */

import { createOmpAdapter } from '../../bridge/adapters/omp.mjs';
import { loadConfig } from '../../bridge/core.mjs';
import { TASK, isCleanStop, runTask, verify, verifyFresh } from './task.mjs';

export { TASK, isCleanStop, verify, verifyFresh };

/** Run the shared end-to-end task against an already-open omp tab. */
export async function runOmpE2E(tab, { origin, overrides = {} } = {}) {
  const config = await loadConfig();
  const adapter = createOmpAdapter(tab);
  const { outcome, metrics } = await runTask(adapter, { origin, config, overrides });
  return { outcome, metrics, adapter };
}
