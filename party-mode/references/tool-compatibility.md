# Tool Compatibility Matrix

`party-mode` runs across many agent harnesses, but not every harness can spawn agents the same way. This matrix records what each tool actually supports so the orchestrator can pick the right behavior for the mode the user asked for instead of guessing. Use it as the single source of truth for mode degradation.

## Capability Matrix

| Tool | subagent spawn | standing roster | point-to-point messaging | shared feed | agent-team native | per-subagent model | supported modes |
|------|---------------|-----------------|--------------------------|-------------|-------------------|--------------------|-----------------|
| **Claude Code** | ✅ `Agent` tool + `SendMessage` resume | ✅ mailbox persistence under `~/.claude/projects/{project}/{sessionId}/subagents/` | ✅ inbox files at `~/.claude/teams/default/inboxes/` | ❌ no shared feed (teammates only see messages addressed to them) | ✅ experimental agent teams | ✅ per-spawn model honored | `session`, `auto`, `subagent`, `agent-team` |
| **OpenAI Codex CLI** | ✅ `spawn_agent` / `followup_task` / `send_message` (requires `[features] multi_agent = true`) | ⚠️ child agents can recursively spawn; no persistent team inbox between turns | ⚠️ `send_message` is one-shot; no standing mailbox | ❌ | ❌ no standing team; multi-agent orchestration only | ✅ per-spawn model honored | `session`, `auto`, `subagent` (degraded `agent-team`) |
| **omp harness** | ✅ `task` subagent via `agent` tool; `write agent://<id>` for one-way steering | ⚠️ agent IDs persist within session; no cross-turn mailbox | ⚠️ `write agent://<id>` is one-way parent→child; no peer-to-peer channel | ⚠️ `agent://all` broadcast only | ❌ no standing team primitive | ❌ `task` rejects `model` (only `seance` accepts it) — mapping is **declarative**, subagents inherit the session model | `session`, `auto`, `subagent` (degraded `agent-team`) |
| **workbuddy** | ⚠️ probe `task`/spawn API before relying on it | ⚠️ verify cross-turn handles | ⚠️ verify messaging | ⚠️ | ❌ | ⚠️ probe `model` support at spawn; treat as declarative until confirmed | `session`, `auto`, `subagent` (if spawn confirmed) |
| **Qoder** | ✅ Experts Mode / Quest 1.0 multi-subagent | ❌ platform-internal, not user-controllable | ❌ black-box, no exposed API | ❌ | ❌ platform-internal only | ❌ platform-internal | `session`, `auto` |
| **OpenCode / generic** | depends on config (`agent` tool optional) | ❌ | ❌ | ❌ | ❌ | depends on config | `session` primarily; `subagent` if configured |
| **Cline / Continue / Aider-style** | ❌ single-thread | ❌ | ❌ | ❌ | ❌ | ❌ | `session` only |

**Per-subagent model column:** determines whether the tier mapping from `references/model-selection.md` is **operative** (actually passed at spawn) or **declarative** (announced for transparency; all subagents run the session model). On ❌ harnesses never claim per-model independence; differentiate depth by round structure instead — see `references/mode-subagent.md` (Model choice).

## Mode degradation (per mode, not one chain)

Degradation depends on **which mode the user asked for**. There is no single "always fall to session" rule — that would silently turn a forced-subagent party into a monologue.

| Mode | On missing/broken spawn | Announced? |
|---|---|---|
| `session` (default) | never spawns — nothing to degrade | N/A |
| `auto` | spawn first; if unsupported or the mechanism fails → **`session`** for the rest of the run | **Yes, mandatory**, in the same visible turn |
| `subagent` | **abort the session** — report the failure, open no room | Yes, it *is* the abort message |
| `agent-team` | Tier 1 → Tier 2 → Tier 3 below | Yes, each step |

### agent-team tiers (Tier 1 → 3)

When the resolved `party_mode` is `agent-team` but the host harness cannot stand up a real team, degrade in this order — never silently skip a tier:

### Tier 1 — Native agent-team (Claude Code only)
- Spawn standing members via `Agent` tool; resume via `SendMessage`.
- Teammates message each other by name; inboxes persist between turns.
- This is the only tier where point-to-point clash happens for real. Use it when available.

### Tier 2 — subagent-simulated standing team (omp, Codex CLI)
- Spawn one subagent per persona and keep the handle alive for the session (omp: `task` agent; Codex: `spawn_agent`).
- The orchestrator relays every member's turn to all other members before the next round — simulating the shared room that native agent-team gets for free.
- No true peer-to-peer messaging: the orchestrator is the relay bus. A member that sat a round out must be caught up explicitly before it speaks again.
- `write agent://<id>` (omp) or `send_message` (Codex) is one-way parent→child — use it to hand a member the room context, not to let members address each other directly.
- Announce the degradation in character, once: "The room's a bit smaller tonight — I'll be passing notes between you."

### Tier 3 — session rotation (Qoder, OpenCode/generic, any harness without subagent spawn)
- One mind voices every persona inline, as in `session` mode.
- Maintain a visible roster so the user still sees who's "in the room," even though no agent is actually spawned.
- No independence between voices — acceptable for Tier-1 discussions, fatal for red-team or focus-group work. Warn the user: "Running in session mode — voices won't be truly independent. For adversarial work, switch to a harness that supports `subagent`."

## Detection logic

Before spawning, detect the host harness by checking, in order:

1. **Claude Code** — `CLAUDE_PROJECT_DIR` env var set, or `~/.claude/projects/` exists with current session subdir.
2. **Codex CLI** — `CODEX_HOME` env var, or `codex` on PATH with `multi_agent` feature enabled (run `codex features list` if uncertain).
3. **omp harness** — `OMP_SESSION_ID` or `omp://` internal URIs resolvable; the `task` tool is present in the tool inventory.
4. **workbuddy** — `WORKBUDDY_*` env vars or a workbuddy config dir; probe its spawn API (`task`-like tool in inventory) before assuming Tier 2.
5. **Qoder** — `QODER_SESSION` env var or Qoder-specific config dir.
6. **OpenCode / generic** — `.opencode/config.json` or `.opencode.json` present; no `task` tool → Tier 3.

If detection is ambiguous, treat the harness as **cannot spawn** — `session` runs fine, `auto` falls back and says so, `subagent` aborts. Tell the user which mode is actually running so they can override with `--mode`.

## Migration paths

- **Upgrade path**: user on a harness without spawn who wants real independence → recommend Claude Code or a harness with `subagent`, or run `--mode subagent` on omp/Codex (Tier 2) where supported.
- **Downgrade trigger, `auto`**: if the spawn mechanism itself fails mid-session (tool gone, every spawn errors), drop to `session` for the rest of the session **and say so in the visible turn**.
- **Downgrade is not available in `subagent`**: one member failing (closed, won't resume) is handled by respawn/in-character cover per `references/mode-subagent.md`; the *mechanism* failing means stop and report. Never convert a forced-subagent party into a single voice on your own authority — offer `auto` or `session` and let the user choose.

## Implementation notes

- **Announce the mode at session start.** One line, in character, naming what is actually running: `session` ("今晚一个脑子扮所有人"), `auto` ("先派子代理出去，起不来我会当场告诉你并降级"), `subagent` ("每人一个独立代理"), `agent-team` plus its tier ("Running in `agent-team` (Tier 2: subagent-simulated) — the room will feel a touch more orchestrated tonight."). Never let the user guess which mode they got.
- **An `auto` fallback announcement is not optional.** It must land in a visible turn, in the same round the fallback happened. A silent downgrade is the failure this mode exists to prevent.
- **A `subagent` abort is the whole response.** Report the failure and stop — an "I'll just voice them instead" recovery violates the mode's contract.
- Never claim Tier 1 semantics on a Tier 2/3 harness. The shared-feed illusion breaks the moment two members would need to see each other's turns without the orchestrator relaying.
- For `anti-consensus-club` and other adversarial rooms, refuse to run single-voice — the room's whole value is independence. Require `subagent`/`agent-team` on a capable harness (or reschedule); if the room is forced onto `session`, say the room's conclusion is not an independence check.

## Tool name mapping

The skill is written against a neutral vocabulary; map it to whatever the harness exposes. A missing mapping must never become a reason to skip a blocking hand-off.

| Skill concept | Claude Code | omp | Codex CLI | Notes |
|---|---|---|---|---|
| `question` (option hand-off) | `AskUserQuestion` | `ask` | `ask_user` / equivalent | Must offer 2–4 options, recommendation first + `(Recommended)`, free-form input allowed |
| `todowrite` (agenda board) | `TodoWrite` | `todo` | `update_plan` / equivalent | Board is the spine; update at most once per round |
| subagent spawn | `Agent` | `task` | `spawn_agent` | omp `task` rejects a `model` argument |
| steering/messaging | `SendMessage` | `write agent://<id>` | `send_message` | Parent→child only |

**omp `todo` argument shape.** `op: "init"` expects a list of **phase objects**, not bare strings — `[{"phase": "讨论", "items": ["item 1", "item 2"]}]`. Passing strings fails with `list[0] must be an object (was a string)` and costs a retry; later `op` calls address items by their verbatim text.

**No option-list tool at all.** Emit a numbered markdown list with the recommendation marked, then **stop**. Never proceed on an assumed answer.
