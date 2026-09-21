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

/**
 * The 15-action compliance-review task. Uses only click, scroll, and
 * Escape — the operations this skill supports. Many controls share a
 * label prefix across sections ("Accept terms …", "Option …", "Expand
 * section …") so target selection accuracy is what the flow measures.
 *
 * Controls are named explicitly rather than left to `policy.click: true`
 * discovery. A labelled checkbox renders as BOTH `checkbox "Accept terms A1"`
 * and a sibling `text: Accept terms A1`, so discovery's one-unique-name rule
 * drops every labelled control on the page; naming the controls resolves each
 * one against the clickable roles, where the name is unique. This mirrors
 * TASK above, which is the shape the verified end-to-end run uses.
 */
export const TASK_15 = {
  goal:
    'Expand section A and check Accept terms A1 and Accept terms A2; expand section B, select Option B1, and expand section C; scroll down inside the Compliance report; check Accept terms C1; expand section D and check Accept terms D1; scroll down inside the Compliance report; expand section E, select Option E1, press Escape to dismiss the warning, then click Confirm submission. Stop when the review status reads confirmed.',
  controls: [
    { op: 'click', name: 'Expand section A' },
    { op: 'click', name: 'Accept terms A1' },
    { op: 'click', name: 'Accept terms A2' },
    { op: 'click', name: 'Expand section B' },
    { op: 'click', name: 'Option B1' },
    { op: 'click', name: 'Expand section C' },
    { op: 'click', name: 'Accept terms C1' },
    { op: 'click', name: 'Expand section D' },
    { op: 'click', name: 'Accept terms D1' },
    { op: 'click', name: 'Expand section E' },
    { op: 'click', name: 'Option E1' },
    { op: 'press', key: 'Escape' },
    { op: 'click', name: 'Confirm submission' },
  ],
  policy: {
    scrollDirections: ['down'],
    scrollAmount: 2,
    scrollTargetName: 'Compliance report',
    denyNames: [/delete/i],
    requireHostNames: [/publish/i, /send/i],
  },
};

/** Bounds applied to every end-to-end run. */
export const BOUNDS = { maxSteps: 12, maxMs: 45000, minConfidence: 0.55 };

/** Bounds for the 15-action run: more steps and a higher wall-clock budget. */
export const BOUNDS_15 = { maxSteps: 20, maxMs: 45000, minConfidence: 0.55 };

/**
 * The 15-action goal text for the A/B experiment. Both arms receive the
 * identical goal; the arm-specific prefix ("Use the browser-with-typesafe
 * skill to do exactly this:" vs "Using the eval tool with the browser
 * prelude:") is prepended by cost-experiment.sh, so the two prompts differ
 * ONLY in whether they mention the skill.
 */
export const GOAL_15 =
  "open the page, then complete the compliance review: expand section A and check Accept terms A1 and Accept terms A2; expand section B, select Option B1, and expand section C; scroll down inside the Compliance report; check Accept terms C1; expand section D and check Accept terms D1; scroll down inside the Compliance report; expand section E, select Option E1, press Escape to dismiss the warning, then click Confirm submission. Finally reply with exactly the review status text shown on the page and nothing else.";

/**
 * The state-dependent wizard goal for the A/B experiment.
 *
 * This is the flow the skill is designed for but the earlier fixtures could not
 * exercise: the next action can only be chosen from the freshly rendered step,
 * because the target word is seeded from the run id and the next step's buttons
 * do not exist until the current one is answered. Arm A must read the page and
 * decide once per step (~10 host turns); arm B should run the whole flow inside
 * one session.run() call.
 */
export const GOAL_WIZARD =
  "open the page, then complete the configuration wizard. The wizard shows one step at a time; each step's prompt names a target word and offers three buttons, and only the button labeled with that exact target word advances the wizard. Work through all 10 steps, reading each step's freshly rendered prompt before choosing its button. Finally reply with exactly the wizard status text shown on the page and nothing else.";

/** Run TASK (or the supplied task) against an adapter, returning the outcome and session metrics. */
export async function runTask(adapter, { origin, config, overrides = {}, task = TASK, bounds = BOUNDS }) {
  const session = createSession(adapter, {
    ...config,
    allowedOrigins: [origin],
    ...bounds,
    ...overrides,
  });
  const outcome = await session.run(task);
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
