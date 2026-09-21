# Wizard (state-dependent flow) measurement — rounds 3-5

The wizard fixture makes each next step depend on freshly rendered state: a 10-step
wizard whose target word is seeded from the run id, with the next step's buttons
existing only after the current step is answered. This is the flow the skill is
designed for (the earlier fixtures were fully scriptable, so arm A could batch).

Host model: free `bifrost/sensenova/deepseek-v4-pro` (cost 0) for BOTH arms,
per the user constraint that only free models are tested/configured. Jev
(typesafe/jev-latest) is the skill's decision provider and is paid.

Method per round: 3 samples per arm, correctness from the fixture's own
self-report, tokens from the host runtime's own accounting (uncached input +
output; $ cost is 0 for both arms so the criterion is tokens, not dollars).

## Round 3 — after root-cause fixes, before harness timeout fix

Fixes in place: SKILL.md quick-start corrected (allowedOrigins must be a FULL
origin, not a bare hostname; policy gained `click: true`), checkState error
message made actionable, wizard page cleaned to ~29 nodes.

| arm | turns | uncached+output | per_action | correct |
| --- | ---: | ---: | ---: | ---: |
| A | 9.3 | 26,883 | 19.99 s | **1/3** |
| B | 6.3 | 32,561 | **11.24 s** | **3/3** |

Arm A failed 2/3 (its host used fragile `waitForSelector("text=...")` logic and
timed out); its failing samples are cheap (fewer tokens), so the A baseline is
pulled DOWN by failure, making B's token ratio look worse than a fair
success-only comparison would. B won decisively on time (0.56×) and accuracy
(3/3 vs 1/3) but the token criterion (≤0.8×) was not met (1.21×).

## Round 4 — same command, no code change (reproduction attempt)

| arm | turns | uncached+output | per_action | correct |
| --- | ---: | ---: | ---: | ---: |
| A | 7.0 | 14,035 | 12.16 s | 3/3 |
| B | 5.3 | 22,687 | 18.78 s | **2/3** |

Not reproduced. B3's host read the skill then ended after ONE turn with zero
eval calls (uncached 1,607, output 82) — a free-model variance failure, not a
skill failure. B2 also drifted (10 turns). Round 4's B (3/3, time 0.56×) and
Round 5's B (2/3, time 1.54×) bracket the same code; host-model variance
dominates the end-to-end result.

## What the rounds establish

- The skill's real defects were fixed and measurably so: B's host turns fell
  from 19.3 (Round 1, pre-fix) to ~5-7 (Rounds 4-5), and Jev's own latency
  stayed fast (p50 287-372 ms across all rounds).
- A free host model's orchestration behaviour is the dominant variance source:
  the same SKILL.md and the same prompt produce a 5-turn clean run, a 10-turn
  exploration, or a 1-turn abandonment.
- The skill's fixed integration cost (the host must read SKILL.md and write the
  wiring code every session) is real, and on a free model it is not eliminated
  by the payload fixes. The ≥20% improvement on BOTH tokens and time per action,
  reproduced across two consecutive rounds, was NOT achieved.
- The wizard fixture, harness (incl. process-level timeout), and all fixes are
  kept: they are real defect fixes, not measurement tuning. The published
  3-action and 15-action numbers were not changed.
