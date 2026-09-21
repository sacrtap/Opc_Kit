# Design — TypeSafe API conformance

## Boundaries

**In scope**

- `bridge/core.mjs` — error classification + backoff, operation rubrics, target
  head instructions, target-confidence plumbing, fill-helper configuration.
- `bridge/ir.mjs` — `serializeForJev` (only if F7 is adopted).
- `install.mjs`, `scripts/doctor.mjs`, `references/configuration.md` — the fill
  helper joins the documented configuration surface.
- `SKILL.md`, `README.md`, guides, `CHANGELOG.md` — retry behavior, new config
  keys, measurement result.
- `tests/*.test.mjs` — new coverage for the retry path, the question shapes, and
  the target gate.

**Out of scope**

- The adapter contract (`references/adapter-contract.md`) and the three adapters.
  Nothing here changes what an adapter is asked to do.
- The decision/action loop's structure, the safety bounds (origin allowlist,
  stale-discard, policy, DONE→`needs_verification`), and the answer validation in
  `readChoice`. All of these already conform and stay as they are.
- Adopting a TypeSafe client SDK. The skill is dependency-free by design; the
  retry work below is what the SDKs would otherwise provide.

## Contracts

### 1. Retriable-error classification (R1)

New in `bridge/core.mjs`:

```js
/** HTTP statuses the TypeSafe API documents as retriable with backoff. */
const RETRIABLE_STATUS = new Set([429, 529]);

/** Backoff base and cap for one retried decision. */
const RETRY_BASE_MS = 250;
const RETRY_MAX_MS = 4000;
```

An error thrown by `decide()` carries machine-readable retry intent. Existing
messages are unchanged, so nothing that matches on message text breaks:

```js
class ProviderRequestError extends Error {
  constructor(message, { retryable, retryAfterMs = null }) {
    super(message);
    this.name = 'ProviderRequestError';
    this.retryable = retryable;      // may this request be retried?
    this.retryAfterMs = retryAfterMs; // server-supplied delay, if any
  }
}
```

Classification:

| Condition | `retryable` | message (unchanged) |
| --- | --- | --- |
| fetch throws / `AbortSignal` timeout | `true` | `<provider> transport failure or timeout` |
| HTTP 429 or 529 | `true` (+ `retryAfterMs`) | `<provider> HTTP <status>` |
| any other non-2xx (401, 422, …) | `false` | `<provider> HTTP <status>` |
| invalid JSON / invalid decision schema | `false` | `<provider> decision schema` / `Invalid <provider> JSON` |
| empty or missing `apiKey` | `false` | the existing credential message |

`Retry-After` parsing accepts the documented delta-seconds form and the
HTTP-date form; anything unparseable yields `null` and the local backoff is used.

Backoff is a pure, exported function so it is testable without sleeping:

```js
export function retryDelayMs(attempt, retryAfterMs = null) {
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) return Math.min(retryAfterMs, RETRY_MAX_MS);
  const exponential = RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * RETRY_BASE_MS);
  return Math.min(exponential + jitter, RETRY_MAX_MS);
}
```

`run()` retries when `error.retryable === true` (or the legacy transport message),
`decisionRetries < maxDecisionRetries`, and at least 1000 ms of `maxMs` remain.
Before retrying it sleeps `min(retryDelayMs(attempt, error.retryAfterMs),
RETRY_MAX_MS, remaining - 1000)`, so the backoff can never consume the whole
budget. `maxDecisionRetries` keeps its existing default of 1 and its existing
cap of 2; only the set of errors that qualify changes.

The retry is already recorded in history as `reason: 'decision_retry'` and
already counted in `metrics.decisionRetries`. No new metric is needed.

### 2. Question shapes (R2)

Operation rubrics, one per operation kind in the action space:

```js
const OPERATION_RUBRICS = {
  click: 'Press one clickable control (button, link, checkbox, tab) to move the page forward.',
  fill: 'Type a generated value into one text field. It enters text only and never submits.',
  scroll: 'Move the viewport to reveal content that is currently out of view. It changes nothing else.',
  press: 'Send one bounded keyboard key to the page. It does not type text.',
  reload: 'Reload the current page. It discards page-local state and changes nothing else.',
};
```

Each rubric states what the option does and what it does not do, so the options
separate from one another. `operationCriteria[action.op]` becomes
`OPERATION_RUBRICS[action.op] ?? action.op`; the `?? action.op` keeps an unknown
future operation kind representable rather than emitting `undefined`.

Each target head names its own operation instead of referring to an answer it
cannot see, using the documented structured form:

```js
questions[`${op}_target`] = {
  type: 'choice',
  instructions: {
    operation: op,
    question: `Choose the exact target for a \`${op}\` operation from the listed candidates; pick the one that best matches the goal and the current accessibility state.`,
  },
  criteria: entry.criteria,
};
```

### 3. Target confidence (R3)

`readTarget` returns the acted-on head's confidence alongside the action:

```js
function readTarget(answers, op, byOp) {
  const entry = byOp.get(op);
  if (!entry) return null;
  const head = readChoice(answers, `${op}_target`, entry.criteria);
  const action = entry.byId.get(head.choice) ?? null;
  return action === null ? null : { action, confidence: head.confidence };
}
```

`decide()` gains `targetConfidence: action?.confidence ?? null` in its return
value. `run()` gains one parameter:

```js
minTargetConfidence = minConfidence,
```

validated on the same range as `minConfidence`, and gates after the operation
gate:

```js
if (decision.confidence < minConfidence) return result('low_confidence', …);
if (decision.targetConfidence !== null && decision.targetConfidence < minTargetConfidence) {
  return result('low_confidence', …);
}
```

`createSession`/`run` already spread caller defaults, so the parameter needs no
new plumbing. The default equals `minConfidence`, which makes the run strictly
stricter than today for target-ambiguous states — that is a deliberate,
evidence-required change, validated by the R6 measurement rather than assumed.

### 4. Fill helper configuration (R4)

The helper's endpoint and model become parameters with the current values as
defaults:

```js
export const FILL_DEFAULT_ENDPOINT = 'https://bifrost.jiazoushi.com/v1/chat/completions';
export const FILL_DEFAULT_MODEL = 'deepseek-v4-flash';
```

`fillValue({ goal, field, recentActions }, { timeoutMs, endpoint, model, maxRetries })`
resolves `endpoint ?? FILL_DEFAULT_ENDPOINT` and `model ?? FILL_DEFAULT_MODEL`.
`loadConfig()` adds `fillEndpoint` and `fillModel` to its return value, defaulted
from the constants; `run()` accepts and forwards them. The credential stays in
`BIFROST_API_KEY` — moving it into the config file would duplicate the key
handling the skill deliberately keeps in the environment.

`providerGuide()` gains a fill entry so the installer and doctor print it from
one source, and `references/configuration.md` documents both keys. `fillValue`
retries a 429/529 through the same `retriableStatus`/`retryDelayMs` pair as
`decide()`, bounded by `maxRetries` (default 1).

### 5. F6 and F7 — decided by evidence, not adopted by default (R5)

**F6 (target escape option).** Build a probe variant whose target heads add a
`none` option, run it against the ambiguity states from the audit, and compare
picks and confidence against the current shape. Adopt only if it changes
behaviour in the direction that matters (fewer confident wrong picks); otherwise
reject with the measurement recorded, since `BLOCKED` already provides the
escape and an extra option costs a probability mass split on every decision.

**F7 (structured state).** Add a structured emission to `serializeForJev`
(`ir.nodes` as objects with `ref`/`role`/`name`/`state`) behind a flag, then
compare `usage.input_tokens` and pick accuracy against the flat string on the
same states. Adopt only if the token cost is acceptable and accuracy does not
regress.

Both are decided in Phase P5 and their outcome written into the audit research
file, whichever way they go.

## Data flow

```
run()
 ├─ decide()  ──► fetch(endpoint)  ──► 429/529 ──► ProviderRequestError{retryable}
 │                                                    │
 │   ◄── retryDelayMs() ── sleep ── retry ────────────┘
 │
 ├─ readChoice('operation')      → operation.confidence   (existing gate)
 ├─ readTarget(op)              → { action, confidence } (new: confidence kept)
 ├─ gate: operation.confidence < minConfidence          → low_confidence
 ├─ gate: targetConfidence < minTargetConfidence        → low_confidence  (new)
 └─ execute → (fill) fillValue() ──► 429/529 ──► same backoff path
```

## Tradeoffs

- **Stricter default gate.** `minTargetConfidence = minConfidence` will hand back
  more often on states with several similar controls. That is the intent — the
  audit measured a 0.19 divergence the gate currently cannot see (A1) — but it is
  a behaviour change, so R6 measures it and the parameter exists to tune it back.
- **Backoff consumes budget.** A retry now waits before it retries, so a run with
  a tight `maxMs` may end at `budget` where it previously ended at
  `decision_error`. That is the better failure: the run used its budget on a
  retriable condition instead of giving up on the first 429.
- **Jitter is random.** It is confined to the pure `retryDelayMs`, so tests
  assert bounds rather than exact values, and `Retry-After` bypasses jitter
  entirely.
- **Configuration surface grows by two keys.** Defaulted, so an existing config
  file keeps working unchanged.

## Compatibility

- Every existing error message is preserved; only new fields are added to the
  thrown object, so anything matching on message text is unaffected.
- `readTarget`'s internal return shape changes, but it is not exported; its only
  caller is `decide()`.
- `decide()`'s return value gains a field; existing consumers ignore extras.
- `fillValue`'s options object gains fields with defaults; the current call site
  passes none of them.
- An existing `~/.config/browser-with-typesafe/config.json` needs no edit.

## Rollout and rollback

Each of P1–P5 lands as its own commit with its own tests, so any one can be
reverted alone. The audit's probe scripts stay outside the repo. Rollback for
P2/P3 is a revert of the question-shape commit; rollback for R3's stricter gate
is a one-line default change.
