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
  fillValue,
  loadConfig,
  parseFillResponse,
  projectHistory,
  providerGuide,
  resolveProviderConfig,
  run,
  summarizeLatencies,
  validateControl,
  waitForState,
} from '../bridge/core.mjs';
import { choiceAnswer, ir, makeAdapter, stubDecide } from './helpers.mjs';

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
      const opKeys = Object.keys(body.questions.operation.criteria);
      const headKeys = Object.keys(body.questions.click_target.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: choiceAnswer('click', opKeys),
              click_target: choiceAnswer(headKeys[0], headKeys),
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
      actions: [
        { op: 'click', description: 'Click A' },
        { op: 'click', description: 'Click B' },
      ],
    });
    assert.equal(decision.operation, 'click');
    assert.equal(decision.choice, 'click');
    assert.deepEqual(decision.action, { op: 'click', description: 'Click A' });

    // probabilities that do not match the criteria set must be rejected outright
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      const opKeys = Object.keys(body.questions.operation.criteria);
      const headKeys = Object.keys(body.questions.click_target.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: {
                type: 'choice',
                choice: 'click',
                confidence: 0.9,
                probabilities: { click: 1.0 }, // missing DONE/BLOCKED/WAIT keys
              },
              click_target: choiceAnswer(headKeys[0], headKeys),
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
          actions: [
            { op: 'click', description: 'Click A' },
            { op: 'click', description: 'Click B' },
          ],
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
    const opKeys = Object.keys(body.questions.operation.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: { operation: choiceAnswer('DONE', opKeys) },
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

test('one request carries the operation choice, its target head, and the progress question', async () => {
  const restore = stubDecide('a0');
  try {
    await decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ op: 'click', description: 'Click A' }],
    });

    const [{ body }] = restore.seen;
    assert.deepEqual(Object.keys(body.questions).sort(), ['click_target', 'operation', 'progress']);
    assert.equal(
      body.questions.progress.type,
      'noul',
      'a noul question keeps progress out of the action probability set',
    );
    assert.ok(body.questions.progress.instructions.length > 0);
    assert.deepEqual(Object.keys(body.questions.progress.criteria).sort(), ['false', 'true']);
    assert.deepEqual(Object.keys(body.questions.operation.criteria), ['click', 'DONE', 'BLOCKED', 'WAIT']);
    assert.deepEqual(Object.keys(body.questions.click_target.criteria), ['a0']);
  } finally {
    restore();
  }
});

test('a missing or malformed progress answer degrades to null instead of failing the request', async () => {
  const original = globalThis.fetch;
  const respond = (progress) => async (url, init) => {
    const opKeys = Object.keys(JSON.parse(init.body).questions.operation.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: {
            operation: choiceAnswer('DONE', opKeys),
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
      actions: [{ op: 'click', description: 'Click A' }],
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
    const opKeys = Object.keys(JSON.parse(init.body).questions.operation.criteria);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: 'jev-1.13.0',
          answers: {
            operation: choiceAnswer('DONE', opKeys),
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

test('validateControl accepts a named fill and rejects a nameless one', () => {
  assert.ok(validateControl({ op: 'fill', name: 'Query' }));
  assert.ok(!validateControl({ op: 'fill' }));
  assert.ok(!validateControl({ op: 'fill', name: '' }));
});

test('discoverActions offers fill only for uniquely named TEXT_ROLES nodes with a ref', () => {
  const state = ir('https://example.com/', [
    { ref: 'e1', role: 'textbox', name: 'Query' },
    { ref: 'e2', role: 'textarea', name: 'Notes' },
    { ref: 'e3', role: 'button', name: 'Search' },
    { ref: 'e4', role: 'link', name: 'Results' },
    { ref: 'e5', role: 'combobox', name: 'Theme' },
    { ref: null, role: 'searchbox', name: 'Unreferenced' },
    { ref: 'e6', role: 'textbox', name: 'Denied field' },
    { ref: 'e7', role: 'textbox', name: 'Reserved field' },
    { ref: 'e8', role: 'textbox', name: 'Dup' },
    { ref: 'e9', role: 'textbox', name: 'Dup' },
  ]);
  const actions = discoverActions(state, {
    fill: true,
    denyNames: [/denied/i],
    requireHostNames: [/reserved/i],
  });
  const fills = actions.filter((action) => action.op === 'fill');
  assert.deepEqual(
    fills.map((action) => [action.ref, action.name, action.role, action.description]),
    [
      ['e1', 'Query', 'textbox', 'Fill Query'],
      ['e2', 'Notes', 'textarea', 'Fill Notes'],
      ['e5', 'Theme', 'combobox', 'Fill Theme'],
    ],
    'buttons, links, ref-less nodes, denied, reserved, and duplicate names are excluded',
  );
  assert.equal(
    discoverActions(state, { click: true }).filter((action) => action.op === 'fill').length,
    0,
    'no fill candidates without policy.fill',
  );
});

test('availableActions binds a unique named field and drops absent or ambiguous ones', () => {
  const state = ir('https://example.com/settings', [
    { ref: 'f1', role: 'textbox', name: 'Email' },
    { ref: 'f2', role: 'textbox', name: 'Nickname' },
    { ref: 'f3', role: 'textbox', name: 'Nickname' },
    { ref: 'f4', role: 'heading', name: 'Email' },
    { ref: null, role: 'textbox', name: 'Refless' },
  ]);
  const actions = availableActions(state, [
    { op: 'fill', name: 'Email' }, // one textbox (the heading is not fillable) → bound
    { op: 'fill', name: 'Nickname' }, // two textboxes → dropped
    { op: 'fill', name: 'Missing' }, // absent → dropped
    { op: 'fill', name: 'Refless' }, // no executable ref → dropped
  ]);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0], {
    op: 'fill',
    name: 'Email',
    ref: 'f1',
    role: 'textbox',
    description: 'Fill Email',
  });
});

test('parseFillResponse returns a valid text and rejects everything else', () => {
  assert.equal(parseFillResponse({ text: 'hello' }), 'hello');
  assert.equal(parseFillResponse({ text: 'x'.repeat(2000) }).length, 2000, '2000 chars is the bound, not a failure');
  assert.throws(() => parseFillResponse({ text: 'x'.repeat(2001) }), /fill error/);
  assert.throws(() => parseFillResponse(null), /fill error/);
  assert.throws(() => parseFillResponse('nope'), /fill error/);
  assert.throws(() => parseFillResponse([]), /fill error/);
  assert.throws(() => parseFillResponse({}), /fill error/);
  assert.throws(() => parseFillResponse({ text: '' }), /fill error/);
  assert.throws(() => parseFillResponse({ text: '   ' }), /fill error/);
  assert.throws(() => parseFillResponse({ text: 42 }), /fill error/);
  assert.throws(() => parseFillResponse({ text: null }), /fill error/);
});

/** Set a fake fill credential for the duration of `fn`; restores after. */
function withFillKey(fn) {
  const previous = process.env.BIFROST_API_KEY;
  process.env.BIFROST_API_KEY = 'test-bifrost-key-not-in-body';
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.BIFROST_API_KEY;
    else process.env.BIFROST_API_KEY = previous;
  }
}

test('fillValue sends the field to the helper and strict-parses its JSON', async () => {
  const original = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        async json() {
          return { choices: [{ message: { content: '{"text":"reports"}' } }] };
        },
      };
    };
    const text = await withFillKey(() =>
      fillValue({
        goal: 'Search for reports.',
        field: { role: 'textbox', name: 'Query' },
        recentActions: ['Click Search'],
      }),
    );
    assert.equal(text, 'reports');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://bifrost.jiazoushi.com/v1/chat/completions');
    const body = JSON.parse(requests[0].init.body);
    assert.equal(body.model, 'deepseek-v4-flash');
    assert.deepEqual(JSON.parse(body.messages[1].content), {
      goal: 'Search for reports.',
      field: { role: 'textbox', name: 'Query' },
      recent_actions: ['Click Search'],
    });
  } finally {
    globalThis.fetch = original;
  }
});

test('fillValue fails closed on a missing key or bad helper output instead of guessing', async () => {
  const original = globalThis.fetch;
  try {
    const call = () => withFillKey(() => fillValue({ goal: 'g', field: { name: 'Query' } }));

    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    await assert.rejects(call, /fill error/, 'a transport failure is a fill error');

    globalThis.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(call, /fill error/, 'an HTTP error is a fill error');

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new Error('bad json');
      },
    });
    await assert.rejects(call, /fill error/, 'a non-JSON body is a fill error');

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: 'not json' } }] };
      },
    });
    await assert.rejects(call, /fill error/, 'a non-JSON content is a fill error');

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: '{"text":""}' } }] };
      },
    });
    await assert.rejects(call, /fill error/, 'a blank value is a fill error');

    // a missing credential fails before any request is made
    globalThis.fetch = async () => {
      throw new Error('must not be called');
    };
    const previous = process.env.BIFROST_API_KEY;
    delete process.env.BIFROST_API_KEY;
    try {
      await assert.rejects(() => fillValue({ goal: 'g', field: { name: 'Query' } }), /fill error/);
    } finally {
      if (previous === undefined) delete process.env.BIFROST_API_KEY;
      else process.env.BIFROST_API_KEY = previous;
    }
  } finally {
    globalThis.fetch = original;
  }
});

const fillPage = (ref) =>
  ir('https://example.com/search', [
    { ref, role: 'textbox', name: 'Query' },
    { ref: `${ref}-btn`, role: 'button', name: 'Search' },
  ]);

test('a fill helper failure hands back as action_error instead of guessing a value', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('bifrost')) throw new Error('fill helper unavailable');
      const body = JSON.parse(init.body);
      const opKeys = Object.keys(body.questions.operation.criteria);
      const headKeys = Object.keys(body.questions.fill_target.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: choiceAnswer('fill', opKeys),
              fill_target: choiceAnswer(headKeys[0], headKeys),
            },
          };
        },
      };
    };
    const adapter = makeAdapter([fillPage('q1'), fillPage('q1'), fillPage('q1')]);
    const outcome = await withFillKey(() =>
      run(adapter, {
        ...BASE,
        goal: 'Search for reports.',
        controls: [{ op: 'fill', name: 'Query' }],
      }),
    );
    assert.equal(outcome.status, 'action_error');
    assert.equal(outcome.handoff, 'action_error');
    assert.equal(outcome.error, 'fill error');
    assert.equal(outcome.history.at(-1).reason, 'action_error');
    assert.equal(outcome.history.at(-1).executed, false);
    assert.ok(!adapter.calls.some((call) => call.op === 'type'), 'no type() may run without a value');
  } finally {
    globalThis.fetch = original;
  }
});

test('a decided fill executes through adapter.type with the helper value', async () => {
  const original = globalThis.fetch;
  const fillRequests = [];
  try {
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('bifrost')) {
        fillRequests.push(init.body);
        return {
          ok: true,
          status: 200,
          async json() {
            return { choices: [{ message: { content: '{"text":"reports"}' } }] };
          },
        };
      }
      const body = JSON.parse(init.body);
      const opKeys = Object.keys(body.questions.operation.criteria);
      const headKeys = Object.keys(body.questions.fill_target.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: choiceAnswer('fill', opKeys),
              fill_target: choiceAnswer(headKeys[0], headKeys),
            },
          };
        },
      };
    };
    const adapter = makeAdapter([fillPage('q1'), fillPage('q1'), fillPage('q1')]);
    const outcome = await withFillKey(() =>
      run(adapter, {
        ...BASE,
        goal: 'Search for reports.',
        controls: [{ op: 'fill', name: 'Query' }],
      }),
    );
    assert.equal(outcome.status, 'no_progress', 'the same fill repeats once and then hands back');
    assert.deepEqual(
      adapter.calls.filter((call) => call.op === 'type'),
      [{ op: 'type', ref: 'q1', text: 'reports' }],
      'execute routes the fill to adapter.type with the helper text',
    );
    const executed = outcome.history.find((item) => item.executed);
    assert.equal(executed.action, 'Fill Query');
    assert.equal(executed.text, 'reports', 'the history entry carries the generated value');
    assert.equal(fillRequests.length, 1, 'the helper is not called again before the handback');
    const helperBody = JSON.parse(fillRequests[0]);
    assert.equal(helperBody.model, 'deepseek-v4-flash');
    assert.deepEqual(JSON.parse(helperBody.messages[1].content), {
      goal: 'Search for reports.',
      field: { role: 'textbox', name: 'Query' },
      recent_actions: [],
    });
  } finally {
    globalThis.fetch = original;
  }
});

test('one request carries operation plus one target head per candidate operation', async () => {
  const restore = stubDecide('a0');
  try {
    await decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [
        { op: 'click', description: 'Click A' },
        { op: 'fill', description: 'Fill Query' },
      ],
    });

    const [{ body }] = restore.seen;
    assert.deepEqual(
      Object.keys(body.questions).sort(),
      ['click_target', 'fill_target', 'operation', 'progress'],
    );
    assert.deepEqual(Object.keys(body.questions.operation.criteria), [
      'click',
      'fill',
      'DONE',
      'BLOCKED',
      'WAIT',
    ]);
    assert.deepEqual(Object.keys(body.questions.click_target.criteria), ['a0']);
    assert.deepEqual(Object.keys(body.questions.fill_target.criteria), ['a1']);
    assert.equal(body.questions.progress.type, 'noul');
  } finally {
    restore();
  }
});

test('a malformed unselected target head cannot fail the request', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      const opKeys = Object.keys(body.questions.operation.criteria);
      const headKeys = Object.keys(body.questions.click_target.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: choiceAnswer('click', opKeys),
              click_target: choiceAnswer(headKeys[0], headKeys),
              // fill was not selected: its malformed answer must be ignored
              fill_target: { type: 'choice', choice: 'a9', confidence: 0.9, probabilities: {} },
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
      actions: [
        { op: 'click', description: 'Click A' },
        { op: 'fill', description: 'Fill Query' },
      ],
    });
    assert.equal(decision.operation, 'click');
    assert.deepEqual(decision.action, { op: 'click', description: 'Click A' });
  } finally {
    globalThis.fetch = original;
  }
});

test('a missing or invalid selected head fails the request', async () => {
  const original = globalThis.fetch;
  const call = () =>
    decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ op: 'fill', description: 'Fill Query' }],
    });
  try {
    globalThis.fetch = async (url, init) => {
      const opKeys = Object.keys(JSON.parse(init.body).questions.operation.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: { operation: choiceAnswer('fill', opKeys) },
          };
        },
      };
    };
    await assert.rejects(call, /Invalid typesafe decision schema/, 'the selected head is missing');

    globalThis.fetch = async (url, init) => {
      const opKeys = Object.keys(JSON.parse(init.body).questions.operation.criteria);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: 'jev-1.13.0',
            answers: {
              operation: choiceAnswer('fill', opKeys),
              fill_target: { type: 'choice', choice: 'a9', confidence: 0.9, probabilities: { a9: 1 } },
            },
          };
        },
      };
    };
    await assert.rejects(call, /Invalid typesafe decision schema/, 'the selected head is invalid');
  } finally {
    globalThis.fetch = original;
  }
});

test('DONE, BLOCKED, and WAIT carry no target head', async () => {
  const restore = stubDecide('DONE');
  try {
    await decide({
      configPath: CONFIG_FILE,
      provider: 'typesafe',
      goal: 'g',
      state: 's',
      actions: [{ op: 'click', description: 'Click A' }],
    });
    const [{ body }] = restore.seen;
    assert.deepEqual(Object.keys(body.questions).sort(), ['click_target', 'operation', 'progress']);
    assert.ok(!body.questions.done_target, 'DONE has no head');
    assert.ok(!body.questions.blocked_target, 'BLOCKED has no head');
    assert.ok(!body.questions.wait_target, 'WAIT has no head');
    const opKeys = Object.keys(body.questions.operation.criteria);
    assert.ok(opKeys.includes('DONE') && opKeys.includes('BLOCKED') && opKeys.includes('WAIT'));
  } finally {
    restore();
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
