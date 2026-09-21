# TypeSafe conformance audit — browser-with-typesafe

Audit of `skills/browser-with-typesafe` against TypeSafe's published documentation.
Every finding is grounded in a specific line of this repo or in a measured live
Jev response. Docs were read live (2026-09-22) from `https://docs.typesafe.ai`.

## Sources read

| Doc | Used for |
| --- | --- |
| `api.md` | request/response contract, question types, error table |
| `primitives.md` | question selection, criteria guidance, escape options |
| `primitives/choice.md` | Choice criteria as rubrics |
| `confidence.md` | probability vs confidence, gating, three-path pattern |
| `concepts/state.md` | state shape (string / object / array) |
| `concepts/how-to-build-with-system-one.md` | design rules, parallel/independent evaluation |
| `cookbooks/parallel_questions.md` | batching economics |
| `cookbooks/consistency_noul_cookbook.md` | keeping a cross-check visible |

## What already conforms

| # | Item | Evidence |
| --- | --- | --- |
| C1 | Endpoint and model match the API reference | `bridge/core.mjs:53` `https://api.typesafe.ai/v1/systemone`; `model: 'jev-latest'` |
| C2 | Request body is `{model, state, questions}` | `bridge/core.mjs:656` |
| C3 | Independent questions batched into ONE request | `bridge/core.mjs:639-652` — `operation` + `progress` + every target head |
| C4 | Noul used for the yes/no question, with `criteria.true/false` | `bridge/core.mjs:642-647` |
| C5 | Answer validation is stricter than the docs require | `readChoice` `bridge/core.mjs:555-577`: type, choice∈criteria, confidence∈[0,1], probability key set exactly equal to criteria, sum≈1, argmax matches |
| C6 | Confidence gating with a documented floor, and a refusal to lower it | `bridge/core.mjs:945`, `831-833`; `SKILL.md` "never lower `minConfidence` to force a pass" |
| C7 | Returned model id validated against a pattern | `bridge/core.mjs:706` |
| C8 | Token usage normalized | `normalizeUsage` `bridge/core.mjs:712` |
| C9 | Untrusted-content rule stated in the instructions | `INSTRUCTIONS` `bridge/core.mjs:92` |
| C10 | Payload history bounded so the request stops growing | `HISTORY_LIMIT = 10` `bridge/core.mjs:131` |
| C11 | The Noul cross-check is kept visible rather than made a hard gate | `bridge/core.mjs:963-968` |
| C12 | Provider is the user's choice; the key is never solicited, echoed, or logged | `bridge/core.mjs:683` `body.includes(key) → throw` |

## Findings

### F1 — 429/529 are terminal; no retry, no backoff (high)

**Doc:** `api.md` → "When you receive a `429 Too Many Requests` or `529 Overloaded`
response, retry the request with exponential backoff instead of retrying
immediately."

**Code:**
- `bridge/core.mjs:674` — `if (!response.ok) throw new Error(`${provider} HTTP ${response.status}`)`
- `bridge/core.mjs:900-903` — `canRetry` requires `/transport failure or timeout/.test(message)`

`"typesafe HTTP 429"` does not match that pattern, so a rate limit is recorded as
`decision_error` and the run hands back. There is no backoff anywhere in the
repo, and `grep -n "429\|529\|overload\|backoff"` over `bridge/` and `tests/`
returns nothing — the path has zero coverage.

**Impact:** a transient rate limit or overload becomes a hard workflow failure.
Corroborated in this session: the fill helper's free tier returned
`429 usage allocated quota exceeded` and destroyed a sub-agent's entire run.

### F2 — the `operation` Choice criteria carry no rubric (medium)

**Doc:** `choice.md` → "`criteria`: The answer options, as a map. Each key is an
option name and each value is a description of that option. … write descriptions
that separate the options from each other." `api.md` also permits `null` when an
option needs no detail.

**Code:** `bridge/core.mjs:628` — `operationCriteria[action.op] = action.op;`

The rubric slot restates the key (`{click: 'click', fill: 'fill'}`). `DONE`,
`BLOCKED`, and `WAIT` do carry real descriptions; only the operation kinds do not.

**Measured** (5 states × 2 variants × 4 trials, live Jev):

| State | current op conf | improved op conf | correctness |
| --- | --- | --- | --- |
| S1 control (easy) | 1.000 | 1.000 | 4/4 both |
| S2 similar targets | see probe | 1.000 | 4/4 both |
| S3 collapsed region | 0.850 | 0.930 | 4/4 both |
| S4 mixed ops | 0.992 | 0.998 | 4/4 both |
| S5 many targets | 0.887 | 0.895 | 4/4 both |

**Honest conclusion:** this is a specification deviation with a small calibration
effect. No correctness difference was demonstrable on any tested state. It is
worth fixing because the docs ask for it and the cost is zero, not because a
failure was observed.

### F3 — every target head shares one instruction that references an unseen answer (medium)

**Doc:** `how-to-build-with-system-one.md` → "Questions are evaluated
independently and in parallel. One primitive's result does not become hidden
context that changes another primitive's result." Also: "Several questions have
similar instructions. … Adding supplementary data can help make questions
distinct."

**Code:**
- `bridge/core.mjs:102` — `TARGET_RULES = 'Choose the exact target for the selected operation from the listed candidates; …'`
- `bridge/core.mjs:651` — the same string is attached to every `${op}_target` head

`click_target` and `fill_target` are evaluated in parallel and cannot read the
`operation` answer, so "the selected operation" is unknowable to each head; the
model can only infer its operation from its own criteria.

**Measured:** no correctness difference. A per-operation structured instruction
scored equal or slightly higher target confidence in some states.

### F4 — the target head's confidence is validated then discarded (medium)

**Doc:** `confidence.md` → "The answer tells you what; confidence tells you
whether to act." … "A confidence threshold is not one number."

**Code:** `readChoice` validates the head's `confidence`
(`bridge/core.mjs:562-565`), but `readTarget` returns only the action
(`bridge/core.mjs:581-586`), and `run()` gates on `decision.confidence` alone —
which is `operation.confidence` (`bridge/core.mjs:945`).

**Measured** (live Jev, 5 trials per state):

| State | operation conf | target conf | gate sees |
| --- | --- | --- | --- |
| A1 "Submit" vs "Submit application" | 0.996 | **0.810** | only the operation |
| A2 "Save" vs "Save draft" | 1.000 | 1.000 | — |
| A3 "Continue" wizard | 0.986 | 1.000 | — |
| A4 three similar text fields | 0.652 | 1.000 | — |
| A5 "Option A" vs "Option B" | **0.552** | 0.900 | operation (2/5 blocked) |
| A6 Settings/Account/Preferences | **0.510** | 0.784 | operation (4/5 blocked) |
| A7 Next/Continue/Proceed | 0.990 | 0.964 | — |

A1 shows the two confidences can diverge by 0.19 while the gate sees only the
higher one. But in the genuinely ambiguous states (A5, A6) the uncertainty
surfaced in the *operation* confidence and the existing gate caught it.

**Honest conclusion:** a documented signal is unused, and the divergence is real
and measurable, but at the current 0.55 floor no tested state would have changed
outcome had the target confidence been gated too. Fix it to use the signal, and
validate the new gate against measurement rather than assuming it helps.

### F5 — the fill helper sits outside the skill's own provider abstraction (medium)

**Code:** `bridge/core.mjs:127-128` — `FILL_ENDPOINT` and `FILL_MODEL` are
pinned in source.

**Doc:** `how-to-build-with-system-one.md` → "System One is type-safe by
construction. … it never has to recover a value from generated prose." The
helper does exactly that: `parseFillResponse` recovers a value from generated
JSON text.

The generation need is genuine — Jev's primitives are Choice/Score/Noul and none
of them emit free text, and the skill says so itself ("Jev is a selector — it
does not generate text"). The inconsistency is narrower than "uses a non-TypeSafe
model": the skill built `PROVIDERS`, `providerGuide()`, and
`references/configuration.md` for Jev, and the helper appears in none of them.
`grep -n "bifrost" references/*.md` returns nothing. The endpoint is not
switchable by the user and does not share the retry path.

### F6 — target heads have no escape option (low)

**Doc:** `primitives.md` → "add an `other` or `none of the above` option when the
list might not cover every input."

The `operation` question has `DONE`/`BLOCKED`/`WAIT`; a `${op}_target` head has
only its enumerated candidates. `BLOCKED` is the current escape, so this is a
completeness item rather than a defect.

### F7 — the `browser` state field is a flat string (low)

**Code:** `serializeForJev` `bridge/ir.mjs:270-279` emits
`[ref=e5] button "Search" (checked)` lines.

**Doc:** `concepts/state.md` → "Use an object for most requests so each part of
the state has a descriptive name and its relationships remain clear."

The top level already is structured (`{goal, browser, history}`,
`bridge/core.mjs:656`), and a flat rendering of an accessibility tree is a
defensible compact representation that keeps `ref` inline. Passing `ir.nodes` as
a structured array would name `role`/`name`/`state`/`ref` explicitly at a token
cost. Evaluate, do not assume it is an improvement.

## Reproducing the measurements

Throwaway probes (outside the repo, no repo pollution):

- `/tmp/ts-conformance-probe.mjs` — criteria rubric, single easy state
- `/tmp/ts-conformance-probe2.mjs` — criteria rubric + head instruction, 5 states
- `/tmp/ts-target-conf-probe.mjs` — operation vs target confidence, 7 states

Each reads the credential from `~/.config/browser-with-typesafe/config.json` and
never prints it. Run as `node <probe>.mjs <trials>`.

## P5 outcomes — decided by probe, not by default

### F7 (structured state) — REJECTED

Probe: `/tmp/ts-f7-state-probe.mjs`, 2 states × 2 variants × 5 trials, live Jev.
Variant A is the flat line-per-node string `serializeForJev` emits today; variant B
sends the same nodes as objects with named `ref`/`role`/`name`/`state` fields.
Both variants carried the same questions.

| State | Variant | mean input tokens | target correct | mean target conf |
| --- | --- | ---: | --- | ---: |
| small (3 nodes) | flat | 823 | 5/5 | 0.900 |
| small (3 nodes) | structured | 900 | 5/5 | 0.900 |
| medium (10 nodes) | flat | 895 | 5/5 | 1.000 |
| medium (10 nodes) | structured | 1138 | 5/5 | 1.000 |

Output tokens were identical (135) in all four cells.

**Decision: reject.** The structured form costs +9.4% input tokens on a 3-node page
and +27.2% on a 10-node page — a cost that grows with page size, which is exactly
where the skill already spends its budget — while producing no change in the picked
target or its confidence. The docs' preference for named fields is a general
guidance, not a rule that outweighs a measured, size-scaling cost with zero
measured benefit. The flat string keeps `ref` inline and the top-level state is
already the structured object `{goal, browser, history}` that the guidance asks for.

### F6 (target escape option) — REJECTED, and the probe validates P3 instead

Probe: `/tmp/ts-f6-none-probe.mjs`, 4 states × 2 variants × 5 trials, live Jev.
Variant A is today's shape (enumerated candidates only); variant B adds
`none: 'None of the listed controls is the one this step needs'`. Cases N1–N3 have
**no** correct candidate; C1 is a control where a candidate does fit.

| Case | Variant | picked `none` | mean target conf | wrong actions executed |
| --- | --- | ---: | ---: | ---: |
| N1 no settings control | candidates only | 0/5 | **0.176** | 5/5 |
| N1 no settings control | with `none` | 5/5 | 1.000 | 0/5 |
| N2 no download control | candidates only | 0/5 | **0.092** | 5/5 |
| N2 no download control | with `none` | 5/5 | 0.980 | 0/5 |
| N3 no password control | candidates only | 0/5 | **0.326** | 5/5 |
| N3 no password control | with `none` | 0/5 | 0.180 | 5/5 |
| C1 control fits | candidates only | 0/5 | 1.000 | — |
| C1 control fits | with `none` | 0/5 | 1.000 | — |

**Decision: reject the escape option.** Two facts drive it.

1. **The gate is a better no-match detector than the option.** In every no-fit case
   the model already reports its uncertainty *in the target confidence* — 0.176,
   0.092, 0.326 — all below the 0.55 floor. The P3 gate therefore blocks all three
   cases and executes nothing. The explicit `none` option blocks only two of three
   (N3 still picks a wrong control 5/5 when the candidates are semantically
   adjacent to the goal).
2. **The option is not free.** An extra criterion splits the probability mass on
   every decision, including the common case where a candidate does fit, and C1
   confirms that cost buys nothing there.

This is the strongest evidence in the task for P3: the discarded target confidence
(F4) was not a cosmetic omission — it was the signal that already separates "no
control fits" from "this control fits", and the run was acting against it.

**Caveat**: these numbers were taken with the pre-P2 head instruction. P2 changes
the head instruction to a per-operation structured form, so the absolute
confidences may move. The structural result — the model expresses a no-match state
in the target confidence, not in the picked option — is what the decision rests on,
and P6's live run re-observes it under the shipped shape.

## P6 — the A/B re-run is confounded and cannot attribute its result

Round 1, `--samples 3 --task search`, criterion unchanged:

| arm | turns | uncached | output | correct | wall_s | per_action_s |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| A | 8.0 | 24,225 | 1,579 | 3/3 | 118.8 | 29.71 |
| B | 21.7 | 82,236 | 6,198 | **1/3** | 363.7 | 90.93 |

The criterion (B ≤ 0.8 × A on tokens AND per-action time) is **not met** — B is
3.4× A on uncached tokens and 3.06× on per-action time. B's accuracy also fell from
the 2/3 recorded before this task. **The measurement cannot attribute that to the
P1–P5 changes**, for four measured reasons.

### 1. The fill helper cannot complete this fixture's first step — pre-existing

The fixture derives a run-specific query from the run id (`SEARCH_WORDS` in
`tests/fixtures/static-page.html:410`) and requires an exact match, while
`fillValue` receives only `{goal, field: {role, name}, recentActions}` and never
the page. Measured directly against a healthy endpoint, same model, same
instructions, varying only the goal:

| Goal | Latency | Content |
| --- | --- | --- |
| the fixture's real search goal | 31.2s, 72.4s, 41.7s | `{"text": ""}` — empty |
| `search for reports` | 2.6s, 2.5s, 1.7s | `{"text":"reports"}` |

Both outcomes fail the skill: an empty value is rejected by `parseFillResponse`,
and the latency exceeds the helper's 20s timeout. Four direct skill runs on the
fixture (bypassing the host model entirely) each ended `action_error` / `fill error`
at ~21s, after **1 decision and 0 executed actions** — the skill never reaches its
second step.

This is **not a regression**: `git diff` confirms `FILL_INSTRUCTIONS`, the 20s
timeout, and the model are unchanged by this task; only the endpoint and model
became configurable, with identical values.

### 2. The endpoint had a degradation window during the run

Direct samples of the fill endpoint during the investigation returned 25–90s
latency, empty content, and HTML error pages; a later sample of the same endpoint
returned **6/6 in 2.0–3.2s**. The A/B round ran inside the bad window.

### 3. Every arm B run hit the harness budget, not a natural end

All three arm B runs finished at wall 363.5 / 363.6 / 364.1s against the harness's
`--max-time 360` (`tests/e2e/cost-experiment.sh:230`). Arm B's completion is bounded
by the budget, so its accuracy reflects what fit inside 360s.

### 4. The arms are not symmetric with respect to the degraded dependency

Arm A completed 3/3 with zero errors and makes no fill-helper calls. Arm B depends
on the same free endpoint **twice** — host model and fill helper — so a degradation
window penalises it twice. That asymmetry comes from the fixture's design, not from
the code under test.

### P3 is exonerated by a click-only control

The target gate was the prime suspect for the accuracy drop. A direct run of the
**wizard** fixture — ten clicks, no fill, so the fill helper is not involved —
produced **10 decisions, 10 executed clicks, and zero `low_confidence`**. The new
gate did not fire on an unambiguous flow, so it does not explain arm B's failures.

### What this means

The criterion is not met and is reported as not met. What the round cannot do is
support a claim in either direction about the P1–P5 changes, because arm B never
got past its first mechanical action for reasons that predate them. A meaningful
re-run needs the fixture's seeded-value requirement to be satisfiable by the fill
helper's contract, or the fill step to be excluded from the measured flow.

### New finding (outside the confirmed scope)

**F8 — the fill helper's contract cannot satisfy a value the page reveals.** The
helper sees the goal and the field's role/name, never the page. Any flow whose
value is only discoverable from the page (this fixture seeds its query, row, and
two field values that way) makes the helper's `fill` unusable, and its 20s timeout
is shorter than the endpoint's observed latency under load (31–72s on the long
goal). Fixing this is a design decision — pass the page's prompt text into the
helper, raise/config the timeout, or keep the fill step out of measured flows — so
it is recorded here rather than changed unilaterally.
