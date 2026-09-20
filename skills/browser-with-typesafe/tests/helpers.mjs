/**
 * Shared test helpers: IR builders, scripted adapters, and a stubbed decision
 * endpoint so the whole `run()` loop can be exercised without network access.
 */

import { createIR } from '../bridge/ir.mjs';

/** Build a validated IR snapshot from terse node tuples. */
export function ir(url, nodes) {
  return createIR({ url, nodes });
}

/**
 * Adapter whose `getState()` consumes `states` in order (last value repeats) and
 * whose actions are recorded. This makes the exact read/act sequence explicit,
 * which is what the staleness and no-progress invariants depend on.
 */
export function makeAdapter(states) {
  let reads = 0;
  const calls = [];
  return {
    name: 'fake',
    calls,
    get reads() {
      return reads;
    },
    async getState() {
      const state = states[Math.min(reads, states.length - 1)];
      reads += 1;
      return state;
    },
    async click(ref) {
      calls.push({ op: 'click', ref });
    },
    async scroll(args) {
      calls.push({ op: 'scroll', ...args });
    },
    async pressKey(key) {
      calls.push({ op: 'press', key });
    },
    async reload() {
      calls.push({ op: 'reload' });
    },
  };
}

/**
 * Replace global fetch with a scripted decision endpoint.
 *
 * `pick` receives `{ criteria, body, seen }` and returns the choice id. The
 * returned response is always schema-valid, so tests exercise the loop rather
 * than the validator.
 */
export function stubDecide(pick) {
  const original = globalThis.fetch;
  const seen = [];

  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const criteria = body.questions.next.criteria;
    const entry = { url, body, criteria };
    seen.push(entry);

    const choice = typeof pick === 'function' ? await pick({ ...entry, seen }) : pick;
    const keys = Object.keys(criteria);
    if (!keys.includes(choice)) throw new Error(`stubDecide: unknown choice ${choice}`);

    const rest = keys.length > 1 ? 0.05 / (keys.length - 1) : 0;
    const probabilities = Object.fromEntries(
      keys.map((key) => [key, key === choice ? (keys.length > 1 ? 0.95 : 1) : rest]),
    );

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: { next: { type: 'choice', choice, confidence: 0.9, probabilities } },
        };
      },
    };
  };

  const restore = () => {
    globalThis.fetch = original;
  };
  restore.seen = seen;
  return restore;
}

/** Replace global fetch with an always-failing decision endpoint. */
export function stubDecideFailure(message = 'transport failure or timeout') {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error(message);
  };
  return () => {
    globalThis.fetch = original;
  };
}
