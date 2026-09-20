// Live TypeSafe/Jev probe — audit harness, NOT a regression test.
//
// Answers two questions with measurements rather than assertions:
//   1. Does Jev answer this skill's questions correctly?
//   2. How do the request's input tokens and latency scale with history length and state size?
//
// Costs real (small) money: each call is one System One request. Run it deliberately.
//
//   from skills/browser-with-typesafe/:
//     node ../../.trellis/tasks/09-20-jev-perf/research/jev-probe.mjs
//
// Reads the credential through the normal config path; never prints it.

import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../skills/browser-with-typesafe');

const { parseAriaSnapshot } = await import(join(SKILL, 'bridge/aria-snapshot.mjs'));
const { createIR, serializeForJev } = await import(join(SKILL, 'bridge/ir.mjs'));
const { decide, discoverActions, loadConfig } = await import(join(SKILL, 'bridge/core.mjs'));

const snapshot = await readFile(join(SKILL, 'tests/fixtures/omp-expanded.snapshot.txt'), 'utf8');
const ir = createIR({ url: 'http://127.0.0.1:8791/', nodes: parseAriaSnapshot(snapshot) });
const state = serializeForJev(ir);
const actions = discoverActions(ir, { scrollDirections: ['up', 'down'], keys: ['Escape'], reload: true });

console.log(
  `nodes=${ir.nodes.length}  serialized=${state.length} chars (~${Math.round(state.length / 4)} tok)  actions=${actions.length}`,
);

const cfg = await loadConfig();
console.log(`provider=${cfg.provider} model=${cfg.model} hasApiKey=${cfg.hasApiKey}`);

// Shaped like a real history entry so the projection under test is fed realistic input.
const record = (i) => ({
  provider: 'typesafe',
  choice: `a${i % 3}`,
  confidence: 0.91,
  model: 'jev-1.13.0',
  apiMs: 180,
  usage: { inputTokens: 5200, outputTokens: 40 },
  action: `Click Expand section then scroll within the evaluation report panel step ${i}`,
  executed: true,
});

const goal =
  'Open the evaluation report, expand the section, scroll down two pages, then collapse it again.';

const call = (s, history) =>
  decide({ provider: cfg.provider, model: cfg.model, configPath: cfg.configPath, goal, state: s, actions, history });

console.log('\nA. cost vs history length');
console.log('historyLen   apiMs   inTok  outTok  choice   conf');
for (const len of [0, 5, 10, 20, 40, 80]) {
  try {
    const d = await call(state, Array.from({ length: len }, (_, i) => record(i)));
    console.log(
      `${String(len).padStart(10)}  ${String(d.apiMs).padStart(6)}  ${String(d.usage?.inputTokens ?? '?').padStart(6)}  ${String(
        d.usage?.outputTokens ?? '?',
      ).padStart(6)}  ${d.choice.padEnd(7)}  ${d.confidence}`,
    );
  } catch (error) {
    console.log(`${String(len).padStart(10)}  ERROR: ${error.message}`);
  }
}

console.log('\nB. cost vs state size (history empty)');
const filler = Array.from({ length: 240 }, (_, i) => ({
  role: 'button',
  ref: `e${i + 100}`,
  name: `Unrelated control number ${i} in a dense list`,
}));
const bigState = serializeForJev(createIR({ url: 'http://127.0.0.1:8791/', nodes: [...ir.nodes, ...filler] }));
console.log(`  small state=${state.length} chars (~${Math.round(state.length / 4)} tok)`);
console.log(`  large state=${bigState.length} chars (~${Math.round(bigState.length / 4)} tok)`);
for (const [label, s] of [['small', state], ['large', bigState]]) {
  try {
    const d = await call(s, []);
    console.log(`  ${label}: apiMs=${d.apiMs} inTok=${d.usage?.inputTokens} choice=${d.choice} conf=${d.confidence}`);
  } catch (error) {
    console.log(`  ${label}: ERROR ${error.message}`);
  }
}
