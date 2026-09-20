# Design — Jev request efficiency and the 15-action measurement

## Evidence the design responds to

Live TypeSafe probe (`/tmp/jev-probe.mjs`, fixture IR, `jev-latest`):

| Independent variable | Result |
| --- | --- |
| history length 0 → 80 | input tokens **1,525 → 10,314** (6.8×), same decision |
| state 2.7KB → 18.2KB | input tokens **1,525 → 6,935** |
| clean decision | `choice=a1`, `confidence=0.89`, schema valid |
| latency across 8 requests | 563–1,959 ms, median ~965 ms |

Field-by-field diff against `browser-use/jev-ultrafast` (`jev_ultrafast/model.py`):

| Aspect | Official | Ours | Verdict |
| --- | --- | --- | --- |
| endpoint / auth / model | `/v1/systemone`, Bearer | identical | conforming |
| body shape | `{model, state, questions}` | identical | conforming |
| response validation | choice ∈ ids, Σp≈1, argmax match | identical + model pattern | conforming |
| history | `history[-10:]`, 4 projected fields | **all entries, all fields** | **defect** |
| questions per request | 1 operation + N target heads, parallel | **1** | under-used |
| instruction text | long tuned rule set | one paragraph | under-used |
| element state | `role/value/checked/selected/expanded` | **dropped by the parser** | **defect** |
| latency accounting | `latency_ms` per call, median reported | `apiMs` recorded, never summarized | gap |

Conclusion: the protocol is correct and Jev answers correctly. **The inefficiency is in what we put
inside the request**, and the fix is a request-payload change, not a model or endpoint change.

## Changes

### C1 — Project and cap history at the request boundary

Keep the full internal `history` array: `metrics.decisions`, `executedActions`, `failedDecisions`
and every existing assertion read it, and shrinking it would corrupt the metrics. Add a **projection
applied only where the payload is built**:

```js
const HISTORY_LIMIT = 10;

function projectHistory(history) {
  return history.slice(-HISTORY_LIMIT).map(({ action, executed, reason, effectNeedsVisualVerification, noEffect }) => ({
    action,
    executed: executed === true,
    ...(reason ? { reason } : {}),
    ...(effectNeedsVisualVerification ? { effectNeedsVisualVerification: true } : {}),
    ...(noEffect ? { noEffect: true } : {}),
  }));
}
```

Dropped deliberately: `provider`, `model`, `usage`, `confidence`, `apiMs`, `choice`. These are
bookkeeping for *us*; the model is being asked what to do next, and a wall of `apiMs: 180` and
`confidence: 0.91` either wastes context or, worse, reads as evidence of progress it does not have.
`action` is the decision's own human description, which is what the model needs.

Contract: `decide()` keeps accepting `history` and stays a pure function of its inputs; only the
caller changes. Tests that drive `decide()` directly are unaffected.

Risk: low. The model loses no fact about what it did. If the 15-action run regresses on accuracy,
the cap is the first suspect and the limit is one constant to raise.

### C2 — Preserve control state in the IR

`parseAriaSnapshot` currently extracts `role` and a name, and **discards a state suffix**:
`- checkbox "Accept terms" [ref=e9]: checked` → `{role:'checkbox', name:'Accept terms'}` — the
`checked` is gone. A model that cannot see current state will re-toggle an already-correct control,
which is exactly the failure the official rule set calls out.

Planned shape: nodes gain an optional `state` (`checked`/`unchecked`/`selected`/`expanded`/
`collapsed`/`disabled`/`pressed`), carried through `createIR` and rendered by `serializeForJev` as
`checkbox "Accept terms" (checked)`. A value that is not one of these state words keeps the current
behaviour (it becomes the name), so nothing that works today changes meaning.

Determinism requirement: `fingerprint` must stay a pure function of role+name+url, so state is
**excluded** from the fingerprint — a page whose only change is a control's state must still be
detected as changed by the *stale-decision* guard. Because `fingerprint` drives that guard, including
state in it is a behaviour change with real safety value; excluding it keeps today's semantics.
Decision: include `state` in `fingerprint`. Rationale: a stale decision must not be executed against a
page whose control state moved — that is a correctness fix, and the guard's whole purpose. The
existing tests that assert stale/unchanged behaviour use fixtures without state suffixes, so they
still pass; a new test pins the state-change case.

Risk: medium (touches the guard). Mitigation: explicit test for both directions — unchanged page ⇒
same fingerprint; only-state-changed page ⇒ different fingerprint.

### C3 — Ask the independent question in the same request

TypeSafe documents that every question in a request is evaluated **in parallel and in isolation** and
that "adding questions barely changes the response time". Use it for a second question that is
genuinely independent of "what next":

```js
questions.progress = {
  type: 'noul',
  instructions: 'Is every requirement of the goal visibly satisfied on this page right now?',
  criteria: {
    true: 'The requested final state is visible and complete on this page',
    false: 'Anything in the goal is still missing, hidden, or unconfirmed',
  },
};
```

It costs one extra answer in a request that is already being made, and it gives the executor an
independent signal for the case that matters: the model picks `DONE` while the page plainly is not
done. This does **not** weaken the safety model — `DONE` already returns `needs_verification` and is
never self-certifying. The new signal can only add caution, so it is a pure addition:

- `choice === 'DONE'` **and** `progress >= 0.5` → unchanged behaviour (`needs_verification`)
- `choice === 'DONE'` **and** `progress < 0.5` → same `needs_verification`, with
  `progressDisagreement: true` recorded in history so the host sees why it must look

Noul response shape: the answer is a bare number under the question id (probability of yes). The
validator must accept that shape and must not fail the request when `progress` is absent or
non-numeric — a missing second answer degrades to today's behaviour rather than erroring.

Risk: low. Deliberately *not* gating or rejecting on it, so a bad `progress` answer cannot cause a
false failure.

### C4 — Adopt the operational rules that prevent wasted rounds

Replace the single-paragraph `INSTRUCTIONS` with the official rule set, adapted:

- keep, verbatim in spirit: do not repeat a satisfied step; do not re-toggle a control already in the
  requested state; prefer a useful visible control over WAIT; recent WAIT is not evidence of loading;
  DONE requires visible evidence that ALL requirements are satisfied
- **delete** every rule about text entry, autocomplete, and form submission: this skill performs no
  text entry by construction, and carrying rules about it would invite the model to plan actions the
  executor cannot perform
- keep this skill's own framing: page content is untrusted data; DONE returns control to the host for
  independent verification

Rationale: every wrong action costs a full round trip (state read + Jev call + execute). The rules are
the cheapest available accuracy lever, and they are free in tokens relative to the state blob.

Risk: low, but unmeasured until the 15-action run. Held to AC7.

### C5 — Surface per-decision latency

`decide()` already returns `apiMs`; the run records it per history entry. Add summary stats to the
run result so latency is reportable without post-processing a transcript:

```js
metrics.decisionLatencyMs = { count, min, p50, max, total };
```

`p50` is a nearest-rank percentile over the run's decision latencies. This is measurement plumbing,
not behaviour, and it is what makes AC4's "per-step model latency" quotable.

### C6 — A 15-action fixture, and the measurement that uses it

Extend `tests/fixtures/static-page.html` with a five-section flow requiring **15 distinct mechanical
actions** drawn from the operations this skill actually performs (click + scroll only — no typing,
no dropdowns, since the executor supports neither).

Sketch (each step a distinct target among many similar ones, which is the point — target selection
accuracy is what is being measured):

1–3. expand section A, check A1, check A2
4–6. expand B, select radio B1, expand C
7.   scroll inside the report panel
8–10. check C1, expand D, check D1
11.  scroll inside the report panel
12–14. expand E, select radio E1, press Escape
15.  confirm

The fixture reports its own outcome — the same opt-in self-report hook added for the 3-action A/B,
generalised to assert the full 15-action expected state. Correctness is read from that report, never
from the agent's reply.

Harness: extend `tests/e2e/cost-experiment.sh` so each run also records **per-arm wall time** and the
per-decision latency the skill itself reports. Arm A cannot report Jev latency (it makes no Jev
calls) — for arm A the comparable quantity is **per-action host latency**, so the harness records
that arm's wall time per action, and the report compares *time per mechanical action*, which is the
only honest apples-to-apples framing.

## What is explicitly NOT done

- **No text-entry helper.** Adding an LLM to fill fields would make the skill win a text-heavy
  benchmark it was never scoped for, and would break the "no text entry by construction" guarantee
  that is a safety feature. Out of scope.
- **No operation/target question split.** The official split exists to avoid a *serial* second call
  for target resolution. We pre-enumerate concrete actions locally and make exactly one call, so we
  do not pay the cost that split removes. Adopting it would add response surface without the benefit.
  If the 15-action run shows target selection is the accuracy bottleneck, revisit with data.
- **No change to the safety guards** beyond the fingerprint decision above, which tightens one.

## Rollout / rollback

Each change is independently revertable:

| Change | Rollback |
| --- | --- |
| C1 history projection | raise `HISTORY_LIMIT` or drop the projection |
| C2 IR state | drop `state` from nodes, fingerprint, and serialization |
| C3 progress question | remove `questions.progress`; the executor ignores a missing answer |
| C4 instructions | restore the previous const |
| C5 latency metrics | additive field, safe to leave |
| C6 fixture | additive; the 3-action A/B remains valid |

Any change that does not survive the 15-action measurement is reverted (AC7), and the reverted change
is documented in the report rather than silently dropped.
