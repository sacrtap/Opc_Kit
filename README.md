# Opc_Kit

> **Professional AI Agent Skill Toolkit** — From multi-persona decision debates to structured PRD output, a complete product workflow solution compatible with all AI coding agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: v2.5.1](https://img.shields.io/badge/Version-2.5.1-blue.svg)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-green.svg)]()
[![skills.sh](https://skills.sh/b/sacrtap/Opc_Kit)](https://skills.sh/sacrtap/Opc_Kit)
[![PRD Validation](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml/badge.svg)](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml)

---

## Why Opc_Kit?

Most AI tools give you a single perspective. Opc_Kit gives you a **complete product decision loop**.

- **From Debate to Document** — Use **party-mode** to simulate expert roundtables, then **create-prd** to turn decisions into structured, production-ready PRDs. Two skills, one seamless workflow.
- **Eliminate Blind Spots** — 17 professional personas covering engineering, product, and strategy challenge your assumptions before you write a single requirement.
- **Professional-Grade Quality** — Bidirectional traceability, first-principles validation, and 7-dimension scoring ensure every output meets senior PM standards.
- **Zero Learning Curve** — Natural language triggers with automatic intent detection. No commands to memorize, no configuration needed.
- **Universal Compatibility** — One skill set works across all AI coding agents with automatic tool adaptation. No vendor lock-in.

---

## Skills Overview

| Skill | Purpose | Version | Quick Install | Guide |
|-------|---------|---------|---------------|-------|
| 📝 [create-prd](create-prd/SKILL.md) | PRD creation, update & validation | v2.5.1 | `npx skills add sacrtap/Opc_Kit --skill create-prd` | [Usage Guide](create-prd-guide.md) |
| 🎭 [party-mode](party-mode/SKILL.md) | Multi-persona product decision discussion | v1.0.0 | `npx skills add sacrtap/Opc_Kit --skill party-mode` | [Usage Guide](party-mode-guide.md) |

---

## Quick Start

### Installation

```bash
# Install all skills
npx skills add sacrtap/Opc_Kit

# Install specific skill
npx skills add sacrtap/Opc_Kit --skill create-prd
npx skills add sacrtap/Opc_Kit --skill party-mode

# List available skills
npx skills add sacrtap/Opc_Kit --list
```

### Basic Usage

**Use create-prd alone:**
```
/create-prd Write a PRD for user authentication feature
```

**Use party-mode alone:**
```
party mode — Should we use microservices or monolith? We're a 5-person team at MVP stage.
```

**Complete workflow: debate first, then document**
```
# Step 1: Stress-test the idea from multiple perspectives
party mode — Should we build a real-time collaboration feature for our document editor?
Tech stack: React + Node.js. Scale: 5K concurrent users. Timeline: 8 weeks.

# Step 2: Turn the decision into a structured PRD
/create-prd Based on the party-mode discussion, write a PRD for real-time collaboration
```

Two skills, one seamless workflow: from multi-perspective debate to actionable documentation.

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
party mode — We're building an AI habit tracking app. Target: professionals 25-40.
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

## Cross-Platform Compatibility

Skills are platform-agnostic by design. They use natural language instructions and generic tool descriptions that any AI coding agent can interpret and execute. No vendor lock-in, no configuration needed.

### Verified Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| OpenCode | ✅ Full support | Native skill system, subagent support |
| Claude Code | ✅ Full support | Native skill system, subagent support |
| Cursor | ✅ Full support | Built-in tools, inline chat |
| Codex | ✅ Full support | CLI-based, full tool access |
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
2. Create new skill folder (e.g., `my-skill/`)
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
