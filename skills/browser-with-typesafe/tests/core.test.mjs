import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  HISTORY_LIMIT,
  availableActions,
  checkState,
  createSession,
  decide,
  discoverActions,
  loadConfig,
  projectHistory,
  providerGuide,
  resolveProviderConfig,
  run,
  summarizeLatencies,
  validateControl,
  waitForState,
} from '../bridge/core.mjs';
import { ir, makeAdapter, stubDecide } from './helpers.mjs';

const CONFIG_FILE = fileURLToPath(new URL('./fixtures/config.json', import.meta.url));
const BASE = { configPath: CONFIG_FILE, provider: 'typesafe', allowedOrigins: ['https://example.com'] };

const settingsPage = (ref) =>
  ir('https://example.com/settings', [
    { ref, role: 'button', name: 'Enable alerts' },
    { ref: `${ref}-dup`, role: 'button', name: 'Save' },
  ]);

test('loadConfig returns the settings and never the key', async () => {
  const config = await loadConfig(CONFIG_FILE);
  assert.deepEqual(config, {
    provider: 'typesafe',
    model: 'jev-latest',
    configPath: CONFIG_FILE,
    hasApiKey: true,
  });
  // the secret must not be reachable through the object that gets spread into a session
  assert.ok(!JSON.stringify(config).includes('test-key-not-a-real-credential'));
  assert.ok(!Object.values(config).some((value) => typeof value === 'string' && value.includes('test-key')));
});

test('loadConfig fails with an actionable message instead of a raw filesystem error', async () => {
  await assert.rejects(
    () => loadConfig('/nope/missing-config.json'),
    (error) => {
      assert.match(error.message, /No configuration at \/nope\/missing-config\.json/);
      assert.match(error.message, /node install\.mjs/);
      assert.match(error.message, /references\/configuration\.md/);
      return true;
    },
  );
});

test('loadConfig rejects an unknown provider immediately, naming the file', async () => {
  const bad = fileURLToPath(new URL('./fixtures/config-invalid.json', import.meta.url));
  await assert.rejects(
    () => loadConfig(bad),
    /Unsupported provider "typesafe-ai"; expected one of typesafe, openrouter.*config-invalid\.json/,
  );
});

test('resolveProviderConfig is the single definition of a valid configuration', () => {
  assert.deepEqual(resolveProviderConfig('typesafe').model, 'jev-latest');
  assert.deepEqual(resolveProviderConfig('openrouter').model, '~typesafe/jev-latest');
  assert.equal(resolveProviderConfig('openrouter', 'jev-1.13.0').endpoint, 'https://openrouter.ai/api/alpha/decisions');
  assert.throws(() => resolveProviderConfig('nope'), /Unsupported provider "nope"/);
  assert.throws(
    () => resolveProviderConfig('typesafe', 'gpt-4'),
    /Invalid model "gpt-4" for provider typesafe; expected e.g. jev-latest/,
  );
});

test('providerGuide exposes where each provider key comes from', () => {
  const guide = providerGuide();
  assert.deepEqual(
    guide.map((entry) => entry.id),
    ['typesafe', 'openrouter'],
  );
  for (const entry of guide) {
    assert.match(entry.keysUrl, /^https:\/\//);
    assert.ok(entry.label);
    assert.ok(entry.model);
  }
  assert.equal(guide.find((entry) => entry.id === 'typesafe').keysUrl, 'https://console.typesafe.ai/keys');
});

test('validateControl accepts the mechanical vocabulary and rejects everything else', () => {
  assert.ok(validateControl({ op: 'click', name: 'Save' }));
  assert.ok(!validateControl({ op: 'click' }));
  assert.ok(validateControl({ op: 'scroll', direction: 'down' }));
  assert.ok(validateControl({ op: 'scroll', direction: 'down', amount: 5 }));
  assert.ok(!validateControl({ op: 'scroll', direction: 'down', amount: 6 }));
  assert.ok(!validateControl({ op: 'scroll', direction: 'left' }));
  assert.ok(!validateControl({ op: 'scroll', direction: 'down', targetName: 'x', point: [1, 2] }));
  assert.ok(validateControl({ op: 'press', key: 'Escape' }));
  assert.ok(!validateControl({ op: 'press', key: 'cmd+q' }));
  assert.ok(!validateControl({ op: 'type', text: 'hello' }));
  assert.ok(validateControl({ op: 'reload' }));
  assert.ok(!validateControl({ op: 'drag' }));
});

test('availableActions binds a unique named control and refuses to guess', () => {
  const state = ir('https://example.com/settings', [
    { ref: 'e1', role: 'button', name: 'Enable alerts' },
    { ref: 'e2', role: 'button', name: 'Save' },
    { ref: 'e3', role: 'button', name: 'Save' },
    { ref: 'e4', role: 'heading', name: 'Save' },
  ]);
  const actions = availableActions(state, [
    { op: 'click', name: 'Enable alerts' },
    { op: 'click', name: 'Save' }, // ambiguous: two buttons
    { op: 'click', name: 'Missing' }, // absent
    { op: 'click', name: 'Save', aliases: ['Save'] }, // still ambiguous
    { op: 'press', key: 'Escape' },
    { op: 'reload' },
  ]);
  assert.equal(actions.length, 3);
  assert.equal(actions[0].ref, 'e1');
  assert.equal(actions[0].description, 'Click Enable alerts');
  assert.equal(actions[1].op, 'press');
  assert.equal(actions[2].op, 'reload');
});

test('availableActions resolves a scroll target by name and rejects an ambiguous one', () => {
  const state = ir('https://example.com/', [
    { ref: 'e1', role: 'region', name: 'Evaluation report' },
    { ref: 'e2', role: 'region', name: 'Report' },
    { ref: 'e3', role: 'region', name: 'Report' },
  ]);
  const [bound] = availableActions(state, [
    { op: 'scroll', direction: 'down', amount: 2, targetName: 'Evaluation report' },
  ]);
  assert.equal(bound.target, 'e1');
  assert.equal(bound.description, 'Scroll down 2 pages within Evaluation report');

  assert.deepEqual(
    availableActions(state, [{ op: 'scroll', direction: 'down', targetName: 'Report' }]),
    [],
  );
});

test('availableActions throws on a control outside the permitted vocabulary', () => {
  assert.throws(() => availableActions(settingsPage('e1'), [{ op: 'type', text: 'x' }]), /Unsupported action/);
});

test('discoverActions opts in to unique low-risk controls only', () => {
  const state = ir('https://example.com/', [
    { ref: 'e1', role: 'button', name: 'Filters' },
    { ref: 'e2', role: 'button', name: 'Rows' },
    { ref: 'e3', role: 'button', name: 'Rows' },
    { ref: 'e4', role: 'button', name: 'Delete account' },
    { ref: 'e5', role: 'button', name: 'Publish' },
    { ref: 'e6', role: 'textbox', name: 'Query' },
    { ref: null, role: 'button', name: 'Unreferenced' },
  ]);
  const actions = discoverActions(state, {
    click: true,
    scrollDirections: ['down'],
    scrollAmount: 2,
    keys: ['Escape', 'cmd+q'],
    reload: true,
    denyNames: [/delete/i],
    requireHostNames: [/publish/i],
  });

  const clicks = actions.filter((action) => action.op === 'click').map((action) => action.name);
  assert.deepEqual(clicks, ['Filters'], 'duplicates, denied, reserved, text, and ref-less nodes are excluded');
  assert.deepEqual(
    actions.filter((action) => action.op === 'scroll').map((action) => action.description),
    ['Scroll down 2 pages'],
  );
  assert.deepEqual(
    actions.filter((action) => action.op === 'press').map((action) => action.key),
    ['Escape'],
  );
  assert.equal(actions.filter((action) => action.op === 'reload').length, 1);
});

test('discoverActions never produces text entry and honours an allowlist', () => {
  const state = ir('https://example.com/', [
    { ref: 'e1', role: 'button', name: 'Next' },
    { ref: 'e2', role: 'button', name: 'Back' },
  ]);
  const actions = discoverActions(state, { click: true, allowNames: [/^Next$/] });
  assert.deepEqual(actions.map((action) => action.name), ['Next']);
  assert.ok(!actions.some((action) => ['type', 'fill'].includes(action.op)));
});

test('checkState blocks a foreign origin and an oversized snapshot', () => {
  assert.throws(
    () => checkState(ir('https://evil.example/', []), ['https://example.com']),
    /Browser left authorized origins/,
  );
  const huge = ir(
    'https://example.com/',
    Array.from({ length: 900 }, (_, index) => ({
      ref: `e${index}`,
      role: 'text',
      name: 'x'.repeat(40),
    })),
  );
  assert.throws(() => checkState(huge, ['https://example.com']), /Snapshot too large/);
});

test('run executes a decided action and never reports success on DONE', async () => {
  const restore = stubDecide(({ seen }) => (seen.length === 1 ? 'a0' : 'DONE'));
  try {
    const adapter = makeAdapter([
      settingsPage('e1'),
      settingsPage('e1'),
      ir('https://example.com/settings', [{ ref: 'e2', role: 'text', name: 'Alerts enabled' }]),
      ir('https://example.com/settings', [{ ref: 'e2', role: 'text', name: 'Alerts enabled' }]),
    ]);
    const outcome = await run(adapter, {
      ...BASE,
      goal: 'Enable alerts and stop.',
      controls: [{ op: 'click', name: 'Enable alerts' }],
    });

    assert.equal(outcome.status, 'needs_verification');
    assert.equal(outcome.handoff, null);
    assert.deepEqual(adapter.calls, [{ op: 'click', ref: 'e1' }]);
    assert.equal(outcome.history.filter((item) => item.executed).length, 1);
    assert.match(outcome.stateText, /Alerts enabled/);
  } finally {
    restore();
  }
});

test('run discards a decision taken on stale state instead of executing it', async () => {
  const restore = stubDecide(({ seen }) => (seen.length === 1 ? 'a0' : 'DONE'));
  try {
    const adapter = makeAdapter([
      settingsPage('e1'),
      ir('https://example.com/settings', [{ ref: 'e9', role: 'text', name: 'Page moved under us' }]),
      ir('https://example.com/settings', [{ ref: 'e9', role: 'text', name: 'Page moved under us' }]),
    ]);
    const outcome = await run(adapter, {
      ...BASE,
      goal: 'Enable alerts.',
      controls: [{ op: 'click', name: 'Enable alerts' }],
    });

    assert.equal(outcome.history[0].reason, 'stale_state');
    assert.equal(outcome.history[0].executed, false);
    assert.deepEqual(adapter.calls, [], 'no action may run against stale state');
    assert.equal(outcome.status, 'needs_verification');
  } finally {
    restore();
  }
});

test('run hands back on low confidence, blocked, and a step limit', async () => {
  {
    const restore = stubDecide('a0');
    try {
      const adapter = makeAdapter([settingsPage('e1')]);
      const outcome = await run(adapter, {
        ...BASE,
        goal: 'Enable alerts.',
        controls: [{ op: 'click', name: 'Enable alerts' }],
        minConfidence: 0.95,
      });
      assert.equal(outcome.status, 'low_confidence');
      assert.equal(outcome.handoff, 'low_confidence');
      assert.deepEqual(adapter.calls, []);
    } finally {
      restore();
    }
  }
  {
    const restore = stubDecide('BLOCKED');
    try {
      const outcome = await run(makeAdapter([settingsPage('e1')]), {
        ...BASE,
        goal: 'Enable alerts.',
        controls: [{ op: 'click', name: 'Enable alerts' }],
      });
      assert.equal(outcome.status, 'blocked');
      assert.equal(outcome.handoff, 'host_blocked');
    } finally {
      restore();
    }
  }
  {
    const restore = stubDecide('a0');
    try {
      const outcome = await run(makeAdapter([settingsPage('e1')]), {
        ...BASE,
        goal: 'Enable alerts.',
        controls: [{ op: 'click', name: 'Enable alerts' }],
        maxSteps: 1,
      });
      assert.equal(outcome.status, 'step_limit');
      assert.equal(outcome.handoff, 'step_limit');
    } finally {
      restore();
    }
  }
});

test('run surfaces an adapter failure as action_error and keeps completed history', async () => {
  const restore = stubDecide('a0');
  try {
    const adapter = makeAdapter([settingsPage('e1'), settingsPage('e1'), settingsPage('e1')]);
    adapter.click = async () => {
      throw new Error('ref expired');
    };
    const outcome = await run(adapter, {
      ...BASE,
      goal: 'Enable alerts.',
      controls: [{ op: 'click', name: 'Enable alerts' }],
    });
    assert.equal(outcome.status, 'action_error');
    assert.equal(outcome.handoff, 'action_error');
    assert.equal(outcome.error, 'ref expired');
    assert.equal(outcome.history.at(-1).reason, 'action_error');
  } finally {
    restore();
  }
});

test('run reports decision_error when the provider is unreachable and never silently passes', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  try {
    const outcome = await run(makeAdapter([settingsPage('e1')]), {
      ...BASE,
      goal: 'Enable alerts.',
      controls: [{ op: 'click', name: 'Enable alerts' }],
      maxDecisionRetries: 0,
    });
    assert.equal(outcome.status, 'decision_error');
    assert.match(outcome.error, /transport failure or timeout/);
  } finally {
    globalThis.fetch = original;
  }
});

test('run rejects a task contract that could bypass a safety bound', async () => {
  const adapter = makeAdapter([settingsPage('e1')]);
  await assert.rejects(() => run(adapter, { ...BASE, goal: '' }), /Invalid task contract/);
  await assert.rejects(
    () => run(adapter, { ...BASE, goal: 'g', controls: [{ op: 'click', name: 'x' }], minConfidence: 0.1 }),
    /Invalid task contract/,
  );
  await assert.rejects(
    () => run(adapter, { ...BASE, goal: 'g', controls: [{ op: 'click', name: 'x' }], maxMs: 999999 }),
    /Invalid task contract/,
  );
  await assert.rejects(
    () => run(adapter, { ...BASE, goal: 'g', controls: [{ op: 'click', name: 'x' }], allowedOrigins: [] }),
    /Invalid task contract/,
  );
  await assert.rejects(
    () => run({ getState: () => {} }, { ...BASE, goal: 'g', policy: { click: true } }),
    /Invalid adapter contract/,
  );
});

test('decide refuses a credential leak and a malformed provider response', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      assert.ok(!init.body.includes('test-key-not-a-real-credential'));
      const criteria = body.questions.next.criteria;
      const keys = Object.keys(criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              next: {
                type: 'choice',
                choice: keys[0],
                confidence: 0.9,
                probabilities: Object.fromEntries(keys.map((key) => [key, 1 / keys.length])),
              },
            },
          };
        },
      };
    };
    const decision = await decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ description: 'Click A' }, { description: 'Click B' }],
    });
    assert.equal(decision.choice, 'a0');
    assert.deepEqual(decision.action, { description: 'Click A' });

    // probabilities that do not match the criteria set must be rejected outright
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      const keys = Object.keys(body.questions.next.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              next: {
                type: 'choice',
                choice: 'a0',
                confidence: 0.9,
                probabilities: { [keys[0]]: 1.0 },
              },
            },
          };
        },
      };
    };
    await assert.rejects(
      () =>
        decide({
          configPath: CONFIG_FILE,
          provider: 'typesafe',
          goal: 'g',
          state: 's',
          actions: [{ description: 'Click A' }, { description: 'Click B' }],
        }),
      /Invalid typesafe decision schema/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('decide rejects an unsupported provider, a bad model, and a missing config path', async () => {
  await assert.rejects(
    () => decide({ configPath: CONFIG_FILE, provider: 'nope', goal: 'g', state: 's', actions: [] }),
    /Unsupported provider "nope"; expected one of typesafe, openrouter/,
  );
  await assert.rejects(
    () => decide({ configPath: CONFIG_FILE, provider: 'typesafe', goal: 'g', state: 's', actions: [], model: 'gpt-4' }),
    /Invalid model "gpt-4" for provider typesafe/,
  );
  await assert.rejects(
    () => decide({ provider: 'typesafe', goal: 'g', state: 's', actions: [] }),
    /No configuration path was supplied/,
  );
});

test('decide reports an empty apiKey with the file and the place to get a key', async () => {
  const empty = fileURLToPath(new URL('./fixtures/config-empty-key.json', import.meta.url));
  await assert.rejects(
    () => decide({ configPath: empty, provider: 'typesafe', goal: 'g', state: 's', actions: [] }),
    /"apiKey" is empty in .*config-empty-key\.json.*console\.typesafe\.ai\/keys.*doctor\.mjs/s,
  );
});

test('decide surfaces provider token usage, and a session aggregates it', async () => {
  const restore = stubDecide('DONE');
  try {
    const session = createSession(makeAdapter([settingsPage('e1')]), {
      ...BASE,
      goal: 'Nothing to do.',
      controls: [{ op: 'press', key: 'Escape' }],
    });
    const outcome = await session.run({});

    assert.equal(outcome.history[0].usage.inputTokens, 300);
    assert.equal(outcome.history[0].usage.outputTokens, 20);
    assert.equal(outcome.sessionMetrics.inputTokens, 300);
    assert.equal(outcome.sessionMetrics.outputTokens, 20);
  } finally {
    restore();
  }
});

test('a missing usage block degrades to zero rather than NaN', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const keys = Object.keys(body.questions.next.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: {
            next: {
              type: 'choice',
              choice: 'DONE',
              confidence: 0.9,
              probabilities: Object.fromEntries(keys.map((key) => [key, 1 / keys.length])),
            },
          },
        };
      },
    };
  };
  try {
    const session = createSession(makeAdapter([settingsPage('e1')]), {
      ...BASE,
      goal: 'g',
      controls: [{ op: 'press', key: 'Escape' }],
    });
    const outcome = await session.run({});
    assert.equal(outcome.history[0].usage, null);
    assert.equal(outcome.sessionMetrics.inputTokens, 0);
    assert.equal(outcome.sessionMetrics.outputTokens, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('createSession accumulates history and handoff counts across runs', async () => {
  const restore = stubDecide('DONE');
  try {
    const session = createSession(makeAdapter([settingsPage('e1')]), {
      ...BASE,
      goal: 'Nothing to do.',
      controls: [{ op: 'press', key: 'Escape' }],
    });
    const outcome = await session.run({});
    assert.equal(outcome.status, 'needs_verification');
    assert.equal(outcome.sessionMetrics.runs, 1);
    assert.equal(outcome.sessionMetrics.handoffs.host_blocked ?? 0, 0);
    assert.equal(session.metrics().decisions, 1);
    assert.equal(session.history().length, 1);
    session.reset();
    assert.equal(session.metrics().decisions, 0);
  } finally {
    restore();
  }
});

test('waitForState polls snapshots without spending decision calls', async () => {
  const loading = ir('https://example.com/app', [{ ref: 'e1', role: 'text', name: 'Loading' }]);
  const ready = ir('https://example.com/app', [{ ref: 'e1', role: 'text', name: 'Ready' }]);
  const matched = await waitForState(makeAdapter([loading, ready]), {
    allowedOrigins: ['https://example.com'],
    includes: ['Ready'],
    excludes: ['Loading'],
    timeoutMs: 5000,
    pollMs: 100,
  });
  assert.equal(matched.status, 'matched');

  const timedOut = await waitForState(makeAdapter([loading]), {
    allowedOrigins: ['https://example.com'],
    includes: ['Ready'],
    timeoutMs: 250,
    pollMs: 100,
  });
  assert.equal(timedOut.status, 'timeout');
  assert.ok(timedOut.state);
});

test('projectHistory caps the payload and drops our own bookkeeping', () => {
  const history = Array.from({ length: 14 }, (_, index) => ({
    provider: 'typesafe',
    choice: 'a0',
    confidence: 0.9,
    progress: 0.8,
    model: 'jev-1.13.0',
    apiMs: 120 + index,
    usage: { inputTokens: 300, outputTokens: 20 },
    action: `Click step ${index}`,
    executed: true,
    reason: 'wait',
  }));

  const projected = projectHistory(history);
  assert.equal(projected.length, HISTORY_LIMIT, 'the cap is what bounds request growth');
  assert.equal(projected[0].action, 'Click step 4', 'the most recent entries are the ones kept');
  assert.deepEqual(Object.keys(projected.at(-1)), ['action', 'executed', 'reason']);

  const serialized = JSON.stringify(projected);
  for (const key of ['provider', 'model', 'usage', 'confidence', 'apiMs', 'choice', 'progress']) {
    assert.ok(!serialized.includes(key), `the payload must not carry ${key}`);
  }
});

test('a long run sends at most HISTORY_LIMIT entries and still records every step', async () => {
  const steps = Array.from({ length: 40 }, (_, index) =>
    ir('https://example.com/steps', [
      { ref: 'e1', role: 'button', name: 'Advance' },
      { ref: 'e2', role: 'text', name: `Step ${index}` },
    ]),
  );
  // Every iteration reads the state twice: once to prove the decision is not stale
  // and once after the action. Repeating each state makes the first read match while
  // the second still moves the page, which is what keeps the loop running for 12 steps.
  const restore = stubDecide('a0');
  try {
    const outcome = await run(makeAdapter(steps.flatMap((state) => [state, state])), {
      ...BASE,
      goal: 'Advance twelve times.',
      controls: [{ op: 'click', name: 'Advance' }],
      maxSteps: 12,
    });

    assert.equal(outcome.status, 'step_limit');
    assert.equal(outcome.history.length, 12, 'the internal history keeps every step');
    assert.equal(outcome.history.filter((item) => item.executed).length, 12);
    assert.equal(typeof outcome.history[0].apiMs, 'number', 'internal bookkeeping stays on the record');

    assert.equal(restore.seen.length, 12);
    for (const request of restore.seen) {
      assert.ok(
        request.body.state.history.length <= HISTORY_LIMIT,
        `payload history must stay capped, saw ${request.body.state.history.length}`,
      );
    }
    const last = restore.seen.at(-1).body.state.history;
    assert.equal(last.length, HISTORY_LIMIT);
    assert.deepEqual(Object.keys(last[0]), ['action', 'executed']);
  } finally {
    restore();
  }
});

test('one request carries both the action choice and the independent progress question', async () => {
  const restore = stubDecide('a0');
  try {
    await decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ description: 'Click A' }],
    });

    const [{ body }] = restore.seen;
    assert.deepEqual(Object.keys(body.questions).sort(), ['next', 'progress']);
    assert.equal(
      body.questions.progress.type,
      'noul',
      'a noul question keeps progress out of the action probability set',
    );
    assert.ok(body.questions.progress.instructions.length > 0);
    assert.deepEqual(Object.keys(body.questions.progress.criteria).sort(), ['false', 'true']);
    assert.deepEqual(Object.keys(body.questions.next.criteria), ['a0', 'DONE', 'BLOCKED', 'WAIT']);
  } finally {
    restore();
  }
});

test('a missing or malformed progress answer degrades to null instead of failing the request', async () => {
  const original = globalThis.fetch;
  const respond = (progress) => async (url, init) => {
    const keys = Object.keys(JSON.parse(init.body).questions.next.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: {
            next: {
              type: 'choice',
              choice: 'DONE',
              confidence: 0.9,
              probabilities: Object.fromEntries(keys.map((key) => [key, 1 / keys.length])),
            },
            ...(progress === undefined ? {} : { progress }),
          },
        };
      },
    };
  };
  const call = () =>
    decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ description: 'Click A' }],
    });

  try {
    globalThis.fetch = respond(undefined);
    assert.equal((await call()).progress, null, 'the second answer is optional');

    for (const malformed of ['yes', 7, -0.2, { value: 0.9 }, null]) {
      globalThis.fetch = respond(malformed);
      const decision = await call();
      assert.equal(decision.choice, 'DONE', 'a bad second answer must not fail the request');
      assert.equal(decision.progress, null);
    }

    globalThis.fetch = respond(0.7);
    assert.equal((await call()).progress, 0.7, 'a well-formed noul answer is read as a bare number');
  } finally {
    globalThis.fetch = original;
  }
});

test('DONE with a low progress answer still needs verification and flags the disagreement', async () => {
  const original = globalThis.fetch;
  const respond = (progress) => async (url, init) => {
    const keys = Object.keys(JSON.parse(init.body).questions.next.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: {
            next: {
              type: 'choice',
              choice: 'DONE',
              confidence: 0.9,
              probabilities: Object.fromEntries(keys.map((key) => [key, 1 / keys.length])),
            },
            progress,
          },
        };
      },
    };
  };
  const task = {
    ...BASE,
    goal: 'Enable alerts.',
    controls: [{ op: 'click', name: 'Enable alerts' }],
  };

  try {
    globalThis.fetch = respond(0.1);
    const disagreed = await run(makeAdapter([settingsPage('e1')]), task);
    assert.equal(disagreed.status, 'needs_verification');
    assert.equal(disagreed.handoff, null, 'the signal adds caution, it does not change the handoff');
    assert.equal(disagreed.history.at(-1).progressDisagreement, true);

    globalThis.fetch = respond(0.5);
    const agreed = await run(makeAdapter([settingsPage('e1')]), task);
    assert.equal(agreed.status, 'needs_verification');
    assert.equal(agreed.history.at(-1).progressDisagreement, undefined, '0.5 is not a disagreement');
  } finally {
    globalThis.fetch = original;
  }
});

test('summarizeLatencies is a nearest-rank summary that never reports NaN or undefined', () => {
  const entries = (values) => values.map((apiMs, index) => ({ action: `Click ${index}`, apiMs }));

  assert.deepEqual(summarizeLatencies([]), { count: 0, min: 0, p50: 0, max: 0, total: 0 });
  assert.deepEqual(summarizeLatencies(entries([900, 300, 600])), {
    count: 3,
    min: 300,
    p50: 600,
    max: 900,
    total: 1800,
  });
  assert.deepEqual(summarizeLatencies(entries([400, 100, 300, 200])), {
    count: 4,
    min: 100,
    p50: 200,
    max: 400,
    total: 1000,
  });
  // a request that was never timed is excluded, never counted as a zero latency
  assert.deepEqual(
    summarizeLatencies([{ apiMs: 500 }, { apiMs: undefined }, {}, { apiMs: Number.NaN }]),
    { count: 1, min: 500, p50: 500, max: 500, total: 500 },
  );
});

test('a session reports decision latency in the same metrics object as decisions', async () => {
  const restore = stubDecide('DONE');
  try {
    const session = createSession(makeAdapter([settingsPage('e1')]), {
      ...BASE,
      goal: 'Nothing to do.',
      controls: [{ op: 'press', key: 'Escape' }],
    });
    assert.deepEqual(session.metrics().decisionLatencyMs, { count: 0, min: 0, p50: 0, max: 0, total: 0 });

    const outcome = await session.run({});
    const [apiMs] = outcome.history.map((item) => item.apiMs);
    const summary = outcome.sessionMetrics.decisionLatencyMs;
    assert.equal(summary.count, 1);
    assert.equal(summary.p50, apiMs);
    assert.equal(summary.total, apiMs);
    assert.ok(summary.min <= summary.p50 && summary.p50 <= summary.max);
    assert.equal(session.metrics().decisions, 1, 'latency rides along with the existing metrics');
  } finally {
    restore();
  }
});
