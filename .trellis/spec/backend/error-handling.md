# Error Handling

> How errors are handled in this project.

---

## Overview

Errors in this repo are ordinary `Error` objects with stable message strings.
Message text is a public contract: tests match on it, and callers switch on it.
**A message string, once shipped, is never reworded** — add a field to the error
object instead.

The one exception is a provider request that carries retry intent, which uses
`ProviderRequestError` (see below).

---

## Scenario: Classifying a Provider HTTP Failure As Retriable

### 1. Scope / Trigger

Trigger: any code that calls an external HTTP API and decides whether to retry.
The retry decision is a **contract with the provider's published error table**, not
a local judgement — getting it wrong is a silent availability bug in one direction
(terminal-on-retriable) or a denial-of-service bug in the other
(retrying a permanent failure).

### 2. Signatures

```js
// A thrown error that carries machine-readable retry intent.
class ProviderRequestError extends Error {
  constructor(message, { retryable, retryAfterMs = null })
  // .retryable      boolean       may this request be retried?
  // .retryAfterMs   number | null server-supplied delay, when the server sent one
}

// Pure, exported, testable without sleeping.
retryDelayMs(attempt, retryAfterMs = null) -> number   // ms
```

### 3. Contracts

| Condition | `retryable` | message |
| --- | --- | --- |
| `fetch` throws, or the abort signal fires | `true` | `<provider> transport failure or timeout` |
| HTTP 429 or 529 | `true` (+ `retryAfterMs`) | `<provider> HTTP <status>` |
| Any other non-2xx (401, 422, …) | `false` | `<provider> HTTP <status>` |
| Unparseable response body | `false` | `Invalid <provider> JSON` |
| Answer fails schema validation | `false` | `Invalid <provider> decision schema` |
| Missing or empty credential | `false` | the credential message |

- The retriable set comes from the provider's own documentation. For TypeSafe it is
  `429` and `529`, stated in `https://docs.typesafe.ai/api.md`.
- `Retry-After` accepts delta-seconds and an HTTP-date; anything unparseable yields
  `null` and the local backoff applies.
- Only `retryDelayMs` is exported; the status predicate and the header parser stay
  internal, so the retriable set has exactly one definition.

### 4. Validation & Error Matrix

- backoff delay → `min(retryDelayMs(...), RETRY_MAX_MS, remainingBudget - 1000)`,
  clamped at `>= 0`. The backoff can never consume the whole budget.
- retry gate → `retryable === true && retriesUsed < maxRetries && remaining >= 1000`.
- `maxRetries` has a hard cap; a caller cannot configure an unbounded loop.
- Jitter lives only inside `retryDelayMs`, so tests assert bounds rather than exact
  values, and a server-supplied `Retry-After` bypasses jitter entirely.

### 5. Good/Base/Bad Cases

- **Good**: a 429 is retried once after a bounded delay and the run completes.
- **Base**: a 401 is terminal — one request, immediate failure, no delay.
- **Bad**: a 429 is thrown as a plain `Error`, so the run reports a hard failure for
  a condition the provider explicitly documents as transient.

### 6. Tests Required

- `retryDelayMs` bounds across attempts, the cap, and `Retry-After` overriding jitter.
- A 429 is retried once and the retry succeeds → the run completes.
- A 529 is retried.
- A 401 and a 422 are NOT retried — assert **exactly one** request was made.
- A 429 whose retry also fails ends in a terminal error, not a hang.
- Assertion point for the linkage: neutralizing the classification must make these
  tests fail. A retry test that passes with the classification disabled is testing
  nothing.

### 7. Wrong vs Correct

#### Wrong

```js
if (!response.ok) throw new Error(`${provider} HTTP ${response.status}`);
// Every non-2xx is terminal, so a 429 — documented as retriable — becomes a
// hard workflow failure. The retry predicate then has to pattern-match the
// message string, which silently excludes the statuses that need it most.
```

#### Correct

```js
if (!response.ok) {
  const retryable = retriableStatus(response.status);
  throw new ProviderRequestError(`${provider} HTTP ${response.status}`, {
    retryable,
    retryAfterMs: retryable ? parseRetryAfter(response.headers?.get?.('Retry-After')) : null,
  });
}
// The message string is unchanged, so anything matching on text still works;
// the retry decision is carried as a field the caller reads directly.
```

---

## Error Types

- `Error` — every existing failure. Message text is a stable contract.
- `ProviderRequestError extends Error` — an external HTTP call, carrying
  `retryable` and `retryAfterMs`.

---

## Error Handling Patterns

- Prefer a **field** over a message pattern for control flow. A regex over an error
  message breaks the moment the message is edited, and it silently mis-classifies
  anything it does not match.
- Keep a provider's retriable-status set in one named constant next to the endpoint
  it belongs to, and cite the provider doc in the comment.
- Bound every retry by the caller's remaining budget, not only by a retry count.

---

## API Error Responses

N/A — this repo is a client library, not a server.

---

## Common Mistakes

### Terminal-on-retriable

**Symptom**: A workflow fails immediately with a provider error that the provider's
own docs describe as transient.

**Cause**: The non-2xx branch throws one undifferentiated error, so the retry
predicate cannot tell a rate limit from an authentication failure.

**Fix**: Classify the status against the provider's error table and carry the
decision as a field.

**Prevention**: Write the retry test first, then confirm it **fails** when the
classification is neutralized. That check is what distinguishes a real retry test
from one that asserts the mock's own behaviour.
