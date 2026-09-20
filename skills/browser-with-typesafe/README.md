# browser-with-typesafe

**Jev clicks. The host thinks and verifies.**

A host-agnostic browser skill: the host model plans, enters text, judges visuals,
and verifies the result, while [TypeSafe Jev](https://docs.typesafe.ai/introduction)
chooses each next mechanical action — navigate, click, toggle, scroll, page — so
a repetitive UI flow does not cost one host-model turn per click.

Derived from the architecture of [`wy-coliney/jev-browser-use`](https://github.com/wy-coliney/jev-browser-use)
(MIT), with the browser backend extracted behind an adapter layer so the same
decision engine serves every host.

## Why an adapter layer

The reference skill binds directly to one host's tab API. Here, `bridge/core.mjs`
never imports a browser API: it calls one five-method adapter contract, and each
host converts its own accessibility tree into a shared IR.

```
host model ──plans/verifies──┐
                             ▼
                    bridge/core.mjs  ──► TypeSafe / OpenRouter (Jev decision)
                             │
                    bridge/ir.mjs (shared accessibility IR)
                             │
        ┌────────────────────┼────────────────────┐
   adapters/omp.mjs   adapters/codex.mjs   adapters/playwright.mjs
   (browser prelude)  (Computer Use tab)   (Playwright / CDP page)
```

## Host support

| Host | Adapter | Handle it supplies |
| --- | --- | --- |
| omp | `omp` | the tab from the Eval `browser` prelude |
| Codex (Computer Use) | `codex` | the tab from `cua_repl` |
| Cursor, Claude Code, Workbuddy, Zcode, other Playwright/CDP hosts | `playwright` | a Playwright `page` |

`detectAdapter({ tab })` / `detectAdapter({ page })` picks the adapter from real
capabilities and fails loudly when nothing matches.

## Install

```sh
node install.mjs                                   # link into ~/.agents/skills + write config template
node install.mjs --provider openrouter             # choose the provider (typesafe | openrouter)
node install.mjs --target agents-project           # or ./.agents/skills
node install.mjs --target claude-user              # ~/.claude/skills
node install.mjs --target /abs/path --copy         # copy instead of link
node install.mjs --uninstall
```

The installer writes `~/.config/browser-with-typesafe/config.json` with an empty
`apiKey` and **never receives, prompts for, or stores a key** — you fill that
field in yourself, then verify:

```sh
node scripts/doctor.mjs   # config · permissions · provider/model · key · endpoint
```

`doctor` prints one line per check, never prints the credential, and exits `0`
only when the configuration is actually usable. Existing configuration is always
preserved. See `references/configuration.md` for choosing between the TypeSafe
official endpoint and OpenRouter Decisions.

## What it costs: a measured A/B

The premise of this skill is that a mechanical flow stops costing one host-model turn per click.
That deserves a measurement rather than an assertion, so the same 3-action task (expand → scroll →
collapse) was run on the shared fixture, three samples per arm:

- **Arm A** — the host agent drives the browser itself; the skill is not discoverable from its working directory
- **Arm B** — the host agent uses this skill

Both arms were measured with the host runtime's own token accounting, and correctness was read from
the page's self-report, not from either agent's claim.

| | Arm A (no skill) | Arm B (with skill) |
| --- | ---: | ---: |
| Host turns | 7.7 | 10.3 |
| Uncached input tokens | 42,507 | 41,015 |
| Cache-read tokens | 201,259 | 354,347 |
| Output tokens | 1,360 | 3,674 |
| **Billed host cost** | **$0.015592** | **$0.018820** |
| Task completed correctly | 3/3 | 3/3 |

Individual runs, so you can judge the spread rather than trust a mean:

| Run | Turns | Uncached | Cache-read | Output | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 9 | 63,628 | 225,792 | 1,714 | $0.022500 |
| A2 | 8 | 32,211 | 221,568 | 1,452 | $0.012735 |
| A3 | 6 | 31,683 | 156,416 | 915 | $0.011541 |
| B1 | 11 | 41,011 | 397,440 | 3,542 | $0.018938 |
| B2 | 8 | 41,404 | 277,760 | 3,862 | $0.018722 |
| B3 | 12 | 40,629 | 387,840 | 3,619 | $0.018799 |

**On a short, scriptable flow this skill costs more in every sample** — about 21% on the means — and it
is not less accurate: both arms completed 3/3. The result is published instead of a flattering number.

Note the shape of the two distributions: arm B is stable ($0.0187–$0.0189, ±0.4%) while arm A swings by
2× ($0.0115–$0.0225). The skill trades a better best case for a tighter worst case.

Three samples per arm on one 3-action fixture, so treat the percentage as indicative, not precise.


The overhead wins at this size because the host can already batch three mechanical actions into a
couple of `eval` calls, so it never needed one turn per click; arm B meanwhile pays to read this
document and write the wiring code, and its longer context inflates cache reads.

### Where it does pay off

- **Long flows, or flows whose next step is not knowable up front.** A host can only batch actions it
  already knows. When each step depends on freshly observed state it must read the page again —
  measured at 571–1,711 tokens per observation here.
- **Expensive host models.** Decision work moves to Jev, billed at **input only: $0.042 per million
  tokens, output free**. Measured decision cost for the flow above: **4,751 input / 211 output
  tokens ≈ $0.0002**, versus host tokens at whatever your agent's model costs.
- **Safety and auditability**, which the A/B does not price: origin allowlist re-checked every step,
  no text-entry action by construction, policy-bounded controls, and a mandatory host verification
  that never lets `needs_verification` count as a pass.

The break-even flow length is **not** measured; the numbers above are for three actions. Treat the
payoff as a hypothesis to check on your own flows — the instrumentation makes that cheap.

### Measure your own

```js
const outcome = await session.run(task);
outcome.sessionMetrics.inputTokens;   // 4751 for the run above
outcome.sessionMetrics.outputTokens;  // 211
outcome.history[0].usage;             // { inputTokens: 571, outputTokens: 49 }
```

Reproduce the A/B:

```sh
node tests/e2e/experiment-server.mjs 8791 &
./tests/e2e/cost-experiment.sh 3
```

## Verification matrix

Checks are identical across backends: the same fixture page
(`tests/fixtures/static-page.html`), the same task (`tests/e2e/task.mjs`), and
the same host-side assertions — including that the panel was **actually
scrolled**, which a click-only run could not satisfy.

| Backend | Verification performed | Result |
| --- | --- | --- |
| omp (`browser` prelude) | **Real end-to-end** — Jev decision loop against headless omp Chromium; host verified fresh state | **Pass** — 5/5 checks, exit clean, 3 executed actions / 4 decisions, ~1.9 s wall, ~1.7 s Jev API |
| Playwright 1.59 (headless Chrome) | **Real end-to-end** — same task; process exits non-zero on failure | **Pass** — 5/5 checks, exit 0, 3 executed actions / 4 decisions, ~2.3 s wall, ~2.0 s Jev API |
| Codex (`cua_repl`) | **Contract tests only** — mock tab handle plus a full decision-loop regression (`tests/codex-adapter.test.mjs`) | **Not covered on a real host** — no Codex Computer Use runtime in this environment |
| Configuration + doctor | **Real** — `node scripts/doctor.mjs` against the live credential, plus a fresh-user install into an empty `HOME` | **Pass** — `READY`, exit 0, endpoint HTTP 200; an empty key reports `NOT READY (apiKey)` and a wrong key `NOT READY (endpoint)` with HTTP 401, both exit 1 |

Both live runs produced the same sequence — `Click Expand section` →
`Scroll down 2 pages within Evaluation report` → `Click Collapse section` →
`DONE` — with the panel scroll counter at `1` afterwards.

### Coverage notes

| Item | Status | Note |
| --- | --- | --- |
| Codex Computer Use on a real host | **Not covered** | No Codex CUA runtime in this environment; the adapter is covered by contract tests and a full decision-loop regression only. |
| omp skill discovery from `.agents/skills/` | **Confirmed** | `skill://browser-with-typesafe` resolves in a fresh omp session; discovery is startup-scoped, so a new session is required after installing. |

### Automated tests

```sh
npm test                     # 69 unit, contract, installer, doctor, and architecture tests
npm run test:e2e:playwright  # real end-to-end, exits 0 on success
npm run doctor               # configuration check, exits 0 only when usable
```

The omp run is executed inside omp's Eval runtime (it needs the host's `browser`
prelude); `tests/e2e/omp.e2e.mjs` documents the call shape.

## Safety model

- `allowedOrigins` is re-checked before every model call and every action.
- A decision taken on stale state is discarded, never executed.
- Text entry is impossible by construction — there is no such action.
- Duplicate labels are never auto-clicked, and ambiguous controls hand back.
- `denyNames` / `requireHostNames` keep consequential controls with the host.
- `needs_verification` is never a pass; the host must check fresh state.
- Snapshot text is escaped so page content cannot forge snapshot structure.

## Layout

```
SKILL.md                     host-agnostic instructions (Step 0 configures, Steps 1-4 run)
bridge/core.mjs              decision engine (zero dependencies)
bridge/ir.mjs                shared accessibility IR and safety bounds
bridge/aria-snapshot.mjs     shared ARIA-snapshot parser
bridge/index.mjs             detectAdapter() / adapterFor() / re-exports
bridge/adapters/{omp,codex,playwright}.mjs
references/adapter-contract.md
references/configuration.md  provider choice, key setup, troubleshooting
scripts/doctor.mjs           configuration check; prints no credential
install.mjs
tests/                       unit, contract, and end-to-end runs
```

Licensed MIT. This skill's architecture derives from
[`wy-coliney/jev-browser-use`](https://github.com/wy-coliney/jev-browser-use); that upstream
attribution is preserved in `LICENSE-THIRD-PARTY`. The repository-wide license is in the
repository root `LICENSE`.
