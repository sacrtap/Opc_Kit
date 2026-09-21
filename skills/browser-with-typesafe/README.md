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

## What it costs: measured on a 15-action flow

The premise of this skill is that a mechanical flow stops costing one host-model turn per click. We
measured it on a 15-action flow, three samples per arm, both arms driven by the same host model with
the same goal, and correctness read from the page's own report rather than either agent's claim:

- **Arm A** — the host agent drives the browser itself; the skill is not discoverable from its cwd
- **Arm B** — the host agent uses this skill

| | Arm A (no skill) | Arm B (with skill) |
| --- | ---: | ---: |
| Host turns | 14.3 | 29.0 |
| Uncached input tokens | 47,206 | 65,029 |
| Cache-read tokens | 481,237 | 1,339,520 |
| Output tokens | 6,727 | 10,301 |
| **Billed host cost** | **$0.025122** | **$0.039907** |
| Wall time | 96.7 s | 163.5 s |
| **Time per mechanical action** | **6.45 s** | **10.90 s** |
| Task completed correctly | 3/3 | 3/3 |

**On this flow the skill cost 58.9% more and took 69% longer per action, at equal accuracy.**

Per-run spread, so you can judge the variance rather than trust a mean:

| Run | Turns | Uncached | Cache-read | Output | Cost | Wall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 12 | 38,279 | 421,504 | 11,468 | $0.027774 | 107.2 s |
| A2 | 22 | 42,888 | 769,536 | 5,514 | $0.024100 | 100.5 s |
| A3 | 9 | 60,451 | 252,672 | 3,200 | $0.023491 | 82.4 s |
| B1 | 27 | 51,026 | 1,204,224 | 9,354 | $0.033758 | 137.7 s |
| B2 | 22 | 86,577 | 997,248 | 10,446 | $0.044492 | 173.5 s |
| B3 | 38 | 57,483 | 1,817,088 | 11,104 | $0.041472 | 179.3 s |

Three samples per arm on one fixture: treat the percentages as indicative, not precise.

### Jev is not the bottleneck

Across the three arm-B runs the skill made **55 decisions**. Jev's own latency was **p50 373 ms**
(spread 363–385 ms across runs), worst case 1,890 ms. The model answers in sub-second time; the cost
is everything around it.

### Why the premise did not hold here

Arm A needed only **14.3 host turns for 15 actions** — about one turn per action, not one turn per
click. A host that batches a few mechanical actions into one call never paid the per-click cost this
skill removes. Arm B then paid on top: reading this document, writing the wiring code, and carrying a
context **2.8× larger** in cache reads (1,339,520 vs 481,237).

### What the request-payload fix did achieve

The skill used to send its whole decision history on every request, so the payload grew with the
number of steps taken. It is now capped and projected:

| Step | History entries sent | Input tokens |
| ---: | ---: | ---: |
| 1 | 1 | 1,730 |
| 10 | 10 | 1,919 |
| 40 | 10 | 1,929 |
| 80 | 10 | 1,929 |

Before the fix, step 80 sent **10,314** input tokens for the same decision — **5.3× more**, growing
without bound. That was a real defect and it is fixed, but it is not enough to outweigh the
integration cost on a flow this size.

### What is not measured

- **The break-even flow length.** Nothing here shows a length at which the skill wins; we did not
  find one.
- Any flow whose next step genuinely depends on freshly observed state — the case the skill is
  designed for and this fixture does not exercise, because all 15 actions are known up front.
- Flows needing text entry: out of scope by construction.

If you are choosing between driving a browser directly and using this skill for a scripted flow, the
measurement says drive it directly.

## Text entry: Jev selects, a small LLM fills

Jev is a selector; it cannot generate text. Every build on `madewithjev.com` pairs it with a small
fast LLM for exactly that reason. This skill does the same:

- `policy.fill: true` offers every text field (textbox / textarea / combobox / searchbox) as a
  candidate; Jev picks **which** field.
- A free helper model (`bifrost/deepseek-v4-flash` by default) generates the
  **value** from the goal and the field's label. The endpoint and model are
  configurable through the optional `fillEndpoint` / `fillModel` config keys,
  and the credential comes from the `BIFROST_API_KEY` environment variable
  (see `references/configuration.md`). The response is strict-parsed; a blank,
  non-string, or over-long value fails the action and the run hands back rather
  than guessing.
- `fill` **never** presses Enter and never submits. Any consequential submit/send/publish step stays
  with the host, exactly as before.

## Measured on a search + filter + form flow

3 samples per arm, free host model for both arms, correctness from the page's own report:

| | Arm A (direct) | Arm B (with the skill) |
| --- | ---: | ---: |
| Tokens (uncached + output) | **29,299** | 49,180 |
| Time per mechanical action | **52.68 s** | 89.52 s |
| Correct | **3/3** | 2/3 |

The skill cost **1.68×** the tokens and **1.70×** the time per action — the ≤ 0.8× criterion is not
met. Jev is not the bottleneck (10 decisions, p50 **379 ms**). The skill can now do search/form flows
it could not attempt before, but on a short flow the integration cost (reading this document, writing
the wiring) costs more host turns than driving directly.

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
