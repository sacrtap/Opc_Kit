# Party Memory

The room remembers its past sessions with this user and brings them back to life — in character. Memory is per-party and append-only.

Memory is on when the active party's `memory_enabled` is true — the default room follows `party_memory`, a named group its own `memory` flag (both resolved by `resolve_party.py`); ad-hoc inline casts have none. Read on entry and on any mid-session room switch; write through the session.

## Where it lives

All memory lives in a fixed directory relative to the workspace root: `docs/party-mode-memories/`. This directory contains:

- **`index.md`** — a quick-lookup index of all sessions. Always up to date.
- **`{YYYY-MM-DD}-{topic}-memory.md`** — structured discussion memory (decisions, open questions, tensions) per session.

This path is **not** configurable via `party.toml`; it is always relative to the current workspace root. Create the directory on first use if it doesn't exist.

## Read it on entry — distill, don't dump

Read `docs/party-mode-memories/index.md` first to see recent sessions at a glance. Then read the most relevant 1-2 session memory files (the latest, or the one matching the current topic) and distill to a compact brief — a few hundred tokens of *where things stand now*, ready to play in character. (No reader subagent available? Read the files yourself and distill to a brief.)

Then let the brief shape the room from the first beat, **in character**: behavioral state resumes (a cold pair opens cold, an alliance opens warm), threads pick up, callbacks land when they fit — organically, not recited on sight. Never break the fourth wall: the room *remembers*; it never announces it loaded anything, and forces nothing that doesn't fit.

## When to write

Memory files are written **only at session wrap-up** (see *Wrapping Up* in SKILL.md). During the session, the orchestrator tracks key decisions, tensions, and notable beats mentally — these are captured when the memory file is generated at the end.

Writes are silent. The room never announces "noted" or "I'll remember".

## What's worth remembering

The test for every entry: *would this color a future session, or make a callback land, or improve the party?* If not, leave it out. A handful of entries, never a recap, never a transcript. Keep each entry as brief as possible but usable by future LLM.

## New faces

When a character shows up who isn't in the party's roster — cast from an open-cast scene, or one the user adds on the fly — name them in the memory file's "Notable Tensions" or "Action Items" section ("<name> turned up and …") so a recurring face can return next session. At wrap-up these are the faces the room offers to keep, saved into the party's roster through `references/create-party.md`. Until saved they live only in the memory file, and the room re-conjures them from there.

## Write it

Each session has its own memory file at `docs/party-mode-memories/{YYYY-MM-DD}-{topic}-memory.md`. Write directly using the Write/Edit tools.

**At session end (during wrap-up):** Generate the memory file with the final outcome, key decisions, open questions, and notable tensions. Then **regenerate `docs/party-mode-memories/index.md`** to include the new session entry.

### index.md Format

```markdown
# Party Memory Index

| Date | Topic | Cast | Tier | Rounds | Key Decisions | Memory |
|------|-------|------|------|--------|---------------|--------|
| 2026-08-08 | [3DGS VR Platform Tech Selection](./2026-08-08-3dgs-vr-platform-tech-selection-memory.md) | Forge, Boundary, Cai, Wei, Noa | 3 | 18 | PlayCanvas, gsplat, PLG pricing | [memory](./2026-08-08-3dgs-vr-platform-tech-selection-memory.md) |
| ... | ... | ... | ... | ... | ... | ... |
```

**Every write to a memory file must be followed by a sync of `index.md`.** Read all `*-memory.md` files in the directory, extract the metadata from each, and regenerate the index table. This is mandatory — a stale index is worse than no index.

If a write errors, skip it silently and never stall the party on a failed write.

## Forget

To remove a session's memory, delete its file (`docs/party-mode-memories/{date}-{topic}-memory.md`) and regenerate `index.md`. To correct a wrong memory, edit the file in place.

Keep entries sparse. Each session file is self-contained — the index keeps the *room's overview* lean no matter how many sessions accumulate.
