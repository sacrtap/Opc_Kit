# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-10-19

### Changed
- **party-mode skill (v1.4.0) — default mode changed to `session`, and each mode now has its own failure contract.** Previously `party.toml` shipped `party_mode = "subagent"` and every mode shared one degradation chain that quietly sent a failed `subagent` run to `session`. Now:
  - **`session` is the default** — never spawns, cannot stall on a subagent, cannot silently change its own semantics.
  - **`auto` is subagent-first** — probe for a spawn primitive, spawn for substantive rounds, and fall back to `session` **only** when the harness cannot spawn or the spawn mechanism fails. The fallback must be announced in the same visible turn, in the room's voice (what failed, that the voices are no longer independent), and recorded in the session memory. Silent degradation is a bug; with no visible turn to announce in, the party does not run.
  - **`subagent` is explicit opt-in and forced** — probe first; on a missing primitive or failing first spawn, report the error and **abort the session** (no agenda, no artifacts). No fallback to a single voice. Mid-session mechanism failure stops the round and asks the user whether to switch or reschedule; a single member failing is handled by respawn/in-character cover but must be declared degraded.
  - `agent-team` keeps the Tier 1→2→3 ladder, now scoped to `agent-team` only, with announcements at each step.
  - All modes announce which mode is actually running at session start; adversarial rooms refuse to run single-voice. `references/mode-auto.md` was rewritten (spawn-first order of operations, member-vs-mechanism failure classes, announcement template); `references/mode-subagent.md` gained a **No silent degradation** block; `references/tool-compatibility.md` replaced the single `fallback-tier` chain with a per-mode degradation table; the Chinese guide's mode table was updated. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.7.3] - 2026-10-19

### Fixed
- **party-mode skill (v1.3.3) — consensus was being inferred from silence.** Audited session `01a152bb` (session mode, six agendas): no agenda produced a single user decision, because every one closed on the moderator's "有异议的现在说，没有就收口" without any persona actually voting. Underneath that, three real defects: (1) agenda 1's open question "统一的采样计划谁来做" was never answered and silently dropped; (2) agenda 5 changed three decisions from that morning's review (H2 判定时点后移、H3a 从 7 天变 3–4 周、L2 对照 10 套→2–3 套) and recorded them as fresh consensus with no user confirmation; (3) "Level" — not in the Turn-1 roster — spoke in agendas 2 and 5, introduced through a `*（主持人：…）*` narrator aside. Fixes: explicit roll-call before every agenda closes (silence ≠ assent, dissent labelled `多数一致（保留意见：X）`); Killjoy limited to declaring *when* an agenda closes, not *what* it decided; prior-session decisions treated as premises — changing a threshold/date/sample size/budget/acceptance criterion is a `改判` that must reach the user via `question` before it counts; an **Open Items** ledger with owners; cast integrity (no out-of-roster personas, no bracketed narrator asides). Memory and report templates gained `Open Items`, `Reopened Prior Decisions`, a Dissent column and a per-agenda **Decision Status Audit**; `references/party-memory.md` gained a **Prior decisions** read-back procedure; eval #5 added for convergence honesty. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.7.2] - 2026-10-19

### Fixed
- **party-mode skill (v1.3.2)** — blocking decisions were left as prose instead of the `question` tool. Observed in a live `session`-mode run: three consecutive turns ended with "你们怎么看？" / "给个具体数字" / "交给用户定", the user's "可以" was misread as assent, and the agent invented a sample size before closing an agenda. Fixes: rhetorical hooks vs blocking hand-offs split in the Liveness Contract; five mandatory trigger conditions for the tool call; addressee discipline (room questions answered in-character, user questions via the tool); **no guessing** — a non-answer must be re-asked with the inference as an explicit option; `question` explicitly declared not to break the fourth wall in `session` mode; and a new Tool name mapping table in `tool-compatibility.md` (`question`→`ask` on omp, `AskUserQuestion` on Claude Code) plus the omp `todo` init shape. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.7.1] - 2026-10-19

### Fixed
- **party-mode skill (v1.3.1)** — subagent rounds mixing multiple agendas on screen at once (observed: Round 1 briefs told every persona to "预热议程 X", so the monetization voice previewed pricing while the board was still on agenda 1). Now: every round brief declares its agenda boundary, cross-agenda observations become carryover notes for their own round, preview/tease is forbidden, and the orchestrator weaves in only the part of a subagent's return that answers the current sub-topic — the visible conversation tracks the board one agenda at a time, matching `session` mode. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.7.0] - 2026-10-19

### Changed
- **party-mode skill (v1.3.0)** — three user-observed pain points from a live Verix review session, fixed:
  - **Unconfigured-pool check now auto-assigns instead of warning-and-blocking**: a missing `user/party.user.toml` is "not configured" (not an error), tiers are auto-mapped from the detected pool, and the user is asked once via `question` whether to persist — efficiency first.
  - **Subagent rounds are anti-stall hardened**: ~120s cap is mandatory, stragglers never block the round (a real single-subagent 6-hour stall froze a whole session), late replies weave into the next round; two no-shows → inline voice.
  - **Per-subagent model mapping is harness-aware**: omp `task` rejects `model`, so the mapping is declarative there (subagents inherit the session model) and operative on model-passing harnesses (Claude Code, Codex, workbuddy if confirmed). `tool-compatibility.md` gained a `per-subagent model` column + workbuddy row.
  - Plus: lazy reference loading, short flat `todowrite` items updated once per round, single-pass visual template read.
  - Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.6.1] - 2026-10-18

### Fixed
- **party-mode skill (v1.2.1)**: `resolve_party.py` now works with no arguments (auto-locates `party.toml` next to the script) — the previously mandatory `--config` made the obvious first command exit on a usage wall and abort the session. Doc examples updated to the no-argument form. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.6.0] - 2026-10-18

### Changed
- **party-mode skill (v1.2.0)**: two-phase On Activation contract (first visible turn carries greeting + topic + roster + agenda before any document read); Input Ingestion Budget with three bounded layers and an ~800-line body cap; Liveness Contract (≤2 consecutive silent turns); Tier assigned at Layer 1 on partial information; language arbitration (user language beats config default); `resolve_party.py --brief` for cheap roster composition plus docstring sync; regression eval #4 for a large-document session. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.5.3] - 2026-10-18

### Changed
- **party-mode skill (v1.1.1)**: progressive delivery & latency handling for subagent mode (turns presented as they land, in-character waiting beats, tier-aware latency budgets, anti-stall cap); unconfigured model-pool warning at session start. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.5.2] - 2026-10-18

### Changed
- **party-mode skill (v1.1.0)**: tool compatibility matrix & fallback-tier for agent-team mode across Claude Code / Codex CLI / omp / Qoder / OpenCode; `--validate-roster` coverage check in `resolve_party.py`; first-run `/party-mode config` model setup; omp harness model detection. Details in `~/.agents/skills/party-mode/CHANGELOG.md`.

## [2.5.1] - 2026-08-08

### Added
- **party-mode skill (v1.0.0)**: Multi-persona decision discussion skill with 17 professional personas
  - 17 expert roles covering engineering, product, and strategy domains
  - Dynamic role selection based on topic (4-6 experts auto-selected)
  - Three discussion tiers: Quick Take (3-5 rounds), Standard (8-12), Deep Dive (15-25)
  - Four operating modes: subagent, session, auto, agent-team
  - Evidence-driven discussion with web research integration
  - Session memory for cross-session context retention
  - Preset party groups: `code-review-crew`, `anti-consensus-club`
  - Visual HTML review generation
  - Custom party creation support

### Documentation
- **party-mode-guide.md**: Comprehensive English usage guide with 5 core scenarios
  - New product design (0→1 validation)
  - Key feature design
  - Technical architecture challenges
  - Product roadmap & strategy
  - Commercialization & business model
- **party-mode-guide-CN.md**: Chinese usage guide (mirrors English version)
- **create-prd-guide.md**: English usage guide for create-prd skill
- **create-prd-guide-CN.md**: Chinese usage guide for create-prd skill
- **README.md / README-CN.md**: Updated "Basic Usage" section with complete workflow example
  - Single skill usage examples (create-prd alone, party-mode alone)
  - Complete workflow example: debate first, then document

## [2.2.2] - 2026-06-10

### Changes
- **Final Cleanup Policy**: PRD YAML front matter is now temporary generation state, not part of final document
- **validate-prd.js**: Check #15 updated to detect cleanup status; added check #18 for Metadata table completeness
- **Backward Compatibility**: Old PRDs with front matter still pass validation (warning only)

### Migration Guide
- **Existing PRDs**: No action required, but recommended to cleanup front matter manually
- **New PRDs**: Front matter automatically removed after generation completes
- **Checkpoint Recovery**: Still works during generation; checkpoint preserved until all batches complete

### Technical Details
- Front matter during generation: Contains `generate_progress` for checkpoint tracking
- Front matter after completion: Removed entirely
- Business metadata: Lives only in `## Metadata` section (8 fields)

## [2.2.1] - 2026-06-10

### Release Documentation
- Updated all public version references to v2.2.1
- Added consolidated technical release notes
- Added CHANGELOG.md for version history
- Added PRD Validation CI badge

### Verified Benchmark Results (v2.2.0 vs v2.1.0 baseline)
- **Coaching mode time reduction**: ~42s → ~11s (**-77%**)
- **Update-with-review mode time reduction**: ~50s → ~10s (**-81%**)
- **validate-existing score improvement**: 16/100 → 78/100 (**+387%**)
- **Quality score average**: 93-97 → 96-98 (**+3 points**)

### New Features Verified
- **Progress notifications**: Real-time feedback during incremental writes (Batch X/5 format)
- **Breakpoint recovery**: Session can resume from checkpoint after interruption
- **Cross-engine Mermaid compatibility**: Consistent rendering across Zed/VS Code/GitHub
- **Language consistency**: Chinese prompt generates pure Chinese PRD (only technical identifiers allowed in English)
- **Platform ecosystem inference**: Zero-interaction auto-inference for iOS/Android/Web platforms
- **Post-update quality re-scoring**: Mandatory 7-dimension quality scoring after each PRD update

### Quality Assurance
- **13-chapter structural completeness**: 92% → 99%
- **Test coverage**: 10 typical scenarios, 30 PRD samples, 97 automated assertions
- **Assertion pass rate**: 100% (97/97)

### Documentation
- Updated README.md and README-CN.md with v2.2.1 version references
- Added PRD Validation CI badge to README.md

## [2.2.0] - 2026-06-09

### Major Features
- **Cross-engine Mermaid rules**: Prohibited ASCII double quotes, circle nodes `((text))`, and HTML `<br/>` tags
- **Progress Notification Rules**: 5-batch incremental write with real-time progress tracking
- **Checkpoint & Recovery**: `generate_progress` YAML checkpoint tracking for session interruption recovery
- **Post-Update Quality Re-scoring**: Mandatory quality rescoring after every PRD update
- **Model failure automatic retry**: Automatic fallback to kimi-k2.5 when qwen3.6-plus quota exhausted
- **Language detection and title translation mapping**: Auto-detect user language and adapt PRD output
- **Platform ecosystem inference**: Zero-interaction platform inference from user input

### Testing
- **iteration-3 benchmark**: 10 test cases, 30 PRD files, 97 assertions all passed
- **Three-way comparison**: with_skill (v2.2.0) vs baseline (v2.1.0) vs without_skill
- **Quality validation**: All 6 new features verified through comprehensive test suite

### Known Issues
- Coaching mode may hang when waiting for user response without timeout mechanism

## [2.1.0] - 2026-06-04

### Features
- Baseline version with 13-chapter PRD template
- Coaching and Fast mode workflows
- US↔FR bidirectional traceability
- 7-dimension quality scoring system
- Cross-platform agent compatibility (OpenCode, Claude Code, Cursor, Codex)

### Testing
- **iteration-1 benchmark**: 10/10 test cases passed
- **Quality score average**: 96.25/100 (4 create-type tests)
- **PRD volume increase**: 111% larger than without-skill baseline

---

## Version History Summary

| Version | Release Date | Key Improvements |
|---------|--------------|------------------|
| 2.5.1   | 2026-08-08 | Added party-mode skill, comprehensive usage guides (EN/CN) |
| 2.2.2   | 2026-06-10 | Front matter cleanup policy, validation improvements |
| 2.2.1   | 2026-06-10 | Documented v2.2.0 benchmark results, release notes, CI validation |
| 2.2.0   | 2026-06-09 | Cross-engine Mermaid, Progress notifications, Checkpoint recovery |
| 2.1.0   | 2026-06-04 | Initial release with coaching/fast modes |
