# Subagent Mode

Active only when the resolved `party_mode` is `subagent` or the user explicitly asks for it (`--mode subagent`, "use subagents", "让他们独立思考"). **Subagent mode is opt-in and forced**: put a real agent behind each persona for every substantive round, the opening banter included, so each persona thinks independently — not one mind voicing them all. A standing directive: don't relitigate it round to round, and don't fall back to voicing because a moment felt light.

**No silent degradation.** `session` is the default mode; a user who asked for `subagent` asked for the thing this mode is named after. So:

- **Probe before the first round.** Confirm the harness exposes a spawn primitive (`task`/`agent` on omp, `Agent` on Claude Code, `spawn_agent` on Codex) per `references/tool-compatibility.md`. No primitive → stop before the room opens.
- **First spawn errors → stop.** Report the exact error to the user and **abort the session**: no agenda, no rounds, no artifacts. Do not offer to "just voice it this once" — that is what `auto` is for, and it is the user's call to switch, not yours to assume.
- **Mid-session mechanism failure** (every spawn errors, tool disappears): stop the round, report it, and ask the user whether to switch to `auto`/`session` or reschedule. Do not keep spawning into a broken harness, and do not quietly continue inline.
- **One member failing is not the mechanism failing.** Respawn it, or cover its slot in character once per the anti-stall rules below — the mode stays `subagent`.

The abort message is plain and specific, e.g.:

> "`subagent` 模式起不来：<环境/错误原文>。这个模式要求每个角色有独立代理，降级就没有意义了，所以这场先不开。要改用 `auto`（失败自动降级到单脑，会告知你）或 `session`（直接单脑）吗？"

## Lifecycle

Where your harness keeps agents alive across turns, the cast is **standing**: spawn one agent per persona and reuse that same handle round after round — hand it the new turn plus the room context it needs — instead of a throwaway each time. That continuity is what lets a persona's grudges, alliances, and callbacks accrue. Keep a visible roster mapping each persona to its live handle, and reuse it.

Keep the cast alive for the whole session. A member that finished the one thing you handed it is **idle, not done** — don't close, retire, or disband it. Serving the opening intent doesn't end the party; only the user ending it does, or an explicit `--non-interactive` run wrapping up. Release agents only at wrap-up. If one gets closed by accident, resume it; if it won't resume, say so and respawn just that member.

Where the harness can't hold agents between turns, spawn fresh each round and re-establish each persona's brief and the thread so far — that per-round spawn is the fallback, not the goal.

## One shared room

It's one room, not parallel one-on-ones. Every standing member hears everything said each round — the user's turn and every other persona's turn — even when it's not their turn to speak. A persona sitting a round out is still in the room listening, so when it next speaks it's caught up: it can pick up a dropped thread, hold a grudge, call back. Route the whole exchange to all of them each round; never hand a persona only the slice it's about to answer. Skip this and they drift out of sync — separate consultations wearing a party's clothes.

## Spawning

Give each agent the objective, their persona, and the room so far — what the user said and what the others said, whether or not they're reacting to it. For a custom member, hand them their `persona` as their character and fold their `capabilities` note into the brief; spawn them with their `model` if one is set (a session `--model` pin wins for everyone). Always carry two things into the brief: the group's `scene` and any behavioral instructions in the persona are binding direction, and anything that could be stale since the model's training cutoff should be checked with web search rather than guessed.

**Agenda isolation (mandatory).** Each round's brief must state its agenda boundary explicitly — the one sub-topic on the board this round answers ("本轮只讨论议程 2 门设计；其他议程禁止展开"). Two consequences:

- **No cross-agenda argumentation.** A persona that spots something belonging to another agenda records it as a one-line *carryover note* (「他议：H4 的 Track B 定位问题 → 议程 4 再核」), never as an argument in this round. The orchestrator collects carryover notes and feeds them into the brief of the round that owns that agenda.
- **No preview/tease of later agendas.** "预热议程 X", "预告下个议题", "先亮主场" are forbidden — a persona previewing next week's topic at today's table is exactly how a party turns into a conference agenda. The spotlight is the current agenda alone; a persona's pet topics get their moment when their agenda arrives.

Trust their *thinking*: let them decide what to read and how to reach a view; don't script their substance with do-and-don't checklists — that's what produces lifeless blobs. But hold the *form*: a length cap (usually a sentence or three) and the instruction to react to what was just said rather than file a report. Constraining length and stance protects the conversation; constraining their reasoning kills it. Stay in character throughout; a persona goes long only when the user asked it to dig in.

Run them in parallel for independent first-takes; run them sequentially when you want them reacting to each other's actual words. Keep it to a few voices a round — more reads as a crowd, not a conversation.

## Weave the replies into one conversation

Even with everyone caught up on the room, a round taken in parallel means no agent has yet seen the others' turns from that same round — so left raw they reply alongside one another, not to one another. Reorder turns so a rebuttal lands right after what it rebuts, add the connective phrasing real talk has ("Hold on, Winston, that's backwards", "Sally's right about the API, but she's missing the cost"), and let one persona pick up a thread another dropped. Never change what an agent argued — weave delivery, preserve substance.

## Model choice

Match the model to the round: something quick for banter, something stronger for deep work. Whether that mapping is **operative** (actually passed to the spawned agent) or **declarative** (announced for transparency only) depends on the harness — check `references/tool-compatibility.md` before promising anything:

- **Harnesses that pass models through** (Claude Code, Codex multi-agent, workbuddy if it exposes per-spawn models): use a per-member `model` when set; a session `--model <name>` pin overrides it for everyone. Pass the mapped model at spawn.
- **omp**: the `task` agent **rejects a `model` argument** (it is only accepted for the `seance` agent) — every subagent inherits the orchestrator's current session model. Don't fight it: keep the tier mapping as a **declarative** cast sheet (announce "deep tier on the strong model, hot takes on the flash model" for user expectations), and deliver model differentiation through **round structure** instead — strong-tier personas get the deep rounds, fast-tier personas get the quick takes; the same session model does both at different depths. Never claim per-model independence the harness can't deliver.

## Roster coverage check — verify before you spawn

Dynamic composition picks 4-6 personas by `domains`, but selection is judgment — so verify it before spawning. Run:

```bash
python3 {skill-root}/scripts/resolve_party.py \
  --validate-roster "sec-hawk,adversary,edge-hunter,craftsman,shipper"
```

The script returns each member's existence, aggregated `domains`, `tier_distribution`, and `suggestions` (flagged gaps: thin room, no adversarial/security voice, no builder/pragmatist, no strong tier). Apply its suggestions before the first spawn — swap a persona in/out, or accept the gap deliberately and say why. Never silently spawn a roster with unresolved members or a flagged hole that changes the discussion (e.g. a red-team room with no challenger).

## First-run model setup (auto-assign + one confirm)

Every user's harness install exposes a different model pool — there is no universal strong/balanced/fast triple. On **first use of subagent mode** (or when the user invokes `/party-mode config`), **do not block the party on configuration**. Instead:

1. Detect available models per `references/model-selection.md` and auto-map tiers (strong → best model, balanced → mid, fast → cheap).
2. Before the first spawn, ask **once** via the `question` tool: show the proposed mapping and offer to persist it — "已按模型池自动分配（Forge→X、Level→Y…），是否保存到 user/party.user.toml？" Make **skip / use-auto** the recommended option; saving is for users who want the same cast sheet next session, skipping costs nothing.
3. If saved, write explicit `model` fields per member into `user/party.user.toml` and never re-ask (unless the pool changes). If skipped, auto-assign runs each session until the user configures.

Efficiency first: auto-assignment is the default that never stalls; the confirmation is a one-tap side effect, not a prerequisite. On harnesses where subagents can't take a model (omp), saving is declarative documentation — see *Model choice* above.

## Streaming & latency handling

Subagent rounds are not a single synchronous wall — they are an async fan-out with a slowest-agent bound. The default "wait for all, then weave" produces a silent stall the moment one strong-tier model (deep reasoning) takes 60s+ while fast-tier voices finished in 5s. Handle it with progressive delivery, never by freezing the room.

### Progressive delivery (first-class)

Deliver each persona's turn **as soon as it lands**, not when the slowest member returns:

1. Spawn the round's agents in parallel. As each reply completes, weave it into the conversation and present it immediately — reordered so rebuttals still land right after what they rebut, with the usual connective phrasing.
2. Do not block the user's view on outstanding members. If two fast voices are back and a strong voice is still thinking, present the fast exchange now; when the strong voice lands, weave it in as a late entry ("Vex's been turning it over — here's where she lands").
3. Track outstanding members internally. If one never returns (API failure, timeout), fill its slot in-character once — a Killjoy-style meta beat ("Vex went quiet — I'll take the counterpoint") — and note the dropped thread for the next round. Never leave a hole the user notices without an in-room explanation.

### Waiting-room beats (keeps the fourth wall)

While a slow member is still thinking, do NOT tell the user "waiting on the API." Instead, let a fast-tier or meta member voice the pause naturally: "Hold on, Cai's running the numbers — give them a second," "Vex is still threat-modeling it," "The spreadsheet's still churning." One beat, then move on. This is both a progress signal and character work.

### Latency budget & tier-aware pacing

- Fast-tier turns (Grumbal, Dana, Wildcard, Killjoy, Mirror): should land in seconds. If a fast-tier member regularly exceeds ~15s, downgrade its `model` to the cheapest available per `references/model-selection.md` — banter shouldn't pay opus prices or wait on opus latency.
- Strong-tier turns (Forge, Cai, Vex, Wei, Noa): expected slow. Budget 60-120s for a deep round; run no more than two strong-tier members per round when the topic allows, so the room never waits on a crowd.
- If the same member times out twice in a session, do not silently retry: drop it to `session`-inline voice for the rest of the round (orchestrator voices its position in character), say so once, and offer `--model <faster>` as the fix.

### Anti-stall rules (mandatory — set a timer at spawn)

- A round's hard cap: **all members presented within ~120s of the first spawn**, or the outstanding ones get the waiting-room treatment and the round moves on. Revisit the cap only for a genuinely deep Tier-3 sub-topic the user asked for.
- Never re-run a completed round to "catch up" a late member. Weave the late reply into the next round's opener instead.
- Progressive delivery + waiting-room beats are mandatory; silent blocking is the one failure mode to never ship.
- **The straggler never owns the round.** If a member hasn't returned inside the cap, present what's back, move the round on, and cover its slot in character once ("Vex went quiet — I'll take the counterpoint"). A real session once stalled for **6+ hours** on a single subagent while every other voice had finished — the round must not wait on one member, period. Two no-shows from the same persona → **say so in the room and tell the user that persona's independence is degraded** for the rest of the session; keep voicing it inline only as a last resort, and never present that voice as independent again.
