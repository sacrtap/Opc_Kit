import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  availableActions,
  checkState,
  createSession,
  decide,
  discoverActions,
  loadConfig,
  providerGuide,
  resolveProviderConfig,
  run,
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
