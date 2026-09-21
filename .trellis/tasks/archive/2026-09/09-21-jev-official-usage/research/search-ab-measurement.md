# Search+filter+form A/B — adopting Jev's official 3-layer usage

Method: search fixture (`expected=4`: type a run-seeded query, select the run-seeded row, fill two
run-seeded form fields), 3 samples per arm, host model free (`bifrost/deepseek-v4-pro`, cost 0) for
BOTH arms, correctness from the fixture's own self-report. Jev (typesafe/jev-latest) is the skill's
decision provider; the fill value comes from a free `bifrost/deepseek-v4-flash` helper.

## Round 1 — invalid (both arms 0/3)

Both arms scored 0/3. Root cause for arm B: SKILL.md was still 0.2.0, which documents
`policy: { click: true, ... }` with no `fill` and states "this skill performs no text entry". The
host followed that block, so the engine never discovered fill candidates and a flow whose first step
is typing a query could not progress. Arm A also failed 0/3, but its runs were cut short by the
harness's 280s wrapper (the flow legitimately needs ~250-360s), so its failures were partly
measurement artefact.

Fixes: SKILL.md → 0.3.0 (documents the fill helper, `policy.fill: true`, and the
"Jev selects / small LLM fills / host verifies" split); harness `--max-time` 240→360 and wrapper
280→400 (identical for both arms).

## Round 2 — valid, and the criterion is NOT met

| arm | turns | uncached | output | tokens (uncached+output) | correct | wall | per action |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 9.0 | 28,059 | 1,240 | **29,299** | **3/3** | 210.7 s | **52.68 s** |
| B | 14.3 | 44,322 | 4,858 | **49,180** | 2/3 | 358.1 s | **89.52 s** |

- tokens: B / A = **1.68×** (criterion needs ≤ 0.8×) — not met.
- time per action: B / A = **1.70×** (criterion needs ≤ 0.8×) — not met.
- correctness: A 3/3, B 2/3 (B1 excluded by its own report) — not met.

Arm B's Jev decisions were fast: 10 decisions, **p50 379 ms** (307–512 ms), worst 768 ms. The model
is not the bottleneck.

## Why B still loses with the official design in place

The 3-layer split works — arm B completes a search+filter+form flow that the pre-fill skill could
not attempt at all (BS1 smoke: `{status:"complete", actions:4, ok:true}`). What it does not do is
beat a host that drives the browser itself, because:

1. **More host turns, not fewer.** B 14.3 vs A 9.0. The host must read SKILL.md, write the
   `createAutoSession` + `session.run` wiring, run it, then verify — the engine loops internally, but
   the host's own turn count does not drop below the direct-drive path on a 4-action flow.
2. **A fixed per-session integration cost.** Reading the skill and writing the wiring is paid every
   session and has no counterpart in arm A.
3. **Fill helper round trips.** Two fills per run, each a ~3.5 s network call, add latency the direct
   path does not pay.

## What this means

On a short flow (4 mechanical actions) with a free host model, adopting the official 3-layer design
adds capability without changing the economics: the skill is now *able* to do search/form flows, but
it is not *cheaper* than driving the browser directly. The earlier 15-action result said the same
thing at a larger flow size; the fill work does not reverse it.

Nothing is reverted: the fill helper, multi-question request, search fixture, and harness are real,
tested capabilities (90 unit/integration tests, search fixture 7/7, 15-action 6/6, 3-action E2E).
What is *not* claimed is a token or time win, because the measurement does not show one.
