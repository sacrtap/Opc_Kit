# browser-with-typesafe: reach Jev's latency/token expectations

## Goal

The previous measurement (3-action flow) showed the skill costing ~21% **more** than driving the
browser directly. That contradicts the premise the skill is sold on and the performance the Jev
model is capable of. Either the skill is being invoked inefficiently, or the premise is wrong.

This task settles it: audit how the skill actually talks to Jev, fix what the audit finds, measure a
15-action flow with per-step model latency as well as tokens for both arms, and publish the result.

## Context

Measured evidence already gathered (probe against the live TypeSafe endpoint, fixture state):

| Observation | Value |
| --- | --- |
| Jev answers a clean state correctly | `choice=a1`, `confidence=0.89`, valid schema |
| Request input tokens by history length 0 → 80 | 1,525 → 10,314 (**6.8×**) |
| Request input tokens, small vs 18KB state | 1,525 → 6,935 |
| Observed per-request latency | ~563–1,959 ms, median ~965 ms |
| Official `browser-use/jev-ultrafast` median Jev latency | **178 ms** |
| Official request shape | multi-question `{operation}` + `{<op>_target}` per operation, one request |
| Official history projection | `history[-10:]`, fields `{action, kind, text, page_changed}` |
| Our request shape | **one** question; **full** unbounded `history`; flat serialized state |

The protocol is not the problem: our request body, endpoint, and response validation match both the
reference skill and the official example. The problem is what we put **inside** the request.

## Requirements

### R1 — Audit and document the Jev invocation

- Prove on the live endpoint that Jev answers our questions correctly (valid choice, probabilities
  summing to 1, confidence in range, no schema violations).
- Compare our request against the official `browser-use/jev-ultrafast` request field by field, and
  record every difference that plausibly affects latency, tokens, or accuracy.
- Persist the findings as a research document in the task's `research/` directory, with the raw
  numbers, so the conclusions are checkable rather than asserted.

### R2 — Bound the per-request payload

- The prompt sent to Jev **must not grow with the number of steps already taken**. History must be
  capped and projected to only the fields the model needs; today it grows without limit, costing
  6.8× the input tokens by step 80 for an identical decision.
- The state sent to Jev must be bounded by a documented, enforced limit, and the limit must not be a
  silent truncation that hides actionable controls from the model.

### R3 — Adopt the model's intended usage pattern

- Exploit the documented property that questions in one request are evaluated **in parallel** and
  that adding questions barely changes response time. Where a decision is naturally two questions
  (which operation; which target), ask both in **one** request rather than deriving the target
  locally or making a second call.
- Replace the thin instruction string with the rules that make mechanical flows accurate — the
  official rule set encodes hard-won cases (do not re-toggle a control already in the wanted state,
  a populated search field is not an applied search, a recent WAIT is not evidence of loading).
  Any rule adopted must be consistent with this skill's safety bounds, in particular that this skill
  performs **no text entry at all**.

### R4 — Measure a 15-action flow on both arms

- Add a fixture whose task requires **15 distinct mechanical actions**.
- Run both arms: **A** = host agent drives the browser itself, skill not discoverable; **B** = host
  agent uses the skill. Same goal, same fixture, same host model.
- For **each** arm record: total wall time, **per-step model response latency**, host turns,
  uncached input / cache-read / output tokens, and billed cost.
- Correctness must come from the fixture's own report, never from either agent's claim.

### R5 — Report honestly, including the latency dimension

- The docs must present the 15-action result for **both** latency and tokens, with the per-step
  latency distribution (not just a mean), and the conditions under which the result holds.
- If the 15-action result still does not favour the skill, that is the published result. Do not
  re-scope the fixture or the metric until the skill wins.

## Constraints

- **No text entry.** This skill enters no text by construction; a text-generation helper (as the
  official runtime uses) is out of scope and must not be added to chase a benchmark.
- **Safety bounds are not negotiable.** Origin allowlist re-check, stale-decision discard, policy-
  bounded controls, host-side verification of DONE all stay.
- **No suppression.** Fixes must address the cause in the request payload, not special-case a
  measurement or loosen a guard to make numbers look better.
- **Comparable arms.** Any flag change must be applied to both arms; never tune one arm only.
- Host is omp; the Codex adapter remains contract-tested only (no Codex CUA runtime here).

## Acceptance Criteria

- [x] **AC1** A documented live-endpoint probe shows Jev answering correctly and records per-request
      latency and tokens; the research doc contains the raw numbers and the field-by-field diff
      against the official example.
- [x] **AC2** Per-request input tokens are bounded: the final request of a long run costs no more
      history than the configured cap, demonstrated by a measurement across many history lengths.
- [x] **AC3** A 15-action fixture exists; both arms complete it; the fixture's independent
      self-report confirms success for each run that is counted.
- [x] **AC4** The harness emits, per arm, total wall time, per-step model latency, host turns,
      token classes, and billed cost — and those numbers appear in the report.
- [x] **AC5** Docs updated: skill README, both guides (EN/CN), both root READMEs, CHANGELOG — with
      the 15-action measurement, per-step latency, conditions, and any remaining limitation stated
      plainly.
- [x] **AC6** No regression: the existing unit/integration suite passes and the end-to-end run still
      completes with an independent pass.
- [x] **AC7** Any optimization that does not survive measurement is reverted rather than kept.
