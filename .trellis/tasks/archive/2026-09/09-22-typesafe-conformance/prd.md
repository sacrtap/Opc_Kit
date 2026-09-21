# browser-with-typesafe: TypeSafe API conformance

## Goal

`skills/browser-with-typesafe` uses TypeSafe Jev as its decision layer, but six
places in the implementation deviate from TypeSafe's published API and design
guidance. One of them (429/529 handling) turns a transient rate limit into a hard
workflow failure, and this session observed exactly that failure mode destroy a
sub-agent's run.

This task brings the skill into conformance with the documented contract, and
re-measures afterwards rather than assuming the changes help. The audit that
produced the findings is in `research/typesafe-conformance-audit.md`; every
finding there carries a `file:line` or a measured live-Jev response.

Scope confirmed with the user: **all findings, including the two low-priority
items, plus a re-run of the A/B measurement.**

## Context — decisions already confirmed with the user

- **Scope**: P1–P5, i.e. every finding including F6 (target escape option) and F7
  (structured state).
- **Measurement**: yes — re-run the A/B comparison after the question-quality
  changes, using the existing harness and the unchanged criterion.
- **Criterion**: unchanged — arm B ≤ 0.8 × arm A on BOTH tokens (uncached+output)
  and time per mechanical action, reproduced across two consecutive rounds.
- **Free models only** for testing, as in the prior task.
- The audit's honest limits are part of the requirement set: F2, F3, F4, and F7
  showed **no** demonstrable correctness difference in measurement, so they are
  conformance work, not bug fixes. Any claim about them must stay proportional to
  the evidence.

## Requirements

### R1 — Retry the errors the API says are retriable (F1)

- A `429 Too Many Requests` or `529 Overloaded` response must be retried with
  exponential backoff, per the API reference, instead of being recorded as a
  terminal `decision_error`.
- Backoff must be bounded: it must never exceed the run's remaining `maxMs`
  budget, and it must be capped so a single decision cannot stall a run.
- `Retry-After` must be honored when the response supplies it.
- Errors the API does NOT describe as retriable — `401`, `422` — must stay
  terminal. A missing credential or a malformed question is a configuration
  error, and retrying it only delays the correct failure.
- The retry path must be observable: the run's history must record that a retry
  happened, so the cost of a degraded provider is visible in the metrics.

### R2 — Make the questions conform to the documented shapes (F2, F3)

- The `operation` Choice criteria must carry a real rubric for each operation
  kind, describing what the option does and what it does not do, so the options
  are separable from one another. `DONE`/`BLOCKED`/`WAIT` already do this.
- Each `${op}_target` head must state which operation it is for, in its own
  instruction. A shared instruction that refers to "the selected operation" is
  invalid because the heads are evaluated in parallel and cannot read the
  `operation` answer.
- The instruction and criteria may use the documented structured form (an object
  with the question in one field and its data in others) where that makes the
  head distinct.

### R3 — Use the target head's confidence (F4)

- The confidence of the target head that the executor actually acts on must be
  available to the decision, not validated and discarded.
- It must gate the run: a target selection the model is unsure about must not be
  executed as if it were certain.
- The gate must be independently configurable from the operation gate, because
  the two carry different risk: picking the wrong control is an action, whereas
  picking the wrong operation kind is usually caught earlier.
- The default must not silently make existing callers stricter or looser without
  evidence; the default and its effect must be validated against measurement.

### R4 — Make the fill helper a first-class, configurable dependency (F5)

- The fill helper's endpoint and model must move out of source and into the
  configuration surface, with the current values as defaults so existing users
  see no change.
- The helper must appear wherever the Jev providers appear: the provider guide
  the installer and doctor print, and the configuration reference.
- The helper must share the retry/backoff path from R1, so a rate-limited helper
  degrades the same way a rate-limited decision does.
- The helper remains a generation step outside TypeSafe's primitives. That is
  inherent — Choice/Score/Noul do not emit free text — and must be documented as
  such rather than presented as a TypeSafe capability.

### R5 — Low-priority conformance items (F6, F7)

- **F6**: evaluate whether a `${op}_target` head should offer an explicit
  no-match option, per the primitives guidance to add one when the list may not
  cover every input. `BLOCKED` is the current escape, so the change must be
  justified, not assumed.
- **F7**: evaluate whether `serializeForJev` should emit the node list as
  structured objects rather than flat lines, so `role`/`name`/`state`/`ref` are
  named fields per the state guidance. Token cost must be measured before
  adopting it.

### R6 — Re-measure and report proportionally

- Re-run the A/B measurement after R2/R3 land, using the existing harness, the
  unchanged criterion, and both arms treated identically.
- Report each finding's outcome against the evidence it actually has: a measured
  improvement where one exists, and an explicit "conformance only, no measured
  difference" where none does.
- Update the skill docs with the new configuration surface, the retry behavior,
  and the measurement result.

## Constraints

- **Safety bounds are not negotiable**: origin allowlist re-check, stale-decision
  discard, policy-bounded controls, host-side verification of DONE. A `fill`
  never auto-submits.
- **Do not weaken answer validation.** The existing strict schema checks in
  `readChoice` are stronger than the docs require; keep them.
- **Do not re-publish** the existing 3-action / 15-action numbers.
- **Comparable arms**: any flag applies to both arms.
- **Free models only** for testing/configuration.
- **Honest reporting**: no finding may be described as fixed-and-improved unless
  the measurement supports it.

## Acceptance Criteria

- [x] **AC1** A 429 or 529 response is retried with bounded exponential backoff
      and `Retry-After` honored; 401 and 422 stay terminal; a retry is visible in
      the run history.
- [x] **AC2** The `operation` criteria carry a rubric per operation kind, and each
      target head names its own operation instead of referring to an answer it
      cannot see.
- [x] **AC3** The acted-on target head's confidence is returned and gates the run,
      independently configurable from the operation gate.
- [x] **AC4** The fill helper's endpoint and model are configuration-driven with
      unchanged defaults, documented in the provider guide and the configuration
      reference, and share the retry path.
- [x] **AC5** F6 and F7 are decided with evidence: adopted with a measured
      justification, or rejected with the reason recorded.
- [x] **AC6** The A/B measurement is re-run under the unchanged criterion, and
      each finding is reported proportionally to what it actually shows.
- [x] **AC7** Docs updated: configuration surface, retry behavior, measurement
      result.
- [x] **AC8** No regression: `node --test tests/*.test.mjs` passes, the search and
      15-action fixtures still pass, and CI is green on both Node versions.
