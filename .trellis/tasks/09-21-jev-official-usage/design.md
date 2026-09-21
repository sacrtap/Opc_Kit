# Design — fill helper + multi-question decision

## Evidence the design responds to

Cross-site research (`madewithjev.com/categories/agents-and-browsers`, 60 builds) plus the
official `browser-use/jev-ultrafast` converge on one architecture, stated most clearly by the
WebMCP benchmark build (49/49 tasks, ~112× cheaper than the comparison):

1. **Jev selects, it does not generate.** "Jev can't generate arbitrary text, which you need for
   tool arguments." Every build that needs a search term, field value, or message text pairs Jev
   with a small fast LLM that writes the argument.
2. **Jev is strong at explicit action selection, weak at multi-step navigation.** The WebMCP build
   measured Jev driving DOM controls directly at 25/49; adding an explicit tool layer moved it to
   49/49. TypeSafe's own docs acknowledge weaker accuracy on questions needing several reasoning
   steps.
3. **One request, many questions.** The official request is `{operation}` plus one target head per
   available operation, all evaluated in parallel; adding questions barely changes response time.

The current skill uses Jev the wrong way: it forbids text entry (so it cannot do the flows the
official architecture is built for), it sends one flat choice instead of the operation/target
split, and the wizard fixture measured it at its weakest point (10-step DOM navigation).

## Changes

### C1 — Fill action + text helper (R1)

Add a `fill` operation alongside click/scroll/press/reload.

**Action space.** A `fill` candidate is built for every IR node whose role is in `TEXT_ROLES`
(textbox/textarea/combobox/searchbox). Its criteria entry carries the field's role, name, and any
state, so Jev can see *which field* — it is never asked to produce the value.

**Value generation.** When Jev selects `fill` on a field, the executor calls a small OpenAI-compatible
model (`bifrost/sensenova/deepseek-v4-flash`) with:

```json
{
  "goal": "<the run's goal>",
  "field": { "role": "...", "name": "...", "label": "..." },
  "recent_actions": [ "..." ]
}
```

and instructs it to return exactly `{"text": "<value>"}`. The response is parsed strictly:
non-object, missing/blank/non-string `text`, or `text.length > 2000` fails the action and the run
hands back — the executor never guesses a value and never reuses a stale one after a successful
mutation.

**Config.** The fill helper reads `fillModel` from the same config file the Jev provider uses.
Defaults are recorded in `providerGuide()`; `loadConfig()` returns `fillModel` (never a key). The
credential for the fill provider is a separate env-referenced key in the same config path.

**Adapter contract.** Add `type(ref, text)` to the shared contract (`requireAdapter`):
- omp: `await (await tab.ref(ref)).fill(text)`
- playwright: `await page.locator(...).fill(text)` via the existing handle mapping
- codex: type through the Computer Use contract; contract-tested only (no runtime here)

**Safety.** `fill` is offered only for `TEXT_ROLES`. `denyNames` / `requireHostNames` still apply to
the field's name. A fill action never presses Enter and never submits: it types a value and stops;
the host owns any consequential submit/send/publish step, exactly as before.

### C2 — Multi-question decision (R2)

Replace the flat `questions.next` choice with:

```js
questions = {
  operation: { type: 'choice', criteria: { click, fill, scroll, press, reload, DONE, BLOCKED, WAIT },
               instructions: INSTRUCTIONS },
  // one head per operation kind that is actually available:
  click_target: { type: 'choice', criteria: { <id>: '<element>', … }, instructions: TARGET_RULES },
  fill_target:  { type: 'choice', criteria: { <id>: '<field>', … },  instructions: TARGET_RULES },
}
```

Only operation kinds with at least one candidate get a target head (no empty criteria dicts — the
provider rejects them). `DONE`/`BLOCKED`/`WAIT` have no target head.

**Response consumption.** Read `operation` first; validate its choice against the operation
criteria. Then read and validate only the head matching the selected operation. Other heads are
ignored entirely — an unused head's answer is never validated (it cannot fail the request), matching
the official "unused target heads cannot cause an action" rule. The selected operation's own head
must be present and valid; a missing/invalid one fails the request (callers retry per existing
policy).

**Backward shape.** The projected `history` (already capped at 10, already projected) is unchanged.
`progress` (the `noul` second opinion added earlier) stays as a third question in the same request.

### C3 — Search+filter+form fixture (R3)

Extend `tests/fixtures/static-page.html` with a new flow (a fourth `expected` value, so the existing
3/15/wizard reports stay byte-identical):

1. a search box; the page only accepts a query matching the run-seeded expected query
2. correct query renders N similar result rows; only one matches the prompt
3. selecting the right row renders a form with one or two fields
4. the fields must be filled with run-seeded expected values
5. the page reports `ok` only when query + selection + field values all match

The flow is state-dependent (later controls exist only after earlier steps) but exercises the
fill+select split that Jev is built for, not 10 steps of pure click navigation.

### C4 — Measurement (R4)

Reuse `tests/e2e/cost-experiment.sh` with a new `--task search` selector. Arm B's prompt tells the
host to use the skill; arm A's tells it to drive the browser directly. Both arms use the free host
model; the fill helper uses the free `bifrost` model. Record wall time, per-action time, turns,
tokens, and (B) Jev latency + fill usage. Criterion unchanged: B ≤ 0.8×A on tokens AND per-action
time, reproduced across two consecutive rounds.

## What is deliberately NOT changed

- **Safety bounds**: origin allowlist, stale-decision discard, policy-bounded controls, host-side
  verification of DONE. `fill` never auto-submits.
- **History cap/projection and IR control state** from the previous task stay.
- **Published 3-action / 15-action numbers** stay.

## Rollout / rollback

Each change is independently revertible:

| Change | Rollback |
| --- | --- |
| C1 fill helper | remove `fill` from `discoverActions`, `execute`, `requireAdapter`, adapters |
| C2 multi-question | restore the flat `questions.next` builder |
| C3 fixture | remove the new `expected` branch + section |
| C4 harness | remove the `search` selector |

Any change that does not survive measurement is reverted and the report says so (AC7).
