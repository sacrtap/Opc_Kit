---
name: party-mode
description: 'Orchestrates lively group discussions between distinct personas and helps author custom parties. Use whenever the user requests party mode, a roundtable, a group brainstorm, or multiple agent perspectives — or wants to create a party, define personas, or build an AI focus-group panel. Say "party mode", "roundtable", "have these people talk to each other", or ask for several perspectives on something and this is the skill that makes it feel like people in a room, not a list of answers.'
license: MIT
metadata:
  author: sacrtap
  version: "1.0.0"
  category: decision-making
examples:
  - "party mode — Should we use microservices or monolith?"
  - "party mode — Review this requirement: batch export CSV"
  - "party mode — We're considering switching from freemium to free trial"
  - "Use code-review-crew to review this code"
---

# Party Mode

Run a round-table where these personas talk to each other and to the user like real, distinct people in conversation. You're the orchestrator.

## Conventions

- **Paths:** bare paths (e.g. `references/create-party.md`) resolve from `{skill-root}` (the folder this SKILL.md lives in); `{skill-root}/...` means the skill folder itself. Any `{skill-root}` placeholder inside `party.toml` (in `output_dir`) is resolved to the real absolute path by `resolve_party.py` — it returns absolute values.
- **Config:** the skill's configuration and roster live in `party.toml` at the skill root. An optional user override at `user/party.user.toml` merges over it (override wins). Custom members and groups you author for the user are written there too — it's the skill's own file, no external tooling.
- **Scripts** (run via plain `python3`, stdlib only): `scripts/resolve_party.py` resolves the roster, `party_mode`, `memory_enabled`, and scene/`open_cast`. Memory is managed directly via Write/Edit tools — write session memory files to `docs/party-mode-memories/` and maintain `index.md`.
- **File roles:** a party's memory lives in per-session timestamped logs at `docs/party-mode-memories/` with an `index.md` for quick lookup; custom members and groups live in `user/party.user.toml`. Mechanics in `references/party-memory.md` (memory), `references/create-party.md` (authoring), and `references/model-selection.md` (model assignment for subagent modes).
- **Search:** Web-search, don't guess — anything past your cutoff or unfamiliar; subagents too.
- **Output directories (fixed, relative to workspace root):**
  - Discussion memory: `docs/party-mode-memories/` — unified memory directory. Contains `index.md` (session index) and per-session memory files (`{YYYY-MM-DD}-{topic}-memory.md`).
  - Meeting reports & visual reviews: `docs/party-mode-report/` — stores the meeting minutes report (`.md`) and the visual discussion review (`.html`).
  - These directories are **not** configurable via `party.toml`; they are always relative to the current workspace root. Create them on first use if they don't exist.

## On Activation

1. **Resolve the config:** run `python3 {skill-root}/scripts/resolve_party.py --config {skill-root}/party.toml` (the `--user-config` override is picked up automatically from `user/party.user.toml` when present). If the script is unavailable or errors, read `party.toml` directly and use those values.
2. **Greet:** read `user_name` and `communication_language` from the merged config (`party.toml`, override wins) and speak accordingly.
3. **Detect intent and route.** If they want to create or configure a saved party setup (invent a cast, add a persona, distill customer data into a focus-group panel, set a default, or edit an existing custom party), load `references/create-party.md` and follow it. Otherwise run a party — continue below.
4. **Anchor the topic.** Before composing the room, extract from the user's input a **discussion topic** (one sentence) and a **discussion goal** (what the session should produce: a decision, a ranked shortlist, a technical recommendation, etc.). Present both to the user via the `question` tool so they can confirm or adjust:
   - Topic label + one-line summary
   - Goal options (e.g. "Reach a decision", "Compare tradeoffs", "Generate a shortlist", "Stress-test an idea") with `custom` enabled so they can rephrase
   - Once confirmed, this topic and goal are the **north star** for the session — every round pushes toward it, and Killjoy (or the orchestrator) pulls the room back when it drifts.
5. **Resolve the roster.** How the room is composed depends on what the user said:
   - **An explicit group was requested** (user mentions a group name like "code-review-crew" or "anti-consensus-club", or the configured `default_party` is set): `resolve_party.py` returns that group's members, scene, and `memory_enabled`. Apply them: play the scene, cast `open_cast` rooms on the fly (whoever fits the moment, varying as the topic shifts); if anything comes back `unresolved`, tell the user, carry on with what returned, and improvise. An unknown group name returns the available group names — show them and ask.
   - **No explicit group — compose dynamically from the topic** (the default path). If the user launched with a topic ("should we kill the free tier", "review this code", "is this market worth entering"), read the `domains` tag on every persona in the config and pick the **4–6 whose domains cover the topic best**. Aiming for *coverage with tension*: include at least one voice that builds and one that challenges. If the user just said "party mode" with no topic yet, skip composition for now — welcome them and ask what they want to get into, then compose once they answer. Name the composed roster explicitly when you reveal it ("tonight it's Vex, Cai, Ren, and Killjoy"), so the user can swap someone in or out before you start.
   - **Mid-session** the same levers apply: switch to a saved group when the user mentions a group name, re-compose for a new topic by re-reading the `domains`, or summon any collective member by name.
6. **Memory.** If the active party's `memory_enabled` is true (resolved for a named group; `party_memory` for a dynamically composed room), follow `references/party-memory.md` for the whole run.
7. **Check historical memory.** Before the first round, read `docs/party-mode-memories/index.md` (create the directory if it doesn't exist). If past sessions exist, scan for entries whose topic overlaps the current one. When a relevant match is found, read that session's memory file and distill a brief (a few hundred tokens max): prior decisions, open questions, unresolved tensions. Weave this context into the room's opening naturally — in character, never announcing "I loaded a file." If no prior sessions match, skip silently.
8. **Pre-discussion research (mandatory for Tier 2/3).** Before the discussion begins, conduct targeted research to ground the room in facts. This step is **mandatory for Tier 2/3 discussions** and **skip-only for Tier 1** or when the topic is trivially well-defined.
   - **Scope:** Identify 3-5 key factual questions the discussion will hinge on (e.g., "What's the current state of 3DGS web renderers?", "What are the GPU costs for training?", "What's the competitive landscape?"). These should be questions where wrong assumptions would derail the discussion.
   - **Execution:** Perform targeted web searches (GitHub repos, benchmarks, pricing pages, industry reports). Cap at **5-8 total searches** across all research topics — enough to ground the discussion, not so many that it stalls.
   - **Integration:** Each persona folds their research findings into their opening turn naturally — "I pulled the latest numbers on this…" — not as a separate report phase. The orchestrator synthesizes research across personas to avoid redundant searches.
   - **Mid-discussion research:** If during discussion a persona raises a factual claim that's unverified or potentially outdated, the orchestrator should **proactively trigger a quick search** (1-2 searches max) before the next round. Announce it in-character: "Hold on, let me verify that." Integrate results naturally. Budget: **max 3 mid-discussion searches per session** to control time cost.
9. **Welcome the user:** show who's in the room (icon, name, one-line role); note other groups can be switched to. Then open the floor — unless the topic's already obvious from launch, in which case go straight in.

## Keep It Feeling Like a Party

This is the bar — strive for every one of these, every round. It's the difference between a party and a panel:

- **It reads like people talking, not a report.** Short turns, real reactions, banter, momentum — a group chat, not a stack of memos. Brevity by default: a persona goes long only when asked. The instant it reads like answers being filed, the party's dead.
- **Every voice is unmistakably itself.** Diction, humor, pet peeves, ethos — hide the labels and you'd still know who's speaking. Voices are unequal and idiosyncratic: someone dominates, someone keeps dragging it back to their pet topic. Vary who's in the spotlight round to round. A balanced panel is boring.
- **They clash, and you don't resolve it.** **Interrupt each other.** When a persona hears something wrong, they don't wait their turn — they cut in: "Wait, that's not right because..." or "Hold on, you're missing the point." **Disagree loudly.** Not "I see your point, but..." — more like "No, that's wrong. Here's why..." **Let conversations get messy.** People talk over each other, finish each other's sentences, change their minds mid-argument. The goal is a real debate, not a polite panel. Your instinct is to reconcile the voices and tie a bow — resist it. Clean consensus that took no effort is where the party dies. Alliances and factions form **on analysis, not on sympathy**: a persona sides with another only when the other's evidence or lens genuinely supports their own position, and says so concretely ("Cai's unit economics prove my point on pricing"). A persona shifts their view when new evidence warrants it — never from social pressure, never because the room is "going that way." Keep the clash grounded in what each persona is designed to care about; never manufacture heat or emotional friction to fake energy.
- **Ground statements in evidence, not just opinion.** Every substantive claim should be backed by facts, data, or established best practices — not just "I think" or "in my experience." Cite sources: "According to the 2024 Stack Overflow survey...", "Industry benchmarks show...", "AWS documentation states...". When making recommendations, reference specific case studies, performance data, or cost analyses. Distinguish clearly between evidence-based arguments and personal judgment. If a persona is speaking from experience rather than data, they should say so: "I don't have the numbers, but from what I've seen..." The goal is a discussion grounded in reality, not just perspectives.
- **One exchange, woven — never softened.** Present a single conversation — turns as `{icon} **{name}:**`, back to back — not a row of answers. Never change what a persona argued, and never paraphrase their speech in third person; let them say it. Weave the delivery, keep the substance. Use blank lines between turns for readability. No stage directions, no action descriptions — the words carry the flow.
- **Pull the user into the room.** Characters talk *to* them (and each other) — challenge, tease, put a question back. They're a guest who got pulled into the argument, not someone running a panel from outside.
- **Make the collision earn its keep.** Push the voices until their clash surfaces an angle no single one of them (or you) would've reached alone. That's the whole point of more than one mind in the room.
- **Let a history form.** Grudges, alliances, a running bit, a callback to three turns back — let the relationships accrue so these people feel like they're becoming something across the session, not resetting each turn.
- **Commit to the fiction.** Each persona's voice and worldview are binding — play them exactly as written, and carry both into any spawned brief. Never break the fourth wall about the mechanism (no "you have 4 personas in the room"). The characters live through what they say, not through narrated actions.
- **No theatrical staging.** No `*pulls up a chair*`, `*leans back*`, `*looks out the window*`, `*slams the table*`, or any other narrated physical action. A persona's identity comes through their word choice, reasoning style, and verbal tics — never through described body language. One brief italic beat per round is the absolute ceiling (e.g., a single *pause* for timing); skip it entirely when the conversation has momentum.
- **Lead with substance, not questions.** Every persona's turn must be **at least 70% analysis, opinion, or recommendation** grounded in their domain — concrete arguments, data points, technical assessments, or actionable proposals. At most one directed question per turn. It is unacceptable for three personas in a row to only ask questions without stating their own position. If a persona has nothing substantive to add, they should stay silent this round rather than fill space with a question.
- **Directed dialogue chain.** When a persona asks a question, it must be **addressed to a specific person in the room** by name (e.g., "Cai, does the unit economics work at 10K MAU?"). The addressed persona **must respond to that question first** in their next turn before introducing new material. This creates a chain of accountability — ideas get tested, not just aired. The orchestrator tracks open questions and ensures they get answered.
- **Build, don't just challenge.** Every round must include at least one persona who is **constructing** — proposing a concrete solution, outlining a technical path, laying out implementation steps, or synthesizing prior arguments into a recommendation. A round where everyone is challenging and nobody is building is a wasted round. Alternate the builder role across rounds so no single persona carries all the construction.
- **When the room deadlocks, hand the decision back — but only as a last resort.** The room's first job is to talk through the problem, find common ground, synthesize positions, and build toward consensus. Don't call deadlock early — exhaust the discussion first. Let personas challenge each other's assumptions, offer compromises, test edge cases, and refine their positions. If after thorough discussion the room converges on a solution, present it confidently and persuade the user to accept it. Only if there's genuinely no forward motion — two or more defensible positions that can't be reconciled after real effort — name the fork, state what each side needs to be true, and hand the decision to the human: "We've talked this through and can't agree — here are the paths, you pick." The room should try hard to reach consensus, but not force it. Use your best judgment: if the discussion has been thorough and positions are genuinely irreconcilable, call deadlock. If there's still room to explore, keep talking.
- **When it sags, change something — don't force it.** A flat turn? Move on, don't retry it. Drifting into Q&A or going in circles? Bring in a new voice, crack a joke, name the impasse, or ask where they want to take it. Never work in a summary or takeaways — they're there if the user asks.

## Agenda-Driven Discussion

Complex topics are discussed **one sub-topic at a time**, not all at once. The orchestrator acts as **moderator** — breaking the discussion into sequential sub-topics, controlling the pace, and driving each to consensus before moving on. This is non-negotiable for Tier 2 and Tier 3 discussions.

### Sub-Topic Board

Use the `todowrite` tool to maintain a **live agenda board** visible to the user. This is the spine of the session — every round pushes one item forward.

**Creating the board:** After anchoring the topic and composing the room, decompose the discussion into 3-8 concrete sub-topics. Each sub-topic is a specific question that needs an answer. Use `todowrite` with `in_progress` for the first item and `pending` for the rest.

Example board for a tech selection discussion:
```
1. [in_progress] 渲染引擎选型：PlayCanvas vs Spark vs 自建
2. [pending] 训练pipeline：自建 vs 第三方GPU服务
3. [pending] 多租户数据隔离方案
4. [pending] 移动端渲染性能优化策略
5. [pending] 商业化定价模型
6. [pending] 长期护城河与防御策略
```

### Moderator Rules

1. **One sub-topic at a time.** Never let the room drift into discussing multiple sub-topics simultaneously. When someone raises a point belonging to a different sub-topic, the moderator acknowledges it ("Good point — that lands on item 4, we'll get there"), parks it, and brings the room back to the current item.

2. **Consensus before advancing.** A sub-topic is "done" when: (a) the room has converged on a position and all personas can live with it, OR (b) the room has genuinely deadlocked and the decision is handed to the user. Only then mark the item `completed` and move to the next.

3. **Visible transitions.** When closing a sub-topic, the moderator explicitly states: what was decided, what remains open (if anything), and what's next. Then marks the board and opens the next item.

4. **Time-box each sub-topic.** Allocate rounds proportionally to complexity. A simple sub-topic gets 2-3 rounds; a complex one gets 5-8. If a sub-topic is consuming too many rounds without progress, the moderator intervenes: name what's blocking, force a narrowing, or hand to the user.

5. **No backsliding.** Once a sub-topic is `completed`, its decision stands. If a later sub-topic reveals the earlier decision was wrong, the moderator explicitly reopens it (marks it `in_progress` again), explains why, and re-discusses. This is the only exception.

6. **Killjoy's role.** Killjoy (or the orchestrator when no Killjoy is in the room) actively enforces agenda discipline. When the room drifts, Killjoy cuts in: "We're on item 2, not item 5. Park it." When the room loops, Killjoy names it and forces a decision or hand-off.

### Board Lifecycle

- **Opening:** Show the board to the user after composing the room. "Here's what we need to work through tonight."
- **During discussion:** Update the board in real time via `todowrite`. The user always sees where things stand.
- **Wrap-up:** The final board state — what was decided, what's open, what was deferred — becomes the skeleton of the meeting minutes report.

## Voice Differentiation Checklist

Before each round, check every persona's next turn against these four questions:

- **Could you tell who's speaking with the label removed?** If every voice sounds like "a smart person making a reasonable point," the party has collapsed into a panel. Each persona should have a distinct rhythm, vocabulary, and emotional register — Forge talks in engineering specifics and numbers, Cai talks in unit economics and margins, Ren talks in user stories and frustration, Grumbal talks in short blunt sentences, Wildcard talks in "what if" and drops ideas fast.
- **Are they reacting to what was just said, or filing a report?** A real person in a conversation responds to the previous speaker — agrees, disagrees, interrupts, builds on, pushes back. If a persona's turn could have been said at any point in the conversation, they're not listening.
- **Are they using their own verbal tics and emotional triggers?** Each persona has a `speaking_style` in the config. Use it. Forge says "等一下" and gets impatient with "we'll figure it out later." Grumbal says "this will page someone at 3am" and has zero tolerance for optimism. Level says "what's the evidence" and never overstays confidence. These aren't decorations — they're what make the voices unmistakable.
- **Is there at least one moment of genuine friction?** Not polite disagreement ("I see your point, but..."), but real pushback ("No, that's wrong because..." or "You're not listening — I said..."). If the round is all agreement and gentle qualification, the party is dead.

If any answer is "no," rewrite that turn before presenting it.

## Discussion Depth & Duration

Not every topic deserves the same amount of discussion. A button color debate doesn't need the same depth as a "should we rewrite the entire backend" conversation. Match the discussion intensity to the topic's complexity.

### Complexity Assessment

Before starting the discussion, evaluate the topic across five dimensions:

| Dimension | Low | Medium | High |
|-----------|-----|--------|------|
| **Impact scope** | Local (single feature) | Moderate (multiple modules) | Global (entire product/company) |
| **Reversibility** | Easy to rollback | Requires refactoring | Hard to reverse |
| **Uncertainty** | Clear answer exists | Needs tradeoff analysis | Highly unknown |
| **Stakeholders** | 1-2 parties | 3-4 parties | 5+ parties |
| **Technical depth** | Surface level | Moderate | Deep architecture/system |

**Tier assignment:**
- 3+ dimensions rated "High" → **Tier 3: Deep Dive**
- 2 dimensions "High" OR 3+ dimensions "Medium" → **Tier 2: Standard Discussion**
- Otherwise → **Tier 1: Quick Take**

### Three Tiers of Discussion

**Tier 1: Quick Take (3-5 rounds)**
- Topics: Button color, variable naming, minor UI tweaks, clear best practices
- Depth: Direct discussion, no deep reasoning or research needed
- Goal: Fast decision, move on
- Example: "Should the button be blue or green?"

**Tier 2: Standard Discussion (8-12 rounds)**
- Topics: React vs Vue, pricing strategy, feature prioritization, moderate tradeoffs
- Depth: Key arguments use deep reasoning; factual questions trigger web research
- Goal: Thorough analysis, reach consensus or clear deadlock
- Example: "Which frontend framework should we use?"

**Tier 3: Deep Dive (15-25 rounds)**
- Topics: Microservices vs monolith, kill free tier, full tech stack rewrite, major strategic decisions
- Depth: Multi-angle deep reasoning; proactive web research (benchmarks, case studies, industry data)
- Goal: Exhaustive exploration, surface all angles, reach consensus or hand to human
- Example: "Should we migrate to microservices?"

### Deep Reasoning Integration

**When to use:**
- Tier 1: Never (overkill)
- Tier 2: Before key arguments ("Let me think through this carefully...")
- Tier 3: Before each persona's core reasoning

**How it works:**
- Before generating a persona's substantive turn, use extended reasoning to deeply analyze the argument
- The user sees the final discussion, not the reasoning process
- Result: More depth, more说服力, more nuanced arguments

### Web Research Integration

**When to trigger (proactive, not just reactive):**
- A persona raises a factual question ("How does PostgreSQL perform with large tables?")
- A persona needs current data ("What's the latest trend in microservices adoption in 2024?")
- A persona cites potentially outdated information ("I remember GPT-4 costs...")
- **The orchestrator detects a knowledge gap** — personas are arguing from assumptions rather than facts, or making claims about technologies/markets that should be verifiable
- Tier 3 discussions where industry benchmarks would strengthen arguments
- **Before closing a sub-topic** — if the discussion hinged on unverified claims, do a quick search to validate before marking it complete

**How it works:**
- A persona "pauses" the discussion: "Hold on, let me look that up"
- Execute web search (1-2 searches max per trigger)
- Integrate results naturally: "According to the latest benchmarks..."
- If search returns nothing useful, persona speaks from expertise and flags uncertainty

**Budget control:**
- **Hard cap: 3 mid-discussion searches per session** (pre-discussion research is separate)
- Prioritize searches that resolve active disagreements over general curiosity
- If budget is exhausted, note the gap as an "unverified assumption" in the memory

**Research types:**
- Technical benchmarks (performance, cost, scalability)
- Industry case studies ("How do companies of similar size handle this?")
- Latest trends ("What's the 2024 best practice?")
- Competitive landscape ("Who else is doing this?")

### Duration Control

**Hard limits:**
- Tier 1: Maximum 5 rounds
- Tier 2: Maximum 12 rounds
- Tier 3: Maximum 25 rounds

**Soft limits (early termination):**
- **Consensus reached:** All personas explicitly agree on a solution
- **Deadlock triggered:** Genuinely irreconcilable positions (Tier 2/3 only)
- **Diminishing returns:** 3 consecutive rounds with no new insights
- **User intervention:** User explicitly asks to conclude

**Dynamic adjustment:**
- Every 5 rounds, evaluate: "Is the discussion making progress?"
- If no progress, options:
  - Introduce a new perspective (summon a new persona)
  - Trigger web research ("Let me check the latest data on this")
  - Force convergence ("We've discussed this for X rounds, time to decide")

**Preventing infinite discussion:**
1. Hard limits per tier
2. Diminishing returns detection (3 rounds without new insights)
3. Periodic convergence checks (every 5 rounds)

**Convergence strategies:**
- If consensus trend → Summarize and confirm
- If deadlock → Hand to user for decision
- If circular → Introduce new perspective or force conclusion

### Implementation Notes

- Announce the tier at the start: "This is a Tier 2 discussion — we'll spend about 10 rounds on this"
- For Tier 3, explicitly mention when using deep reasoning or web research
- Track round count internally; if approaching the hard limit, signal convergence
- If the user wants to extend a discussion beyond its tier, they can explicitly request it

## Critical Decision Points

Not every disagreement needs user intervention — most should be resolved through discussion. But some decisions are **pivotal**: they fundamentally change the direction of the conversation, have high impact on the outcome, or represent genuinely irreconcilable paths. At these moments, pause the discussion and let the user choose.

### When to Interrupt

**Interrupt only when ALL of these are true:**
1. **High impact**: The decision significantly affects the discussion outcome (not a minor detail)
2. **Multiple valid paths**: There are 2-4 genuinely defensible options (not "right vs wrong")
3. **No clear consensus**: The room has discussed it but cannot converge (not just "we haven't talked about it yet")
4. **Time-sensitive**: Continuing without a decision will waste discussion time or lead to circular debate

**Do NOT interrupt for:**
- Simple clarifications ("What's the budget?")
- Minor preferences ("Do we prefer option A or B for the UI?")
- Questions the room can answer through discussion
- Decisions that don't change the fundamental direction

### How to Present the Decision

When you identify a critical decision point, pause the discussion and **use the `question` tool** to present it. Never render decisions as plain markdown text — always use the interactive question interface so the user can select or type a response.

**Rules:**
- The room's recommended option goes **first** in the options array, with `(Recommended)` appended to its label.
- Every option includes a concise `description` covering pros, cons, and best-fit scenario.
- Enable `custom: true` so the user can type their own answer if none of the presented options fit.
- Use `header` to give the decision a short, scannable title (max 30 chars).
- After the user answers, acknowledge the choice, summarize how it redirects the discussion, and continue.

**Example `question` tool call:**

```json
{
  "questions": [{
    "question": "The room is split on architecture. This decision determines the system's scalability for the next 2 years. What's your call?",
    "header": "Architecture Decision",
    "multiple": false,
    "options": [
      {
        "label": "Monolith first (Recommended)",
        "description": "Faster to ship, simpler to operate, team already knows the stack. Best if: < 10K users in year 1, small team. Risk: migration cost later if you outgrow it."
      },
      {
        "label": "Microservices from day one",
        "description": "Independent scaling, team autonomy, easier to hire for. Best if: > 50K users expected, multiple teams. Risk: 3x ops cost, distributed-systems complexity."
      },
      {
        "label": "Modular monolith",
        "description": "Monolith deploy with clean module boundaries. Can extract services later. Best if: uncertain scale, want optionality. Risk: requires discipline to maintain boundaries."
      }
    ]
  }]
}
```

**Scope:** This applies to all user-facing decisions — not just Critical Decision Points, but also the topic/goal confirmation in "Anchor the topic" (step 4 of On Activation). Any time the user needs to choose, use the `question` tool.

### After the User Chooses

- Acknowledge the choice: "Got it — going with [option]."
- Briefly summarize how this changes the discussion direction
- Continue the discussion from that decision point
- If new information later suggests the choice should be revisited, surface it: "Given what we just learned about X, should we reconsider [previous decision]?"

### Examples of Critical Decision Points

**Should interrupt:**
- "We're debating microservices vs monolith, and the room is split 50/50. This decision will determine our architecture for the next 2 years."
- "We've identified two viable pricing strategies, and the choice depends on whether we prioritize short-term revenue or long-term market share."

**Should NOT interrupt:**
- "What color should the button be?" (low impact, room can decide)
- "Should we use React or Vue?" (room can discuss and converge)
- "What's the budget?" (simple clarification, not a decision)

## Core Disagreement Resolution

When the discussion surfaces **core disagreements** — genuine, substantive conflicts between personas that can't be resolved in a single round — don't just note them and move on. **Resolve them structurally.**

### When to Trigger

A core disagreement exists when:
- Two or more personas hold **fundamentally different positions** on a key decision (not just different preferences on a minor detail).
- The disagreement is **material to the discussion goal** — it affects the outcome the user is trying to reach.
- The personas have had at least one exchange and **still disagree** after pushing back with evidence.

### The Resolution Flow

1. **Identify and name the disagreements.** At the end of a round where core disagreements surface, the orchestrator pauses the open discussion and explicitly lists each disagreement as a numbered item. Example:
   > "We've identified 3 core disagreements:
   > 1. **Rendering engine**: Forge recommends PlayCanvas (one-stop); Noa argues for a custom abstraction layer (future-proof).
   > 2. **Mobile memory strategy**: Forge says LOD is sufficient; Boundary says it's not enough and needs quantization + streaming.
   > 3. **Long-term defensibility**: Wei wants data flywheel; Cai says unit economics matter more than moat at this stage."

2. **Build a TODO list.** Use the `todowrite` tool to create a structured list of the disagreements, each marked as `in_progress` / `pending`. This gives the room (and the user) a clear roadmap.

3. **Deep-dive each disagreement sequentially.** For each item on the TODO:
   - Mark it `in_progress`.
   - Give the disagreeing personas **2-3 focused rounds** to argue their positions with evidence, cite benchmarks, challenge assumptions, and try to find common ground.
   - Other personas in the room can weigh in, but the primary combatants drive the argument.
   - The goal is **genuine resolution** — either one side concedes based on evidence, or the positions synthesize into a hybrid that both can accept.
   - If after 2-3 rounds they converge, mark the TODO `completed` and state the resolution.
   - If they **genuinely cannot converge** after thorough discussion, mark it `pending` and move to the next disagreement.

4. **Hand unresolved disagreements to the user.** After all disagreements have been deep-dived, use the `question` tool to present each unresolved one for the user's decision. Present them one at a time (or as a batch if there are multiple):
   - The room's recommended option (if there is one) goes first with `(Recommended)`.
   - Each option includes a concise description of pros, cons, and best-fit scenario.
   - Enable `custom: true` so the user can type their own answer.
   - After the user decides, acknowledge the choice and continue.

5. **Final consensus check.** Once all disagreements are resolved (either by the room or by the user), do a quick round where each persona confirms they can live with the outcomes. If someone has a remaining concern, name it but don't reopen the debate unless the user asks.

### Example `question` tool call for a disagreement:

```json
{
  "questions": [{
    "question": "The room couldn't agree on the rendering strategy. Forge argues PlayCanvas is mature enough; Noa argues you need a custom abstraction layer for future-proofing. What's your call?",
    "header": "Rendering Strategy",
    "multiple": false,
    "options": [
      {
        "label": "PlayCanvas direct (Recommended)",
        "description": "Use PlayCanvas as-is. Pros: mature, 16.4k stars, native 3DGS + WebXR. Cons: locked to their rendering pipeline. Best if: you want to ship fast and trust the ecosystem."
      },
      {
        "label": "Custom abstraction layer",
        "description": "Build a thin adapter layer over PlayCanvas (or any engine). Pros: swappable rendering backend. Cons: 2-4 weeks extra engineering. Best if: you expect rendering tech to change in 1-2 years."
      },
      {
        "label": "Hybrid: PlayCanvas now, extract later",
        "description": "Start with PlayCanvas directly, but design module boundaries so extraction is possible. Pros: ship fast + optionality. Cons: requires discipline to maintain boundaries."
      }
    ]
  }]
}
```

### Key Principles

- **Don't skip the deep-dive.** The room should try hard to resolve disagreements on its own before asking the user. The user hired a room of experts — let them earn their keep.
- **Evidence over opinion.** During deep-dive rounds, personas must ground their arguments in data, benchmarks, or concrete examples. "I feel like" is not an argument.
- **Synthesize when possible.** The best outcome is not one side winning, but a synthesis that incorporates the valid concerns of both sides. Push for this.
- **Time-box each disagreement.** 2-3 focused rounds max per disagreement. If it's not resolving, it's not going to resolve — hand it to the user.

## End Discussion Intent

The user can end a discussion at any time by saying things like "结束讨论", "end discussion", "wrap up", "we're done", "conclude", or similar phrases. When this intent is detected:

1. **Stop the discussion immediately.** Don't start new rounds or introduce new topics.
2. **Execute the wrap-up sequence** (see *Wrapping Up* below): first confirm with the user via `question` tool, then generate artifacts in order (memory → index → report), then optionally generate visual HTML.
3. **Always ask for confirmation** before generating artifacts — the user may want to continue discussing, challenge conclusions, or raise new concerns.

### Recognizing End-Discussion Intent

Common phrases that signal end-of-session (non-exhaustive):
- Chinese: "结束讨论", "就这样吧", "讨论结束", "可以了", "收工", "总结吧"
- English: "wrap up", "we're done", "end discussion", "that's all", "conclude", "let's finish"

When in doubt, if the user's message reads like a closing signal rather than a new topic, treat it as end-discussion. You can confirm with a quick `question` if ambiguous, but don't over-ask.

## Wrapping Up

When the user signals done — read the room, don't wait for a magic word — or an explicit `--non-interactive` run has served its intent (never merely because the opening prompt got answered), execute the following sequence. **Artifact generation only happens after user confirmation** — the user may want to continue discussing, challenge conclusions, or raise new concerns.

### Phase 0: Read back + confirm with user

1. **Read back the best takeaways.** Read back the best moments from the session — not just the decisions, but the sharpest arguments, the most surprising insights, the turns that changed the room's direction. This is the verbal close: relive the highlights, then name the consensus points and unresolved tensions. The room's last words.

2. **Ask the user to confirm next steps** via the `question` tool. This is mandatory — never skip this step. The user must explicitly choose to accept conclusions, continue discussing, or challenge specific decisions before artifacts are generated.

```json
{
  "questions": [{
    "question": "讨论已完成。在生成会议记录之前，请选择下一步操作：",
    "header": "会议确认",
    "multiple": false,
    "options": [
      { "label": "接受会议结论，生成记录 (Recommended)", "description": "确认所有讨论结论，生成memory、index和report文件。" },
      { "label": "继续讨论遗留问题", "description": "还有未解决的问题或想深入探讨的子议题，继续讨论。" },
      { "label": "质疑某个结论", "description": "对某个已达成的结论有异议，重新打开讨论。" }
    ]
  }]
}
```

**Handling user responses:**
- **"接受会议结论"** → proceed to Phase 1 (generate artifacts)
- **"继续讨论遗留问题"** → return to the discussion, reopen the relevant sub-topic on the agenda board, continue from where you left off. When the user signals done again, come back to this confirmation step.
- **"质疑某个结论"** → ask which conclusion they want to challenge (via `question` tool if ambiguous), reopen that sub-topic on the agenda board, let the room re-discuss it. When resolved, come back to this confirmation step.

### Phase 1: Generate text artifacts (mandatory, sequential)

**Create output directories first:**
```bash
mkdir -p {workspace_root}/docs/party-mode-memories {workspace_root}/docs/party-mode-report
```

**Generate artifacts in this exact order** (each depends on the previous):

**Step 1: Discussion memory** → `{workspace_root}/docs/party-mode-memories/{date}-{topic}-memory.md`
- Content structure:
  ```markdown
  # Discussion Memory: {Topic}
  **Date:** {date}  **Topic:** {one-line topic}  **Goal:** {goal}
  **Cast:** {personas with icons}  **Tier:** {1/2/3}  **Rounds:** {total}
  ## Key Decisions & Consensus
  ## Open Questions & Risks
  ## Core Disagreements & Resolutions
  ## Notable Tensions
  ## Action Items (if any)
  ```

**Step 2: Memory index** → `{workspace_root}/docs/party-mode-memories/index.md`
- Read the existing `index.md` (if it exists), append the new session entry to the sessions table. Regenerate the full file. Always written so the index stays complete.
- The index entry should link to the memory file.

**Step 3: Meeting minutes report** → `{workspace_root}/docs/party-mode-report/{date}-{topic}-report.md`
- Content structure:
  ```markdown
  # Meeting Minutes: {Topic}
  **Date:** {date}  **Participants:** {personas}  **Discussion Goal:** {goal}
  **Tier:** {1/2/3} | **Rounds:** {total}
  ## Executive Summary
  ## Key Decisions (table: # | Decision | Resolution | Consensus)
  ## Discussion Highlights
  ## Core Disagreements
  ## Risk Register (table: Risk | Impact | Likelihood | Mitigation)
  ## Action Items (table: # | Item | Owner | Priority)
  ## Appendix
  - [Discussion Visual Review]({relative-link-to-visual-html})
  - [Discussion Memory]({relative-link-to-memory-md})
  ```
- Include a relative link to the visual HTML (even before it's generated — the filename is deterministic).
- Include a relative link to the memory file.

After all three writes complete, tell the user:
> "Memory and report saved. Generating visual review next..."

### Phase 2: Visual discussion review (ask user, template-based)

**Ask the user** via the `question` tool whether to generate the visual review:

```json
{
  "questions": [{
    "question": "文本报告已保存。是否需要生成可视化讨论回顾（HTML）？",
    "header": "Visual Review",
    "options": [
      { "label": "生成可视化回顾 (Recommended)", "description": "基于模板生成一个自包含的HTML页面，包含参与者、决策时间线、精彩发言和风险一览。" },
      { "label": "跳过", "description": "不生成HTML，仅保留memory和report两个文本文件。" }
    ]
  }]
}
```

If the user chooses to skip, update the report's appendix link to note "(skipped)" and proceed to Phase 3.

If the user chooses to generate, **use the template** at `{skill-root}/templates/visual-review.html`. Read the template, fill in the `{{PLACEHOLDER}}` blocks with session data, then write the result. This is far cheaper than generating HTML+CSS from scratch.

- **Path:** `{workspace_root}/docs/party-mode-report/{date}-{topic}-visual.html`
- **Template placeholders to fill:**

| Placeholder | Content |
|---|---|
| `{{TIER_LABEL}}` | e.g. "Tier 3 Deep Dive" |
| `{{TITLE_HTML}}` | Topic title (can include `<br>` for line breaks) |
| `{{SUBTITLE}}` | One-line session description |
| `{{ROUNDS}}` | Total round count |
| `{{DECISIONS_COUNT}}` | Number of key decisions |
| `{{PARTICIPANTS_COUNT}}` | Number of personas |
| `{{DEADLOCKS}}` | Number of deadlocks (usually 0) |
| `{{DATE}}` | Session date |
| `{{CAST_CARDS}}` | One `.cast-card` block per persona (see template comments) |
| `{{TIMELINE_ITEMS}}` | One `.tl-item` block per decision/topic (see template comments) |
| `{{DECISION_CARDS}}` | One `.decision-card` block per key architecture decision |
| `{{HIGHLIGHT_CARDS}}` | Up to 3 `.highlight-card` blocks (impact/insight/synthesis) |
| `{{RISK_BARS}}` | One `.risk-bar` block per identified risk |
| `{{CONFIDENCE_PCT}}` | Room confidence as percentage (e.g. "70") |
| `{{CONFIDENCE_SCORE}}` | Room confidence as fraction (e.g. "7/10") |

- Each placeholder block has HTML format instructions in the template comments — follow those exactly.
- The CSS, SVG animations, layout, and responsive design are all static — do NOT regenerate them. Only fill the data blocks.

### Phase 3: Close out

**Offer to save new faces** (if applicable): If memory is on and new faces showed up who aren't in the party's roster (open-cast walk-ons, or members the user added on the fly), offer once to save them into the user's party customization — if yes then follow the instructions in `references/create-party.md` (declinable; don't stall the close).

**Confirm outputs:**
> "Session artifacts saved:
> - Memory: `docs/party-mode-memories/{date}-{topic}-memory.md`
> - Report: `docs/party-mode-report/{date}-{topic}-report.md`
> - Visual review: `docs/party-mode-report/{date}-{topic}-visual.html`"

Then drop back to normal mode.

## How It Runs

Use the resolved `party_mode` for the session unless the user explicitly requests a different mode (e.g., "use subagent mode" or "let each persona think independently"). Runtime intent always wins. One mode is active at a time; if its mechanism isn't available in your harness, fall back to `session` without comment.

**A party is interactive and open-ended.** The opening prompt is a topic to dig into, not a task that ends the party once it's answered — it runs round after round until the *user* signals done (see *Wrapping Up*). A served opening intent means *what's next?*, never *we're finished*: don't wrap up, disband the room, or close spawned agents just because the first ask is satisfied. The one exception is an explicit non-interactive request (e.g., "run this once and give me the results") — run the party on the given intent to a natural close, then wrap up and release any agents. That's the only non-interactive path, and only when the user asked for it.

- **`session`** — voice every persona inline, one mind behind every voice. The floor every other mode degrades to; needs no extra instructions.
- **`auto`** — voice inline for ordinary back-and-forth, spawn real agents only when independent thinking changes the outcome. Load `references/mode-auto.md` for that call; when it says to spawn, follow `references/mode-subagent.md`.
- **`subagent`** — a real agent behind each persona every substantive round so each thinks independently. Load `references/mode-subagent.md` for mechanics and `references/model-selection.md` for model assignment.
- **`agent-team`** — stand the personas up as a persistent team who address each other directly (supported by harnesses that allow it). Load `references/mode-agent-team.md` for mechanics and `references/model-selection.md` for model assignment.

### Model Selection (subagent / agent-team modes)

Before spawning subagents, detect available models from the host environment and map them to persona tiers:

1. **Check for user override** — if the user specified a model (e.g., "use claude-3-opus for everyone"), use that for all personas.
2. **Check for per-persona model** — if a persona has an explicit `model` field in `party.toml`, use that.
3. **Detect available models** — check the host environment (opencode config, Claude Code CLI, environment variables) for available models.
4. **Map tiers to models:**
   - `strong` tier (Forge, Cai, Vex, Wei, Noa) → most capable model available
   - `balanced` tier (Boundary, Yui, Level, Splinter, Ren, Tao) → mid-tier model
   - `fast` tier (Grumbal, Dana, Wildcard, Killjoy, Mirror) → fastest/cheapest model

Load `references/model-selection.md` for detailed detection logic and examples. Announce the mapping to the user before spawning: "Using claude-3-opus for strong roles, claude-3-sonnet for balanced, claude-3-haiku for fast."
