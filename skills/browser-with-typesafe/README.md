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

## What it costs, measured

The point of this skill is not only that it works, but that a mechanical flow stops costing one
host-model turn per click. Here is the same 3-action flow (expand → scroll → collapse) on the test
fixture, run against the live TypeSafe API:

| | Without this skill | With this skill |
| --- | --- | --- |
| Host-model turns to complete the flow | 4 — one per action, plus verification | **1** |
| Page state the host model must read | 571–1,711 tokens per action, re-read every turn | read once, when verifying |
| Decision tokens billed | at the host model's price | **4,760 input, 211 output** |
| Decision cost | — | **≈ $0.0002** |

Jev bills **input only** at `$0.042` per million tokens and charges nothing for output, so the
3-action flow above costs about two hundred-thousandths of a dollar in decision tokens. The gap
scales with the flow: an N-action flow goes from N+1 host turns to 1.

Per-decision detail from that run:

| Step | Input tokens | Output tokens |
| --- | ---: | ---: |
| Click Expand section | 571 | 49 |
| Scroll down 2 pages within Evaluation report | 1,607 | 57 |
| Click Collapse section | 1,711 | 57 |
| DONE | 871 | 48 |
| **Total** | **4,760** | **211** |

Reproduce it — the engine records the provider's own token accounting:

```js
const outcome = await session.run(task);
outcome.sessionMetrics.inputTokens;   // 4760 for the run above
outcome.sessionMetrics.outputTokens;  // 211
outcome.history[0].usage;             // { inputTokens: 571, outputTokens: 49 }
```

We deliberately do **not** print a "before" total. A host turn's token cost depends on the agent's
own system prompt, tool schemas, and conversation length, so any single number would be invented.
The two levers above are what is actually measured: turns avoided, and decision tokens billed at
Jev's published rate instead of the host model's.

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
