# Implement — TypeSafe API conformance

Ordered checklist. Each phase is one commit with its own tests, so any phase can
be reverted alone. Run every command from `skills/browser-with-typesafe` unless
stated otherwise.

## P1 — Retry the errors the API documents as retriable (F1)

- [ ] **P1.1** Add `RETRIABLE_STATUS`, `RETRY_BASE_MS`, `RETRY_MAX_MS`, the
      `ProviderRequestError` class, `retriableStatus()`, `parseRetryAfter()`, and
      the exported `retryDelayMs()` to `bridge/core.mjs`.
- [ ] **P1.2** In `decide()`, replace the two throws that classify an HTTP failure
      and the transport failure with `ProviderRequestError`, keeping every message
      byte-identical. Leave the schema, JSON, and credential throws non-retriable.
- [ ] **P1.3** In `run()`, widen `canRetry` to `error.retryable === true ||
      /transport failure or timeout/.test(message)`, and sleep
      `min(retryDelayMs(attempt, error.retryAfterMs), RETRY_MAX_MS, remaining - 1000)`
      before retrying. Keep the `decision_retry` history reason and the existing
      metrics count.
- [ ] **P1.4** Tests in `tests/core.test.mjs`:
      - `retryDelayMs` bounds: attempt 1 ∈ [250,500), attempt 2 ∈ [500,750),
        attempt 3 ∈ [1000,1250), cap at 4000, and `Retry-After` overrides jitter.
      - a 429 response is retried once and the retry succeeds → the run completes
        instead of returning `decision_error`.
      - a 529 response is retried.
      - a 401 and a 422 are NOT retried (one request, `decision_error`).
      - a 429 whose retry also fails ends in `decision_error`, not a hang.
      - `parseRetryAfter` handles delta-seconds, an HTTP-date, and garbage.
- [ ] **P1.5** Validation:
      ```
      node --test tests/core.test.mjs
      node --test tests/*.test.mjs
      ```
      **Gate**: the new tests fail against the pre-P1 code (prove they test the
      fix), and the full suite stays at 0 failures.
- [ ] **P1.6** Commit: `fix(browser-with-typesafe): retry 429/529 with bounded backoff`.

**Rollback point**: revert P1.6; the rest of the task is independent of it.

## P2 — Question shapes (F2, F3)

- [ ] **P2.1** Add `OPERATION_RUBRICS` covering all five operation kinds
      (`click`, `fill`, `scroll`, `press`, `reload`) and use it in the
      `operationCriteria` assignment with an `?? action.op` fallback.
- [ ] **P2.2** Replace the shared `TARGET_RULES` constant with a per-head
      structured instruction that names its own operation.
- [ ] **P2.3** Tests: every operation kind present in a decision's action space has
      a non-empty rubric that is not equal to its own key; every target head's
      instruction names its own operation; no target head's instruction refers to
      "the selected operation".
- [ ] **P2.4** Validation: `node --test tests/*.test.mjs`
      **Gate**: 0 failures; a request-shape assertion pins the new criteria and
      instruction shapes so a regression is caught by a test, not by review.
- [ ] **P2.5** Commit: `fix(browser-with-typesafe): give the decision questions the documented shapes`.

**Rollback point**: revert P2.5. Independent of P1.

## P3 — Use the target head's confidence (F4)

- [ ] **P3.1** `readTarget` returns `{ action, confidence }`; `decide()` returns
      `targetConfidence`.
- [ ] **P3.2** `run()` gains `minTargetConfidence` (default `minConfidence`,
      validated over the same range) and gates on it after the operation gate,
      returning `low_confidence` when the acted-on head is uncertain.
- [ ] **P3.3** Tests: an ambiguous target head below the gate returns
      `low_confidence` and executes nothing; a confident target head still
      executes; `targetConfidence` is `null` for `DONE`/`BLOCKED`/`WAIT` (no head);
      an out-of-range `minTargetConfidence` is refused.
- [ ] **P3.4** Validation: `node --test tests/*.test.mjs`
      **Gate**: 0 failures.
- [ ] **P3.5** Commit: `feat(browser-with-typesafe): gate the run on the acted-on target's confidence`.

**Rollback point**: revert P3.5. Note that `minTargetConfidence` is validated over
the same `[0.55, 1]` range as `minConfidence` — the skill's existing stance is
that neither threshold may be lowered to force a pass — so the gate cannot be
switched off by setting the default to `0`; reverting the commit is the rollback.

## P4 — Fill helper as a first-class dependency (F5)

- [ ] **P4.1** Export `FILL_DEFAULT_ENDPOINT` / `FILL_DEFAULT_MODEL`; make
      `fillValue` accept `endpoint`, `model`, and `maxRetries` with those defaults.
- [ ] **P4.2** `loadConfig()` returns `fillEndpoint` / `fillModel`; `run()` accepts
      and forwards them.
- [ ] **P4.3** Route the helper's non-2xx handling through `retriableStatus` +
      `retryDelayMs` so a rate-limited helper retries like a rate-limited decision.
- [ ] **P4.4** Add the helper to `providerGuide()` and document both keys plus the
      `BIFROST_API_KEY` credential in `references/configuration.md`.
- [ ] **P4.5** Tests: a config-supplied endpoint is used; the default is used when
      absent; the helper's 429 is retried once; a helper 401 is not retried.
- [ ] **P4.6** Validation: `node --test tests/*.test.mjs` and
      `node scripts/doctor.mjs` (must still print no credential).
      **Gate**: 0 failures; doctor output unchanged except for the new helper line.
- [ ] **P4.7** Commit: `refactor(browser-with-typesafe): make the fill helper a configurable dependency`.

**Rollback point**: revert P4.7. Independent of P1–P3.

## P5 — Low-priority items, decided by evidence (F6, F7)

- [ ] **P5.1** F6: probe a target-head `none` option against the audit's ambiguity
      states (A1, A5, A6) and compare picks and confidence with the current shape.
- [ ] **P5.2** F7: probe a structured `serializeForJev` against the flat string on
      the same states, comparing `usage.input_tokens` and pick accuracy.
- [ ] **P5.3** Adopt each only if the probe supports it; otherwise record the
      rejection and the numbers. Write the outcome into
      `research/typesafe-conformance-audit.md`.
- [ ] **P5.4** Commit (only if something was adopted):
      `feat(browser-with-typesafe): adopt the measured question/state improvements`.

**Rollback point**: nothing is committed if both probes reject, which is an
acceptable and expected outcome for two low-priority items.

## P6 — Re-measure and report (R6)

- [ ] **P6.1** Re-run the A/B measurement with the unchanged criterion:
      ```
      ./tests/e2e/cost-experiment.sh --samples 3 --task search
      ```
      Both arms identical except the skill mention, free host model, correctness
      from the fixture's own report.
- [ ] **P6.2** Repeat for a second consecutive round; the criterion is only met if
      both rounds agree (B ≤ 0.8 × A on tokens AND time per action).
- [ ] **P6.3** Compare against the pre-change baseline recorded in the previous
      task, and state per finding what the evidence supports: a measured change,
      or "conformance only, no measured difference".
- [ ] **P6.4** Regression sweep:
      ```
      node --test tests/*.test.mjs
      node tests/e2e/search.e2e.mjs
      node tests/e2e/fifteen-action.e2e.mjs
      ```
- [ ] **P6.5** Update `SKILL.md`, `README.md`, both guides, and `CHANGELOG.md`
      with the retry behaviour, the new configuration keys, and the measurement
      result.
- [ ] **P6.6** Commit: `docs(browser-with-typesafe): document retry, fill config, and the measurement`.

## P7 — Spec, CI, and wrap-up

- [ ] **P7.1** Capture the reusable lessons in `.trellis/spec/backend/quality-guidelines.md`:
      a retriable HTTP status that is classified as terminal is a silent
      availability bug, and a signal that is validated but never consumed is
      indistinguishable from one that was never read.
- [ ] **P7.2** Push and confirm CI is green on both Node 22 and Node 24
      (`gh run list --branch feat/browser-with-typesafe --limit 3`).
- [ ] **P7.3** Archive the task: `python3 ./.trellis/scripts/task.py archive typesafe-conformance`.

## Review gates

| Gate | After | Requirement |
| --- | --- | --- |
| G1 | P1 | New retry tests fail on pre-P1 code and pass after; 401/422 provably not retried |
| G2 | P2, P3 | Question shapes pinned by tests; target gate proven to block and to allow |
| G3 | P4 | Existing config file still works unchanged; doctor prints no credential |
| G4 | P5 | Each low-priority item has a recorded adopt/reject with its numbers |
| G5 | P6 | Measurement re-run under the unchanged criterion; per-finding claims proportional to evidence |
| G6 | P7 | CI green on both Node versions; suite at 0 failures |
