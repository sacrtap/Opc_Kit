# Changelog

All notable changes to the party-mode skill are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version history is cross-referenced in the repo-level `CHANGELOG.md` (party-mode additions) and in the skill's `SKILL.md` frontmatter `metadata.version`.

## [v1.4.0] - 2026-10-19

### Changed (breaking: mode defaults and failure semantics)

- **Default mode is now `session`.** `party.toml` ships `party_mode = "session"`, so a fresh install voices every persona inline and never spawns. The old default (`subagent`) is now opt-in.
- **`auto` reversed: subagent-first, then an announced fallback.** Previously "voice inline by default, spawn only when independence matters", which read as a session-mode variant with occasional spawns. Now: probe for a spawn primitive, spawn for substantive rounds, and fall back to `session` **only** when the harness can't spawn or the spawn mechanism itself fails. The fallback must be announced in the same visible turn, in the room's voice, naming what failed and that the voices are no longer independent; it is recorded in the session memory. Silent degradation is a bug — if there is no visible turn to announce in, the party does not run.
- **`subagent` is opt-in and forced.** It no longer "falls back to `session` if the harness can't spawn". It probes before the first round, and on a missing primitive or a failing first spawn it **reports the error and aborts the session** — no agenda, no rounds, no artifacts. Mid-session mechanism failure stops the round and asks the user whether to switch to `auto`/`session` or reschedule. A single member failing is *not* mechanism failure: respawn it or cover the slot in character once, per the anti-stall rules — but its independence must be declared degraded to the user, and it may never be presented as independent again.
- **Degradation is per mode, not one chain.** `references/tool-compatibility.md` replaced the single `fallback-tier` chain (which applied to every mode and quietly sent `subagent` to `session`) with a per-mode table: `session` N/A, `auto` → `session` (announced), `subagent` → abort, `agent-team` → Tier 1→2→3 (announced). The Tier 1/2/3 ladder is now scoped to `agent-team` only.

### Added

- **Mode announcement at session start** (all modes): one in-character line naming what is actually running, so the user never has to guess which mode they got. Adversarial rooms (`anti-consensus-club`) now refuse to run single-voice instead of being pointed at "Tier 3".
- `references/mode-auto.md` rewritten around the spawn-first order of operations, the two distinct failure classes (member vs. mechanism), a template fallback announcement, and an explicit "what auto is not" section.
- `references/mode-subagent.md` gained a **No silent degradation** block with the abort message template.

## [v1.3.3] - 2026-10-19

### Fixed

- **Consensus was inferred from silence.** Audit of session `01a152bb` (six agendas, zero user decisions): every agenda closed on the moderator's line "有异议的现在说，没有就收口" — no persona actually voted, yet all six were recorded as consensus. Moderator Rule 2 now requires an explicit roll-call before closing: every persona in the room states 同意 / 保留 / 反对 in its own voice. Silence is not assent. A stated dissent closes the agenda as `多数一致（保留意见：X）` and goes into the minutes verbatim; a moderator or Killjoy may not flatten it into "大家达成一致".
- **Killjoy could manufacture consensus.** Rule 6 now separates its two powers: Killjoy declares *when* an agenda closes; the room's voiced positions declare *what* it closed on. "有没有要掀桌的" is a prompt, not a vote count.
- **Prior-session decisions were silently rewritten.** In the same session, agenda 5 changed three conclusions from that morning's review — H2 moved from a single judgement to 初判/终判 (moving the 判定时点), H3a's recovery slipped from 7 days to 3–4 weeks, and the L2 对照 shrank from 10 套 to 2–3 套 — all recorded as fresh consensus with no user confirmation. New Moderator Rule 7 treats a prior session's decisions as premises: touching a threshold, date, sample size, budget, stage boundary or acceptance criterion is a **reopen**, must be labelled `改判` in the minutes, and must go to the user via `question` before it becomes a conclusion. Unconfirmed, it stays a proposal and cannot be used as a premise.
- **Unanswered questions vanished.** Agenda 1 closed with "这活谁来干？得有个统一的采样计划" — nobody answered, and the conclusion dropped it. Rule 3 and the memory template now require an **Open Items** ledger: every question raised and not answered carries an owner or the words `待用户定`.
- **A persona outside the confirmed cast appeared mid-round.** Agenda 2/5 voiced "Level" — not in the Turn-1 roster — introduced via `*（主持人：Level 今晨没在阵容里…）*`, a double violation (cast integrity + fourth-wall narrator). New Rule 8: only confirmed personas speak; a missing perspective goes to an existing persona in their own voice, or the moderator pauses and asks the user to add someone. No bracketed narrator asides.

### Changed

- **Memory and report templates carry consensus status.** Memory gained `Open Items` and `Reopened Prior Decisions` sections plus a per-decision status annotation (一致 / 多数一致（保留意见）/ 交用户裁决 / 改判). The report's decisions table gained a Dissent column and a **Decision Status Audit** table (议程 | 全员表态 | 是否一致 | 未闭合项 | 是否改判).
- **`references/party-memory.md`** gained a **Prior decisions** section (read the earlier memory as a contract; quote the original, separate the change from the decision, reopen, confirm with the user, record `未确认（提案）` when it never reached them) and a cast-integrity note under *New faces*.
- **`evals/evals.json`** gained eval #5: convergence honesty — roll-call before closing, dissent labelled, open items owned, prior-decision changes marked and user-confirmed, no out-of-roster persona, no narrator asides.

## [v1.3.2] - 2026-10-19

### Fixed
- **Blocking hand-offs were left as prose instead of the `question` tool (session mode).** In a live 45-line session the orchestrator ended three consecutive turns with plain text ("你们怎么看？", "给个具体数字", "这条我倾向交给用户定") with no tool call; the user answered "可以" twice, the agent then *invented* a sample size (40–50) and closed agenda 1 on its own guess, and the session died mid-agenda-2. Root causes and fixes:
  - **Liveness Contract** now splits *rhetorical hooks* (prose OK — the room can continue) from *blocking hand-offs* (must be a `question` call; prose counts as no output).
  - **New "Blocking Hand-off Triggers"** in Critical Decision Points: any one of five signals — user-directed choice phrasing, room at 2–4 defensible positions, a decision changing budget/scope/acceptance criteria, a bare acknowledgment from the user, or "I recommend X but the user must decide" — makes the tool call mandatory. Plus **addressee discipline** (room-directed questions get answered in-character next turn; user-directed ones go through the tool) and **no guessing, ever** (a non-answer must be re-asked with the inference as an explicit option).
  - **`question` does not break the fourth wall** — clarified for `session` mode, where the moderator and cast share one voice.
  - **`references/tool-compatibility.md`** gained a **Tool name mapping** table (`question` → `ask` on omp, `AskUserQuestion` on Claude Code; `todowrite` → `todo`; `task`; `write agent://<id>`), the omp `todo` init shape (`[{phase, items}]` — bare strings fail), and a no-option-tool fallback (numbered list, then stop).

## [v1.3.1] - 2026-10-19

### Fixed
- **Cross-agenda bleed in subagent rounds (delivery bug).** In a live session, Round 1 briefs invented a "预热议程 X" instruction for every persona — each subagent then previewed a later agenda's position while the board was still on agenda 1 (e.g. the monetization voice announced pricing structure before the pricing round), so the presented conversation mixed several sub-topics at once, unlike `session` mode's one-at-a-time feel. Two-layer fix:
  - `references/mode-subagent.md` (Spawning): **Agenda isolation (mandatory)** — every round brief must declare its agenda boundary ("本轮只讨论议程 N"), cross-agenda observations become one-line **carryover notes** fed to that agenda's own round, and preview/tease of later agendas ("预热议程 X") is explicitly forbidden.
  - `SKILL.md` (Agenda-Driven Discussion): **One agenda at a time, on screen too** — the orchestrator weaves in only the part of a subagent's return that answers the current sub-topic and carries the rest as deferred material, so the visible conversation tracks the board one item at a time exactly like `session` mode.

## [v1.3.0] - 2026-10-19

### Changed
- **Unconfigured-pool check no longer blocks first use.** A missing `user/party.user.toml` (or a Path-not-found probing it) is now treated as *not configured*, not as an error — the check auto-assigns tiers from the detected pool, then asks **once** via `question` whether to persist the mapping to `user/party.user.toml` (skip-and-use-auto recommended). Previously a failed probe silently killed the warning+offer, so the check never ran (observed: `Path not found: …/party-mode/user` in a live session).
- **Anti-stall is now mandatory, not advisory.** `SKILL.md` "One exchange" and `mode-subagent.md` "Anti-stall rules" both harden the ~120s round cap: present what's back, move the round on, weave the late reply into the next round's opener; two no-shows → inline voice. Driven by a real 6+ hour stall on a single subagent that froze an entire session.
- **Per-subagent model mapping is now harness-aware.** The `task` agent on omp rejects a `model` argument (only `seance` accepts it), so the tier mapping is **declarative** there (announced for transparency; subagents inherit the session model) and **operative** only on model-passing harnesses (Claude Code, Codex multi-agent, workbuddy if confirmed). `tool-compatibility.md` gained a `per-subagent model` column and a workbuddy row; `model-selection.md` and `mode-subagent.md` updated to match.
- **`SKILL.md` Turn 2+ now loads reference files lazily** — no front-loading the whole `references/` stack; open each only when the step that needs it comes up.
- **`todowrite` items kept short and flat; agenda board updated at most once per round.** Long Chinese+emoji JSON has failed arg parsing in the past (observed `Expected ',' or ']'` in a live session).
- **Visual template read is now single-pass.** `templates/visual-review.html` is read once, in full, and filled — no segment sampling or re-reading. (Observed a session spend ~37 min re-reading template slices before generating.)

## [v1.2.1] - 2026-10-18

### Fixed
- **`resolve_party.py` bare invocation died on a usage wall.** `--config` was `required=True`, so the obvious first command — `cd` into the skill folder and run `python3 scripts/resolve_party.py` — exited with argparse usage and killed the session before any output. `--config` is now optional and defaults to `party.toml` next to the script; an explicit `--config` still wins, and a missing default exits 2 with a one-line actionable message instead of a usage dump.
- **Docs still described `--config` as mandatory** (`SKILL.md` Turn 1, `references/mode-subagent.md`, script docstring). All command examples now lead with the no-argument form.

## [v1.2.0] - 2026-10-18

### Added
- **Two-phase On Activation contract** (`SKILL.md`): Turn 1 must produce one user-visible message containing greeting (in the user's actual language) + prefilled topic/goal guess + proposed 4–6 person roster + draft agenda, *before* any document body is read. Allowed prereads: one `resolve_party.py` call + the memory index only. Forbidden: document bodies, full memory files, web search, directory traversal, line-count passes.
- **Input Ingestion Budget** (`SKILL.md`): three-layer bounded ingestion — Layer 1 skeleton (≤2 tool calls), Layer 2 decision surface (≤2 calls per agenda item), Layer 3 argument detail (on demand). Hard rules: a `Showing lines X of Y` truncation notice is **not a to-do list**; ~800-line total document-body budget per session; no second document until the first produces visible discussion; state the plan before reading anything >500 lines.
- **Liveness Contract** (`SKILL.md`): at most 2 consecutive tool-only turns; preparation must be explained; every substantive turn ends on a hook; when the budget runs out, cut steps, not turns.
- **Tier Assessment Timing** (`SKILL.md`): tier is assigned at the end of Layer 1 on partial information, stated aloud with its basis, and may be raised/lowered as Layer 2 unfolds.
- **`resolve_party.py --brief`**: cheap roster (code/name/icon/title/model_tier/domains, no `persona` payload) for composing the room; full persona text is fetched only for the members actually cast. Measured: 5.6KB vs 19.3KB full.
- **Regression eval #4** (`evals/evals.json`): a 1,400-line document case asserting first-message content, ≤2 tool calls before first visible output, ≤2 consecutive silent turns, no sequential full read past Layer 1, and Chinese-first greeting despite an English config default.

### Changed
- **Language arbitration** (`SKILL.md` new "Language" section): `communication_language` is a default, never an override — the session follows the user's actual language; filenames/field names/protocol strings stay original. Fixes the real failure where an English config silenced a Chinese session.
- **Roster resolution** (`SKILL.md` step 6): composition now goes `--brief` → pick 4–6 → `--validate-roster` → fetch full persona for the cast only.
- **`resolve_party.py` docstring**: synchronized with actual flags (`--brief`, `--validate-roster` were missing; this was a real doc/code mismatch).
- **`SKILL.md` style dedupe**: the "use the `question` tool, never plain markdown" rule is now stated once and referenced everywhere it applies; Voice Differentiation Checklist merged into a single four-question gate.

## [v1.1.1] - 2026-10-18

### Added
- **Progressive delivery & latency handling** (`references/mode-subagent.md` new "Streaming & latency handling" section): present each persona's turn as it lands rather than blocking on the slowest model; waiting-room beats voiced in character (never announce the mechanism); tier-aware latency budgets (fast ~15s, strong 60-120s); anti-stall hard cap (~120s per round); late replies woven into the next round instead of re-running a finished round; two-timeout demotion to inline voice.
- **Unconfigured-pool check** (`SKILL.md` Model Selection): at session start, if no per-persona `model` fields are saved and the detected pool has >1 usable model, warn once and offer `/party-mode config`.

### Changed
- **`SKILL.md`**: "One exchange, woven" now mandates progressive delivery in subagent mode; version bumped 1.1.0 → 1.1.1.

## [v1.1.0] - 2026-10-18

### Added
- **Tool compatibility matrix** (`references/tool-compatibility.md`): capability matrix for Claude Code, OpenAI Codex CLI, omp harness, Qoder, OpenCode/generic; three-level `fallback-tier` degradation (native agent-team → subagent-simulated standing team → session rotation); host-harness detection logic; migration paths.
- **Roster coverage check** (`scripts/resolve_party.py --validate-roster`): verifies a composed roster before spawn — member existence, aggregated `domains` coverage, `model_tier` distribution, and flagged gaps (thin room, missing adversarial/security voice, missing builder, no strong tier).
- **First-run model setup** (`/party-mode config`): one-time `question`-tool confirmation of the strong/balanced/fast tier mapping against the user's actual model pool, persisted as per-persona `model` fields in `user/party.user.toml`.

### Changed
- **`references/mode-agent-team.md`**: replaced "Claude Code only" with explicit fallback-tier chain reference; documented Tier 2 relay-bus semantics (orchestrator relays turns; `write agent://<id>` / `send_message` are one-way parent→child).
- **`references/model-selection.md`**: added omp harness detection branch (`cfg://`, provider-prefixed model IDs, fallback to orchestrator model).
- **`SKILL.md`**: version bumped 1.0.0 → 1.1.0; dynamic composition now mandates `--validate-roster` verification; How It Runs documents `fallback-tier` degradation; Model Selection covers omp detection and `/party-mode config`; new `references/tool-compatibility.md` wired into Conventions.

### Fixed
- Dynamic subagent composition had no coverage verification — the room could silently lack a challenger or builder voice. Now checked before spawn via `--validate-roster`.
- agent-team mode was documented as "Claude Code only" with no guidance for other harnesses; now every mainstream tool has a defined degradation path.