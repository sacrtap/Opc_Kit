# Auto Mode

Active when the resolved `party_mode` is `auto` (or a `--mode auto` override).

**Auto is subagent-first.** The default intent is: spawn real independent agents, and fall back to inline voicing only when the harness cannot spawn or a spawn actually fails. The fallback is an exception with a mandatory announcement — not a quiet convenience.

## Order of operations

1. **Probe before the first round.** Check the harness for a spawn primitive (`task`/`agent` on omp, `Agent` on Claude Code, `spawn_agent` on Codex, per `references/tool-compatibility.md`). If there is none, auto is over before it starts — go to step 4.
2. **Spawn for substantive rounds.** Banter, reactions and connective back-and-forth can still be voiced inline for pace, but any round where independent thinking changes the answer must spawn. When in doubt, spawn — that is what this mode is for.
3. **Spawn fails mid-session?** Distinguish the two cases:
   - **One member fails** (agent closed, won't resume, timeout): respawn that member, or cover its slot in character once and note the dropped thread (`references/mode-subagent.md`, anti-stall rules). The mode is still subagent.
   - **The mechanism itself fails** (tool missing, every spawn errors, harness denies it): you are no longer in a subagent party. Go to step 4.
4. **Announce the fallback, then continue in `session`.** This is not optional and not a footnote. In the same visible turn, in the room's voice, state: (a) that subagents were intended, (b) what failed, (c) that the room now runs single-voice, so the voices are no longer independent. Example:

   > "原本这轮要放几个独立子代理出去，这个环境起不来（`task` 不可用）。降级成单脑多角色——独立性没了，后面的分歧别全信，我会尽量把反对意见说出来。"

   Then continue the session in `session` semantics for the rest of the run. Do not keep retrying spawns every round; one announced downgrade, then stay down. Record it in the session memory (`Key Decisions` or a one-line note) so the next session knows the voices weren't independent.

## What to spawn

Spawn independent agents when divergent, uncolored thinking is the value of the round:

- A genuine evaluation, review, or critique — the kind that fails if one mind voices every side and they drift into agreement (code review, red-team, a hard look at a plan).
- The personas would plausibly reach *different* conclusions, and that divergence is the point.
- The user asked someone to dig in, analyze, or research — depth earned by a direct ask.

Mechanics, roster checks, model mapping, streaming and anti-stall rules all live in `references/mode-subagent.md` — auto inherits them wholesale once it decides to spawn.

## What auto is not

- It is **not** `subagent`. `subagent` is opt-in and forced: it never downgrades, it aborts. Auto downgrades, loudly.
- It is **not** "voice inline and spawn only if convenient." The old reading — voice by default, spawn as the exception — is gone. Spawn first; fall back only on failure.
- A fallback that the user cannot see is a bug. If you cannot make a visible turn to announce it, do not run the degraded party at all.
