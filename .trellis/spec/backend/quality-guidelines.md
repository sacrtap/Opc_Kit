# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Gotcha: Unterminated Block Comment In A Shared Module

**Problem**: A `/**` block comment that is never closed swallows everything after it until the next
`*/`. If the swallowed region contains `export` statements, the module still parses (`node --check`
passes) but the runtime linker does not see those exports.

**Symptom**: Every importer fails with a *misleading* error naming the export, not the comment:

```
SyntaxError: The requested module './ir.mjs' does not provide an export named 'serializeForJev'
```

With `node --test tests/*.test.mjs`, each test FILE reports as a single failed test, so one missing
`*/` in one shared module turned 6 test files into failures while 15 unrelated tests still passed —
which reads like a widespread breakage rather than a one-character edit error.

**Prevention**:
- After editing a file with JSDoc, confirm the export is visible to the *runtime*, not just to grep:
  `node -e "import('./module.mjs').then(m => console.log(Object.keys(m)))"`
- `node --check` is necessary but **not sufficient** — it validates syntax, not export linkage.
- When many test files fail at once, suspect one shared module before suspecting the tests.

**Real example**: a mid-edit `bridge/ir.mjs` lost the `*/` before `serializeForJev`; `grep` still
found `export function serializeForJev`, but node did not export it.

---

## Gotcha: Source-Scanning Guards Match Prose

**Problem**: Architecture guards that scan source text for host-API references use loose patterns
like `page\.` or `tab\.`. A prose sentence that happens to end with the word followed by a full stop
("...the current state of the page.") trips the guard.

**Symptom**: The guard fails on a comment or a model-facing instruction string, and the failure looks
like an architecture violation.

**Prevention**: Require an identifier after the dot, so the pattern means *member access*:

```js
// BAD — matches "...state of the page."
const forbidden = /tab\.|page\./;
// GOOD — matches tab.click(...), page.goto(...)
const forbidden = /tab\.\w|page\.\w/;
```

Reword the prose instead only if the pattern cannot be tightened without losing real coverage.

**Real example**: adding an instruction line ending in "state of the page." failed
`tests/architecture.test.mjs` until the pattern required an identifier.

---

## Gotcha: A Measurement Arm That Reads A Doc Must Have The Current Doc

**Problem**: When an A/B measurement has one arm that reads a documentation file (a SKILL.md, a
README, an agent prompt) to learn how to invoke a feature, that document is *part of the measured
system*. Shipping the code change without the doc update makes that arm test the previous design.

**Symptom**: The doc-reading arm fails every run for a reason that looks like model incompetence —
e.g. it never enables the new capability, so a flow that requires it cannot progress — while the
control arm behaves normally.

**Prevention**:
- Order the work: **doc first, then measure**. Treat the user-facing doc as a code artifact for the
  arm that reads it, not as a trailing write-up.
- Before measuring, grep the doc for the capability you just added (`grep -n "<flag>\|<action>"
  SKILL.md`). If it is absent, the arm cannot use it.
- When an arm fails every run, read that arm's transcript for which doc it read and what block it
  copied — before blaming the model.

**Real example**: the `fill` helper landed in `bridge/` while `SKILL.md` still documented
`policy: { click: true }` and stated "this skill performs no text entry". The skill arm copied that
block, never enabled fill, and failed 0/3 on a search flow. Fixing the doc first made the same arm
pass (`{status:"complete", actions:4, ok:true}`).

---

## Gotcha: Networked Helpers Must Be Mocked In Tests

**Problem**: A helper that calls an external API (a model endpoint, a webhook) makes the test suite
depend on that API's availability and quota. A test that calls it for real will pass locally and fail
in CI, or fail the whole agent run when the provider throttles.

**Symptom**: A sub-agent dies with a provider error (`429 ... quota exceeded`, `rpm exhausted`) and
produces **no** work at all, because the failure happened while running a test.

**Prevention**:
- Split the helper: a **pure** parse/validate function (directly unit-tested) plus a **thin transport
  wrapper** (never unit-tested against the network).
- Mock `globalThis.fetch` in every test that reaches the transport, and restore it in a `finally`.
- Assert on the request the helper *would* send, not on a live response.
- Read provider credentials from the environment and never echo them — including inside error
  messages, where a raw response can leak a key.

**Real example**: a fill helper's first test round made real calls to the model provider until it hit
`429 rpm exhausted`; the sub-agent exited 1 with zero file changes. The retry split
`parseFillResponse` (pure) from the transport and mocked `globalThis.fetch`; it landed cleanly.

---

## Gotcha: A Signal That Is Validated But Never Consumed

**Problem**: Validation and consumption are different code paths, and a field can
pass the first and never reach the second. `readChoice` checked that a target
head's `confidence` was a finite number in `[0, 1]` — so the value was *read* — and
`readTarget` then returned only the action, so the confidence influenced nothing.
The run gated on the *operation* question's confidence alone.

**Symptom**: The system acts on a judgement the model has already reported as
uncertain, and the failure looks like model error rather than a wiring gap.

**Prevention**:
- After adding validation for a field, grep for the field name at the decision
  site. If it appears only inside the validator, nothing consumes it.
- Treat "validated but unused" as a defect, not as harmless strictness: the
  validator makes the field look handled, which is why it survives review.
- Ask what the field would change if it were consumed, and design a probe that
  distinguishes "would have changed the outcome" from "would not".

**Real example**: the `browser-with-typesafe` target head's confidence was validated
and discarded. A probe on states where **no** candidate control fit the goal showed
the model reporting target confidence `0.176`, `0.092`, and `0.326` — every one below
the existing `0.55` floor — while still being forced to return a candidate, so the
run executed a wrong control 5/5 times in all three cases. Gating on the discarded
value blocks all three; an explicit "none of these" option added to the criteria
blocks only two of the three. The unused signal was the better detector, and the
field's presence in the validator is what kept it invisible.

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
