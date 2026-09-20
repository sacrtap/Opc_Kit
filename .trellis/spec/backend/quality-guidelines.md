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
