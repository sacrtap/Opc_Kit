# Jev protocol audit — is the skill using the model correctly?

Date: 2026-09-20 · Host: omp · Model: `jev-latest` via `https://api.typesafe.ai/v1/systemone`

Question this document answers: the 3-action measurement showed the skill costing ~21% more than
driving the browser directly. Is that because the skill talks to Jev **incorrectly**, or because the
premise is wrong?

Answer: **the protocol is correct and Jev answers correctly. The requests are wasteful.** The cost is
what we put inside the request, not the endpoint, the schema, or the model.

Reproduce: `node ../../.trellis/tasks/09-20-jev-perf/research/jev-probe.mjs` from
`skills/browser-with-typesafe/`. Each call is one billed System One request.

## 1. Is the protocol conforming?

Field-by-field against both the reference skill (`wy-coliney/jev-browser-use`) and the official
example (`browser-use/jev-ultrafast`, `jev_ultrafast/model.py`):

| Aspect | Official | Ours | Verdict |
| --- | --- | --- | --- |
| endpoint | `https://api.typesafe.ai/v1/systemone` | same | conforming |
| auth | `Authorization: Bearer <key>` | same | conforming |
| body | `{model, state, questions}` | same | conforming |
| choice question | `{type:'choice', instructions, criteria:{id: description}}` | same | conforming |
| response validation | choice ∈ ids, `set(probabilities) == set(ids)`, Σp≈1, argmax match, finite in [0,1] | same, plus a model-id pattern check | conforming (stricter) |
| redirects | rejected | rejected | conforming |
| credential leak check | body must not contain the key | same | conforming |

Conclusion: **the request we send is a valid System One request.** Nothing about the schema needs
fixing to make Jev work.

## 2. Does Jev answer correctly?

Probe section A, clean state, empty history:

```
choice=a1   confidence=0.89   probabilities sum to 1   schema valid
```

`a1` was the correct next action (scroll inside the report panel, after expanding). The answer was
not merely schema-valid — it was the right action, with a confidence consistent with the skill's
`minConfidence = 0.55` gate. **Jev responds correctly.**

A second, sharper signal came from the history sweep: fed a history asserting that the goal's steps
were already done, Jev answered `BLOCKED` with confidence 0.36–0.46 rather than inventing another
action. That is the documented behaviour ("DONE only when the requested final result is visibly
present") being followed. The model is reading the history we send — which is exactly why sending it
carelessly is costly.

## 3. What the requests cost

### History is unbounded (defect)

Same decision, same state, only the history length varies:

| History entries | Input tokens | Output tokens | Latency ms |
| --- | ---: | ---: | ---: |
| 0 | 1,525 | 73 | 1,291 |
| 5 | 2,069 | 74 | 905 |
| 10 | 2,614 | 74 | 1,024 |
| 20 | 3,714 | 74 | 1,959 |
| 40 | 5,914 | 74 | 600 |
| 80 | 10,314 | 74 | 563 |

Input tokens grow linearly and reach **6.8× the baseline by step 80** for an identical decision.
`bridge/core.mjs` passes the full `history` array to `decide()` and never trims it; every entry also
carries `provider`, `model`, `usage`, `confidence` and `apiMs`, none of which the model needs in order
to choose the next action.

The official runtime caps at `history[-10:]` and projects each entry to `{action, kind, text,
page_changed}` — four fields, bounded count.

Latency in this table is **not** monotonic in history length (1,291 ms at 0, 563 ms at 80). Treat
latency as noisy at this sample size; the token growth is the robust, structural finding.

### State size drives cost too

| State | Input tokens |
| --- | ---: |
| 2.7 KB (72 nodes) | 1,525 |
| 18.2 KB (312 nodes) | 6,935 |

`serializeForJev` emits every node on every request with no presentation bound. The guard
`MAX_SNAPSHOT_CHARS = 24000` rejects an oversized snapshot outright, but it does not bound what a
large-but-legal page costs per step.

### Latency is well above the model's demonstrated capability

| | Median per-request latency |
| --- | ---: |
| Official `jev-ultrafast` on a live Google Flights task | **178 ms** |
| Our probe (fixture page, 8 requests) | ~965 ms |

The official run made 17 Jev requests for a full flight search in 7.073 s, with 90,558 input tokens
across all requests (~5.3k/request). Our per-request tokens at high history exceed that, and our
observed latency is roughly 5× theirs. The gap is not the model.

### Element state is dropped before the model sees it

`parseAriaSnapshot` extracts a role and a name and discards a state suffix:

```
- checkbox "Accept terms" [ref=e9]: checked
        ↓
{ role: 'checkbox', name: 'Accept terms' }      // 'checked' is gone
```

The official element table carries `role / value / checked / selected / expanded`. Without current
state the model cannot obey the official rule *"Do not toggle a checkbox, switch, or radio already in
the requested state"* — it cannot see the state. This is an accuracy defect, not a cost defect.

## 4. What the official runtime does that we do not

Taken from `browser-use/jev-ultrafast` (`docs/design.md`, `jev_ultrafast/model.py`,
`jev_ultrafast/questions.py`):

1. **One request, many questions.** The `questions` map holds an `operation` choice plus one
   `<operation>_target` choice per available operation, all evaluated against the same state in one
   call. TypeSafe's own documentation states every question in a request is evaluated **in parallel
   and in isolation** and that *"adding questions barely changes the response time"*.
2. **Bounded, projected history.** `history[-10:]`, four fields, sent as `recent_actions`.
3. **An indexed element table.** One index per node even when it supports several operations; criteria
   carry the element's current value and checked/selected/expanded state.
4. **Tuned rule text.** A long, specific `NEXT_ACTION` rule set encoding failure modes: do not repeat a
   satisfied step; fill required fields before submitting; a populated field is not an applied search;
   do not re-toggle a control already in the requested state; a recent WAIT is not evidence of loading;
   prefer a useful visible control over WAIT; DONE requires visible evidence that all requirements are
   satisfied.
5. **Per-call latency accounting.** `latency_ms` recorded on every request and a median reported.
6. **Re-observation waits ~2 animation frames or 50 ms** after an interaction, so the next decision is
   not taken against a page that has not settled.

## 5. What we adopted, and what we rejected

Adopted (see `design.md`): bounded projected history; control state preserved in the IR; a second
parallel `noul` question as an independent progress check; the operational rules, with all
text-entry rules removed; per-decision latency accounting surfaced in metrics.

Rejected deliberately:

- **The operation/target split.** The official design splits operation from target to avoid a
  *serial* second call for target resolution. We pre-enumerate concrete actions locally and make
  exactly one call per step, so we never pay the cost that split removes. Adopting it would add
  response surface without the benefit. Revisit only if measurement shows target selection is the
  accuracy bottleneck.
- **A text-generation helper.** The official runtime uses a small LLM for `TYPE_TEXT`. This skill
  performs no text entry by construction, and that guarantee is a safety property, not an oversight.
  Adding a helper to win a text-heavy benchmark would trade the property away.

## 6. Limits of this audit

- 8 requests in the latency sample, one fixture, one host, one region. Latency variance across those
  8 was 563–1,959 ms, so no latency claim tighter than "roughly a second, and above the model's
  demonstrated 178 ms" is supported.
- The history sweep measures **token growth**, which is structural and reproducible; the latency
  column in that table should not be read as a curve.
- The fixture is 72 nodes. Real pages are larger, which makes the state-size finding a lower bound on
  the problem, not an upper one.
- Correctness of Jev's answers is sampled, not established: one clean decision plus one coherent
  refusal. This audit does not claim a general accuracy rate.
