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
    async type(ref, text) {
      calls.push({ op: 'type', ref, text });
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
 * Build a schema-valid `choice` answer for one question: the strict validator
 * in `decide()` requires type/choice/confidence plus probabilities over exactly
 * the criteria keys that sum to ~1 with the choice as argmax.
 */
export function choiceAnswer(choice, keys) {
  const rest = keys.length > 1 ? 0.05 / (keys.length - 1) : 0;
  return {
    type: 'choice',
    choice,
    confidence: 0.9,
    probabilities: Object.fromEntries(
      keys.map((key) => [key, key === choice ? (keys.length > 1 ? 0.95 : 1) : rest]),
    ),
  };
}

/**
 * Replace global fetch with a scripted decision endpoint.
 *
 * `pick` receives `{ criteria, body, seen }` and returns the choice id.
 * `criteria` is the flat union of every target head plus DONE/BLOCKED/WAIT,
 * with ids being the GLOBAL action indices — the same shape the old single
 * `next` question used — so a pick of `'a0'`/`'DONE'` works unchanged. A pick
 * of an operation kind (`'click'`) is also accepted. The returned response is
 * always schema-valid, so tests exercise the loop rather than the validator.
 */
export function stubDecide(pick) {
  const original = globalThis.fetch;
  const seen = [];

  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const questions = body.questions;
    const operationCriteria = questions.operation.criteria;
    const heads = new Map();
    for (const [id, question] of Object.entries(questions)) {
      if (id.endsWith('_target')) heads.set(id.slice(0, -'_target'.length), question.criteria);
    }
    const criteria = { ...operationCriteria };
    for (const headCriteria of heads.values()) Object.assign(criteria, headCriteria);
    const entry = { url, body, criteria };
    seen.push(entry);

    const choice = typeof pick === 'function' ? await pick({ ...entry, seen }) : pick;

    let operation;
    let headChoice;
    if (Object.hasOwn(operationCriteria, choice)) {
      operation = choice;
      // an operation kind with candidates still needs its head answered
      if (heads.has(operation)) headChoice = Object.keys(heads.get(operation))[0];
    } else if (/^a\d+$/.test(choice)) {
      operation = [...heads.keys()].find((op) => Object.hasOwn(heads.get(op), choice));
      if (operation === undefined) throw new Error(`stubDecide: unknown choice ${choice}`);
      headChoice = choice;
    } else {
      throw new Error(`stubDecide: unknown choice ${choice}`);
    }

    const answers = { operation: choiceAnswer(operation, Object.keys(operationCriteria)) };
    if (headChoice !== undefined) {
      answers[`${operation}_target`] = choiceAnswer(headChoice, Object.keys(heads.get(operation)));
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers,
          usage: { input_tokens: 300, output_tokens: 20 },
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
