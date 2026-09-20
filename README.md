# Opc_Kit

> **Professional AI Agent Skill Toolkit** — From multi-persona decision debates to structured PRD output, a complete product workflow solution compatible with all AI coding agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: v2.6.2](https://img.shields.io/badge/Version-2.6.2-blue.svg)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-green.svg)]()
[![skills.sh](https://skills.sh/b/sacrtap/Opc_Kit)](https://skills.sh/sacrtap/Opc_Kit)
[![PRD Validation](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml/badge.svg)](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml)

---

## Why Opc_Kit?

Most AI tools give you a single perspective. Opc_Kit gives you a **complete product decision loop** — and the browser runtime to verify what you shipped.

- **From Debate to Document** — Use **party-mode** to simulate expert roundtables, then **create-prd** to turn decisions into structured, production-ready PRDs. Two skills, one seamless workflow.
- **Eliminate Blind Spots** — 17 professional personas covering engineering, product, and strategy challenge your assumptions before you write a single requirement.
- **Professional-Grade Quality** — Bidirectional traceability, first-principles validation, and 7-dimension scoring ensure every output meets senior PM standards.
- **Measured, Not Marketed** — **browser-with-typesafe** moves each browser decision to Jev (input-only, $0.042/Mtok). We ran the A/B against doing it directly on a 15-action flow: it cost **58.9% more and 69% longer per action**, at equal accuracy. The numbers, the per-run spread, and the reproduction command ship with the repo — including where the premise does not hold.
- **Zero Learning Curve** — Natural language triggers with automatic intent detection. No commands to memorize.
- **Universal Compatibility** — One skill set works across all AI coding agents with automatic tool adaptation. No vendor lock-in.

> ### ⚠️ One skill needs setup before it can run
>
> `create-prd` and `party-mode` are prompt-only: they work the moment they are installed.
>
> **`browser-with-typesafe` is different.** It drives a real browser through TypeSafe Jev, so it requires **Node.js 22+, a browser handle from your agent, and a Jev API key** (TypeSafe or OpenRouter). Its installer never receives your key — it writes a config template for you to fill in, then `node scripts/doctor.mjs` tells you whether the setup works. See [its guide](browser-with-typesafe-guide.md) before your first run.

---

## Skills Overview

| Skill | Purpose | Version | Quick Install | Guide |
|-------|---------|---------|---------------|-------|
| 📝 [create-prd](skills/create-prd/SKILL.md) | PRD creation, update & validation | v2.5.1 | `npx skills add sacrtap/Opc_Kit --skill create-prd` | [Usage Guide](create-prd-guide.md) |
| 🎭 [party-mode](skills/party-mode/SKILL.md) | Multi-persona product decision discussion | v1.0.0 | `npx skills add sacrtap/Opc_Kit --skill party-mode` | [Usage Guide](party-mode-guide.md) |
| 🌐 [browser-with-typesafe](skills/browser-with-typesafe/SKILL.md) | ⚠️ Browser actions via TypeSafe Jev — **needs an API key + a browser handle** | v0.1.0 | `npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe` | [Usage Guide](browser-with-typesafe-guide.md) |

---

## Quick Start

### Installation

```bash
# Install all skills
npx skills add sacrtap/Opc_Kit

# Install specific skill
npx skills add sacrtap/Opc_Kit --skill create-prd
npx skills add sacrtap/Opc_Kit --skill party-mode
npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe

# List available skills
npx skills add sacrtap/Opc_Kit --list
```

`browser-with-typesafe` needs configuration before its first run — install it, then follow
[Requirements & Setup](browser-with-typesafe-guide.md).

### Install from the omp plugin marketplace

All three skills are published as one marketplace:

```bash
omp plugin marketplace add sacrtap/Opc_Kit
omp plugin install create-prd@opc-kit
omp plugin install party-mode@opc-kit
omp plugin install browser-with-typesafe@opc-kit
```

### Basic Usage

**Use create-prd alone:**
```
/create-prd Write a PRD for user authentication feature
```

**Use party-mode alone:**
```
/party-mode — Should we use microservices or monolith? We're a 5-person team at MVP stage.
```

**Complete workflow: debate first, then document**
```
# Step 1: Stress-test the idea from multiple perspectives
/party-mode — Should we build a real-time collaboration feature for our document editor?
Tech stack: React + Node.js. Scale: 5K concurrent users. Timeline: 8 weeks.

# Step 2: Turn the decision into a structured PRD
/create-prd Based on the party-mode discussion, write a PRD for real-time collaboration
```

Two skills, one seamless workflow: from multi-perspective debate to actionable documentation.

**Verify a flow in the browser (after setup):**
```
Use browser-with-typesafe to open the settings page, expand Notification preferences,
scroll through the list, and collapse it again. Stop when the status reads collapsed,
then verify the result yourself.
```

The agent plans and verifies; Jev performs the clicks, scrolls, and paging inside the
browser session your agent already has.

---

## Skill Highlights

### 📝 create-prd — Professional PRD Writing Assistant

Transform product requirements into structured, production-ready documents with enterprise-grade quality assurance.

**Key Features:**
- **13-Chapter Standard Template** — Fixed skeleton ensuring completeness, from problem description to risk analysis
- **Bidirectional Traceability** — US↔FR 1:1 mapping, every feature traces back to a user story
- **Dual-Mode Workflow** — Coaching mode (guided interaction, ~5-10 min) or Fast mode (direct generation, ~2-3 min)
- **7-Dimension Quality Scoring** — Quantitative assessment with production-ready benchmarks (70+ = ready, 85+ = excellent)
- **Exception-Covered Flowcharts** — Mermaid diagrams with mandatory failure/timeout branches for all external calls
- **Auto Language Detection** — Chinese/English bilingual support with intelligent switching

**Example Output:**
```
User: /create-prd Help me write a PRD for user collection feature

Result:
✅ 13-chapter PRD with bidirectional traceability
✅ Mermaid flowcharts with exception paths
✅ Quality score: 82/100 (production-ready)
✅ Assumption index with 5 tagged inferences
```

📚 [Read the full guide](create-prd-guide.md) for detailed features, templates, and methodology.

---

### 🎭 party-mode — Multi-Persona Decision Discussions

Stop making critical decisions with a single perspective. Bring 17 product and engineering experts into real debates around your questions — not a pros/cons list, but a room of experts who argue, challenge assumptions, and push toward defensible conclusions.

**Use it when the cost of being wrong is high:**

| Scenario | What You Get |
|----------|--------------|
| **New product (0→1)** | Stress-test market hypotheses, validate willingness-to-pay, identify real moats before committing resources |
| **Key feature design** | Catch UX gaps, security risks, scaling issues, and delivery blind spots before development starts |
| **Architecture decisions** | Debate irreversible choices with multiple experienced architects evaluating your specific constraints |
| **Product roadmap** | Evidence-based prioritization across competing priorities with multi-lens challenge |
| **Business model** | Unit economics validation, GTM strategy evaluation, long-term defensibility assessment |

**Key Features:**
- **17 Professional Personas** — Engineering, product, and strategy experts with distinct expertise and communication styles
- **Dynamic Role Selection** — Auto-selects 4-6 most relevant experts based on your topic
- **Three Discussion Tiers** — Quick Take (3-5 rounds), Standard (8-12 rounds), Deep Dive (15-25 rounds) based on complexity
- **Four Operating Modes** — Subagent (independent thinking), Session (lightweight), Auto (hybrid), Agent-Team (persistent)
- **Evidence-Driven** — Roles cite industry data, benchmarks, and case studies, not just opinions
- **Session Memory** — Cross-session context retention, roles remember previous conclusions and alliances

**Example:**
```
/party-mode — We're building an AI habit tracking app. Target: professionals 25-40.
Hypothesis: $8/month for AI coaching. Budget: $200K, 4-person team, 6-month runway.

You'll hear:
- Cai challenging the $8/month assumption with real ARPU data for habit apps
- Ren asking if you've talked to 20 target users about their actual pain points
- Tao proposing a 2-week WhatsApp validation test before writing any code
- Wei warning that AI personalization is not a moat — every app will add GPT in 6 months
- Splinter questioning whether your target demo is even the right demographic
```

📚 [Read the full guide](party-mode-guide.md) for detailed scenarios, all personas, and advanced features.

---

### 🌐 browser-with-typesafe — Low-Cost Browser Actions

**Jev clicks. Your agent thinks and verifies.**

Two actors split one browser workflow: **your agent** plans, enters text, judges visuals, and
verifies the result; **TypeSafe Jev** chooses each next mechanical action — navigate, click,
toggle, scroll, page — inside the browser session your agent already has. Repetitive flows stop
costing one model turn per click.

> **⚠️ Requires setup.** Node.js 22+, a browser handle (omp, Codex, or any Playwright/CDP host),
> and a Jev API key. The installer never receives your key — it writes a config template for you
> to fill in. Run `node scripts/doctor.mjs` to confirm the setup. See
> [Requirements & Setup](browser-with-typesafe-guide.md).

**Key Features:**
- **Three adapters, one engine** — `omp`, `codex`, and `playwright` bind to whichever browser handle your host exposes; `detectAdapter()` picks it from real capabilities, and the decision engine never imports a host API
- **Unified accessibility IR** — every host's accessibility tree is normalized into one shape, so policy and safety rules are host-independent
- **No text entry by construction** — there is no typing action at all; you type, then resume the same session
- **Bounded by policy** — origin allowlist re-checked before every call and action, `denyNames` / `requireHostNames` keep consequential controls with you, and stale decisions are discarded rather than executed
- **Never self-certifying** — Jev returns `needs_verification`, never a pass; you check fresh state
- **Zero third-party dependencies** in the core

**Verified end to end:**

| Backend | Result |
|---|---|
| omp (`browser` prelude) | ✅ 5/5 host-side checks, 3 actions / 4 decisions, ~1.9 s |
| Playwright 1.59 (headless Chrome) | ✅ exit 0, 5/5 checks, ~2.3 s |
| Codex (`cua_repl`) | ⚠️ contract tests only — no Codex Computer Use runtime in the verification environment |

Both live runs produced the **same** action sequence, and both proved the scroll actually moved
the panel — not just that a click was issued.

**What it costs, measured on a 15-action flow** — three samples per arm, same host model, same goal,
correctness read from the page's own report rather than either agent's claim:

| | Driving the browser directly | With the skill |
| --- | ---: | ---: |
| Host turns | 14.3 | 29.0 |
| Billed host cost | **$0.025122** | **$0.039907** |
| Time per mechanical action | **6.45 s** | **10.90 s** |
| Task completed correctly | 3/3 | 3/3 |

The skill cost **58.9% more and took 69% longer per action**, at equal accuracy. **Jev is not the
bottleneck** — 55 decisions at a p50 of **373 ms**. The premise the skill is built on, one host turn
per click, did not hold here: arm A needed only ~1 turn per action.

We also fixed a real defect found on the way. The request payload used to grow with every step taken
(**10,314** input tokens by step 80 for an identical decision); it is now capped and projected, at
**1,929** by step 80 and flat after step 10.

Full method, per-run spread, and the reproduction command: [guide](browser-with-typesafe-guide.md).

---

## Cross-Platform Compatibility

Skills are platform-agnostic by design. They use natural language instructions and generic tool descriptions that any AI coding agent can interpret and execute. No vendor lock-in.

The one exception is `browser-with-typesafe`: it talks to an external decision service, so it needs
its own credential and a browser handle from the host. Everything else is install-and-go.

### Verified Platforms

`create-prd` and `party-mode` are prompt-only and work anywhere. `browser-with-typesafe` also
needs its host to expose a browser handle — see the note below the table.

| Platform | Status | Notes |
|----------|--------|-------|
| OpenCode | ✅ Full support | Native skill system, subagent support |
| omp | ✅ Full support | Native skill system, subagent support, `browser` prelude for browser-with-typesafe |
| Claude Code | ✅ Full support | Native skill system, subagent support |
| Cursor | ✅ Full support | Built-in tools, inline chat |
| Codex | ✅ Full support | CLI-based, full tool access; browser-with-typesafe uses its Computer Use tab |
| Workbuddy | ✅ Compatible | Browser-with-typesafe runs through a Playwright/CDP host |
| Zcode | ✅ Compatible | Browser-with-typesafe runs through a Playwright/CDP host |
| GitHub Copilot | ✅ Compatible | Workspace mode, chat interface |
| Windsurf (Codeium) | ✅ Compatible | Cascade flow, chat mode |
| Aider | ✅ Compatible | Chat-based interaction |
| Cline | ✅ Compatible | VS Code extension, full tool access |
| Continue | ✅ Compatible | Open-source, configurable |
| JetBrains AI | ✅ Compatible | IDE-integrated assistant |
| Amazon Q Developer | ✅ Compatible | CLI and IDE integration |
| Google Jules | ✅ Compatible | Agent-based workflow |
| Zed AI | ✅ Compatible | Built-in AI assistant |
| Void | ✅ Compatible | Open-source alternative |
| Trae | ✅ Compatible | IDE-integrated assistant |

> **Browser support is narrower, and we say what we verified.** `browser-with-typesafe` has been
> run end to end on **omp** and on **Playwright 1.59 headless Chrome**; the **Codex** adapter is
> covered by contract tests and a decision-loop regression against a mock tab handle, but has not
> been exercised on a real Codex Computer Use runtime. Hosts without a computer-use tab or a
> Playwright/CDP page cannot run it at all — it does not ship a browser driver of its own.

### How It Works

Skills follow a **universal design pattern**:
- **Natural language instructions** — Any LLM can understand the workflow
- **Generic tool descriptions** — "Read file", "Write file", "Search content" instead of tool-specific APIs
- **Automatic fallback** — When a feature isn't available (e.g., subagents), skills adapt gracefully
- **No configuration** — Just install and use, skills detect capabilities automatically

### Adding Support for Your Platform

If your preferred AI tool isn't listed, skills will likely work out of the box. The key requirements:
1. The agent can read and write files
2. The agent can execute bash/shell commands
3. The agent supports multi-turn conversations

That's it. No special integration needed.

---

## Contributing

We welcome high-quality skill contributions!

### Adding New Skills

1. Fork this repository
2. Create a new skill folder under `skills/` (e.g., `skills/my-skill/`)
3. Write SKILL.md following our structure guidelines
4. Submit PR with usage examples

### Skill Quality Standards

- ✅ Fixed template + mandatory validation mechanism
- ✅ Recommendation-driven interaction (not fill-in-the-blank Q&A)
- ✅ Bidirectional traceability assurance
- ✅ Professional perspective + industry best practices
- ✅ Cross-platform compatible (no Agent toolchain lock-in)
- ✅ Complete documentation + usage examples

---

## License

MIT © sacrtap

---

## Community

- **GitHub Issues**: [Report issues or request features](https://github.com/sacrtap/Opc_Kit/issues)
- **Discussions**: [Share use cases](https://github.com/sacrtap/Opc_Kit/discussions)
- **skills.sh**: [Browse and install skills](https://skills.sh/sacrtap/Opc_Kit)

---

> **Opc_Kit** — Empower AI Agents to become true product workflow experts, not simple Q&A machines.
