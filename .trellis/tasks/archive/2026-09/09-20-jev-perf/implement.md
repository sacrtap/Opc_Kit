# Implement — ordered plan

Each step states what changes, how it is validated, and where the rollback point is. Steps 1–2 are
evidence-gathering and must not be skipped: they are what makes the rest defensible.

Working tree: `skills/browser-with-typesafe/` (plus the docs named in step 9). Host: omp. Run all
commands from `skills/browser-with-typesafe/` unless stated otherwise.

## 0 — Baseline before touching anything

```sh
node --test tests/*.test.mjs          # expect: pass 71, fail 0
node tests/e2e/playwright.e2e.mjs     # expect: status needs_verification, passed true, 4,760/211 tokens
```

Record both. Any later failure is compared against these, not against memory.

## 1 — Persist the audit (R1, AC1)

Write `research/jev-protocol-audit.md` containing:

- the field-by-field table from `design.md` (endpoint/auth/model, body shape, response validation,
  history, questions-per-request, instruction text, element state, latency accounting)
- the raw probe numbers: input tokens by history length (0/5/10/20/40/80), state-size scaling,
  per-request latency, and the clean-decision answer (`a1`, 0.89)
- the exact probe command and the fixture it used, so a reader can re-run it

Also commit the probe as `research/jev-probe.mjs` (not under `tests/`, since it costs money and is
not a regression test). It must read the key from the standard config path and never print it.

**Validation:** re-run the probe from the repo copy and confirm it reproduces the table.
**Rollback:** none needed; additive.

## 2 — C1: cap and project history (R2, AC2)

`bridge/core.mjs`:

1. Add `const HISTORY_LIMIT = 10;` and `function projectHistory(history)` per `design.md` C1.
2. At the `decide(...)` call site inside `run()`, pass `history: projectHistory(history)`.
3. Leave every internal use of `history` untouched (metrics, `result()`, `createSession`).

**Validation:**
- `node --test tests/*.test.mjs` — existing history/metrics assertions must still pass
- new unit test: a run of ≥ 12 steps passes at most `HISTORY_LIMIT` entries to the model, asserted on
  the captured request body, and the internal `outcome.history` still holds every step
- re-run the probe's history sweep against the projected payload and record the new token curve

**Rollback point:** `HISTORY_LIMIT` / the projection call.

## 3 — C2: preserve control state in the IR

`bridge/aria-snapshot.mjs`, `bridge/ir.mjs`:

1. Parser: capture a state suffix (the value after `:`) when it is one of the known state words;
   return it as `state`, leaving `name` as today. Unknown values keep today's behaviour exactly.
2. `createIR`: carry `state` through validation; keep rejecting malformed nodes.
3. `serializeForJev`: render the state in parentheses after the name.
4. `fingerprint`: include `state`.

**Validation:**
- unit tests for the parser: `checkbox "Accept terms": checked` keeps the name **and** yields
  `state: 'checked'`; a plain `button "Expand"` yields no state
- fingerprint test both directions: identical page ⇒ identical fingerprint; only-state-changed page ⇒
  different fingerprint
- `node --test tests/*.test.mjs` green, including the existing stale-state tests

**Rollback point:** the parser's state branch, the serialization fragment, the fingerprint field.

## 4 — C3: the independent progress question (R3)

`bridge/core.mjs` in `decide()`:

1. Add `questions.progress` (type `noul`, per `design.md` C3).
2. Validate: a missing or non-numeric `progress` answer **must not** throw. Read it defensively.
3. Return it as `progress` on the decision object.
4. In `run()`: when `choice === 'DONE'` and `progress < 0.5`, record `progressDisagreement: true` on
   the history entry. Behaviour (return `needs_verification`) is unchanged.

**Validation:**
- unit test: a response with `questions.progress` absent still returns a valid decision
- unit test: `DONE` + low progress yields `needs_verification` with `progressDisagreement`
- unit test: the request body contains both `next` and `progress`

**Rollback point:** remove `questions.progress`; nothing else depends on it.

## 5 — C4: instruction rules

`bridge/core.mjs`: replace `INSTRUCTIONS` with the adapted rule set from `design.md` C4.

**Validation:** the rule set must contain no text-entry or form-submission rule (grep the const for
`type`, `autocomplete`, `submit`, `fill` and confirm any hit is intentional); existing tests do not
pin the text, so the suite must stay green unchanged.

## 6 — C5: latency summary

`bridge/core.mjs`: build `metrics.decisionLatencyMs = { count, min, p50, max, total }` from the
history entries that carry `apiMs`.

**Validation:** unit test that a run of known `apiMs` values yields the expected `p50`/`min`/`max`;
plus a `createSession` accumulation test if the session rolls metrics up.

## 7 — C6: 15-action fixture (R4, AC3)

1. `tests/fixtures/static-page.html`: add the five-section flow per `design.md` C6 — 15 distinct
   mechanical actions, click + scroll only, with many similar targets so target selection is the
   thing being measured.
2. Generalise the self-report hook to assert the full expected 15-action end state and report a
   boolean plus the observed action sequence.
3. `tests/e2e/task.mjs` (or a sibling 15-action task): the goal text for both arms, unchanged between
   arms except for the skill mention.
4. `tests/e2e/cost-experiment.sh`: accept a task selector, and record per arm: wall time, host turns,
   token classes, cost, and — for arm B — the skill's own `decisionLatencyMs`.

**Validation (before any paid run):**
- serve the fixture and drive it with Playwright only, asserting the self-report reaches the expected
  end state from a scripted 15-action sequence. This proves the fixture is solvable and the report
  hook is correct **without** spending model tokens.
- confirm the fixture is unsolvable by fewer than 15 actions (the counter must reject a short run).

**Rollback point:** the fixture section and the harness flags are additive.

## 8 — Run the measurement (AC4)

```sh
node tests/e2e/experiment-server.mjs 8791 &
./tests/e2e/cost-experiment.sh 3 --task 15-action
```

Freeze the harness between arms; apply no flag to one arm only. Capture per-run artifacts. If a run
fails its self-report it is **excluded and reported**, not silently retried.

## 9 — Report and update docs (R5, AC5)

Report for both arms: total wall time, **time per mechanical action**, per-step model latency
distribution, host turns, uncached/cache-read/output tokens, billed cost, and correctness. State the
n= and the variance, and what was not measured.

Update: `skills/browser-with-typesafe/README.md`, `browser-with-typesafe-guide.md`,
`browser-with-typesafe-guide-CN.md`, root `README.md`, `README-CN.md`, `CHANGELOG.md`, and the version
badges + `.omp-plugin/marketplace.json` if the version moves. `SKILL.md` gains any new user-visible
behaviour (the progress cross-check) and keeps its "do not claim an unmeasured saving" clause.

## 10 — Verify and close (AC6, AC7)

```sh
node --test tests/*.test.mjs
node tests/e2e/playwright.e2e.mjs
bash -n tests/e2e/cost-experiment.sh
git status --porcelain        # expect clean after commit
```

- Revert any change that did not survive measurement, and say so in the report (AC7).
- Dispatch `trellis-check` for an independent pass over the diff before committing.
- Commit; update the PR body with the 15-action result, replacing the 3-action headline only if the
  15-action numbers supersede it.

## Open risk register

| Risk | Signal | Response |
| --- | --- | --- |
| 15-action arm B still loses | measurement | publish it; the premise is then wrong for short *and* medium flows and the docs say so |
| C2 fingerprint change destabilises the stale guard | failing stale-state tests | revert C2 only |
| `progress` question confuses the model on the main choice | accuracy drop vs baseline | revert C3 only |
| omp spawn from the harness regresses | runner hang | the shell runner is already the verified path; do not reintroduce a node spawn of `omp` |
