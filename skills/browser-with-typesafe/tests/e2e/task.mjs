/**
 * Shared end-to-end task and verification for every host.
 *
 * The same page, task definition, and host-side verification are reused by the
 * omp run (primary verification) and the Playwright run, so a backend is only
 * considered equivalent when it satisfies the identical assertions.
 */

import { createSession } from '../../bridge/core.mjs';

/** The bounded mechanical task the fixture page is built for. */
export const TASK = {
  goal:
    'Expand the evaluation report, scroll down through the report, then collapse it again. Stop when the status reads collapsed.',
  controls: [
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: {
    scrollDirections: ['down'],
    scrollAmount: 2,
    scrollTargetName: 'Evaluation report',
    denyNames: [/delete/i],
    requireHostNames: [/publish/i, /send/i],
  },
};

/** Bounds applied to every end-to-end run. */
export const BOUNDS = { maxSteps: 12, maxMs: 45000, minConfidence: 0.55 };

/** Run TASK against an adapter, returning the outcome and session metrics. */
export async function runTask(adapter, { origin, config, overrides = {} }) {
  const session = createSession(adapter, {
    ...config,
    allowedOrigins: [origin],
    ...BOUNDS,
    ...overrides,
  });
  const outcome = await session.run(TASK);
  return { outcome, metrics: session.metrics() };
}

/**
 * Independent verification, performed by the host rather than by Jev:
 * read fresh page state and assert the observable result.
 *
 * `scrolls` proves the scroll action actually moved the panel, which a click-only
 * run could not.
 */
export function verify(state) {
  const live = (name, role) =>
    state.nodes.some((node) => node.name === name && (!role || node.role === role));

  // The fixture renders two `output` elements: the status word and the scroll
  // counter. Reading them by shape keeps this independent of node ordering.
  const statusNames = state.nodes.filter((node) => node.role === 'status').map((node) => node.name);
  const status = statusNames.find((name) => !/^\d+$/.test(name)) ?? null;
  const scrolls = Math.max(0, ...statusNames.filter((name) => /^\d+$/.test(name)).map(Number));

  const checks = {
    'status reads collapsed': status === 'collapsed',
    'report collapsed again': !live('Evaluation report'),
    'expand control restored': live('Expand section', 'button'),
    'collapse control hidden': !live('Collapse section', 'button'),
    'panel was actually scrolled': scrolls >= 1,
  };

  return { status, scrolls, checks, passed: Object.values(checks).every(Boolean) };
}

/** Read fresh state and verify it. */
export async function verifyFresh(adapter) {
  return verify(await adapter.getState());
}

/** True when the run stopped for host verification rather than handing back. */
export function isCleanStop(outcome) {
  return outcome.status === 'needs_verification' && outcome.handoff === null;
}
