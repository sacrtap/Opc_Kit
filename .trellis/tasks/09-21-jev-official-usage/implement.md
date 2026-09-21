# Implement — ordered plan

Each step names files, how it is validated, and its rollback point. Host: omp.

Working tree: `skills/browser-with-typesafe/` plus docs in step 8. Run from
`skills/browser-with-typesafe/` unless stated.

## 0 — Baseline

```sh
node --test tests/*.test.mjs          # expect pass 78, fail 0
node tests/e2e/fifteen-action.e2e.mjs # 6/6
node tests/e2e/playwright.e2e.mjs     # needs_verification, passed true
```

## 1 — C1: fill action + text helper (R1)

Files: `bridge/core.mjs`, `bridge/ir.mjs`, `bridge/adapters/omp.mjs`,
`bridge/adapters/playwright.mjs`, `bridge/adapters/codex.mjs`,
`tests/core.test.mjs`, `tests/helpers.mjs`, `tests/fixtures/config.json`.

1. `ir.mjs`: export a `fillableNodes(ir)` helper (or reuse `matchByName`/role sets)
   that returns `TEXT_ROLES` nodes with a `ref`. Do not change `createIR`/`fingerprint`.
2. `core.mjs`: add `discoverFill` to `discoverActions` — one `{ op:'fill', ref, name,
   description }` per fillable node when `policy.fill` is true. Extend `validateControl`
   to accept `{op:'fill', name}` and `availableActions` to resolve it against
   `TEXT_ROLES` (a named field resolving to 0 or >1 nodes is dropped, never guessed).
3. `core.mjs`: add `fillValue({ goal, field, recentActions, configPath })` that calls the
   fill model (OpenAI-compatible chat/completions, `bifrost/sensenova/deepseek-v4-flash`,
   `response_format: {type:'json_object'}`) and returns the strict-parsed `text` or throws
   `fill error` (callers hand back). Credential read from the same config path (a separate
   key), never logged.
4. `core.mjs`: in `run()`, after the engine decides a `fill` action, call `fillValue`
   BEFORE executing; record the value on the history entry; a helper failure is a handback
   (`action_error`), never a guessed value.
5. `execute()`: `else if (action.op === 'fill') await adapter.type(action.ref, action.text)`.
6. Adapters: omp `type(ref,text)` → `await (await tab.ref(ref)).fill(text)`;
   playwright `type(ref,text)` → `await (page.locator(ref)).fill(text)` (map ref per existing
   adapter); codex `type` through the contract (contract-tested).
7. `requireAdapter` adds `type`.

Validate: `node --test tests/core.test.mjs` — new tests: fill candidate discovered only for
TEXT_ROLES; named fill resolves uniquely or drops; `fillValue` parses strict JSON and rejects
blank/over-long/non-string; a bad fill hands back rather than guessing; execute routes `fill`
to `adapter.type`.

Rollback: remove the `fill` branches from each file.

## 2 — C2: multi-question decision (R2)

File: `bridge/core.mjs`, `tests/core.test.mjs`.

1. In `decide()`, replace the flat `next` question with `operation` +
   per-operation target heads (`click_target`, `fill_target`); only heads for operations
   that have candidates. Keep `progress` (noul) as a third question.
2. Add `readChoice(answers, id, criteria)` and `readTarget(answers, op)` helpers with the
   defensive-read contract from design C2: read `operation` first; validate only the selected
   operation's head; ignore other heads; the selected head must be valid or the request fails.
3. Build the returned action from the selected operation + selected target head.

Validate: `node --test tests/core.test.mjs` — new tests: request body has `operation` + both
target heads; a response whose unselected head is malformed still yields a valid decision; a
missing/invalid selected head fails; target heads absent for DONE/BLOCKED/WAIT.

Rollback: restore the flat builder.

## 3 — C3: search+filter+form fixture (R3)

Files: `tests/fixtures/static-page.html`, `tests/e2e/task.mjs`,
`tests/e2e/fifteen-action.e2e.mjs` (or a sibling `search.e2e.mjs`).

1. Add the search flow as a new `expected` value (e.g. `12`): search box (accepts the
   run-seeded expected query) → results render → correct row → form (one/two fields with
   run-seeded expected values) → `ok` only when all three match.
2. Reuse the existing report hook; the new branch must leave the 3/15/wizard reports
   byte-identical.
3. `task.mjs`: add `GOAL_SEARCH` (both arms share it, differing only in the skill mention).

Validate (no model spend): a scripted Playwright run completes and reports `ok`; a short run
reports not-ok; `node --test tests/*.test.mjs` and 15-action/3-action E2E still pass.

## 4 — C4: harness `--task search` (R4)

File: `tests/e2e/cost-experiment.sh`.

Add a `search` case reading `GOAL_SEARCH` from `task.mjs`, `EXPECTED` = the search-flow action
count, host model pinned to the free model, fill model read from config. Keep the process-level
timeout and the token/cost/latency summary.

Validate: `bash -n tests/e2e/cost-experiment.sh`.

## 5 — Run Round 1 (paid Jev + free host/fill)

```sh
node tests/e2e/experiment-server.mjs 8791 &
./tests/e2e/cost-experiment.sh --samples 3 --task search
```

Record per-arm means and spread. A run whose self-report is not ok is excluded, not retried.

## 6 — Evaluate criterion, iterate up to the budget

Criterion: B ≤ 0.8×A on tokens AND per-action time, reproduced across two consecutive rounds.
If not met, inspect the losing arm's transcript, fix the cause (not the metric), re-run. Stop at
the round cap or token budget. Record every round in `research/`.

## 7 — AC7 gate

Revert any change that did not survive measurement; say so in the report.

## 8 — Docs (R5, AC5)

`SKILL.md`, skill `README.md`, `browser-with-typesafe-guide.md`, `-CN.md`, root `README.md`,
`README-CN.md`, `CHANGELOG.md`, version bump, marketplace.json. Published 3/15 numbers stay.

## 9 — Verify and close (AC6)

```sh
node --test tests/*.test.mjs
node tests/e2e/fifteen-action.e2e.mjs
node tests/e2e/playwright.e2e.mjs
bash -n tests/e2e/cost-experiment.sh
git status --porcelain
```

Dispatch `trellis-check` over the diff, then commit and update the PR body.
