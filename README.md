# Opc_Kit

> **Professional AI Agent Skill Toolkit** — Cross-platform workflow skills for OpenCode, Claude Code, Cursor, Codex

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: v2.0.0](https://img.shields.io/badge/Version-2.0.0-blue.svg)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-green.svg)]()
[![skills.sh](https://skills.sh/b/sacrtap/Opc_Kit)](https://skills.sh/sacrtap/Opc_Kit)

---

## 🎯 Project Positioning

Opc_Kit is a cross-platform AI Agent skill toolkit. Each skill is a meticulously designed, rigor validated professional workflow that helps product managers, developers, and designers efficiently complete complex tasks.

**Core Philosophy**:
- 📐 **Structured Assurance** — Mandatory templates and validation ensure output quality
- ⚡ **Efficiency Optimization** — Auto-inference + on-demand interaction reduces repetitive work
- 🔗 **Traceability** — Bidirectional traceability ensures every decision has a source
- 🎓 **Professional Perspective** — Senior expert mindset frameworks and industry best practices
- 🌐 **Cross-Platform Compatible** — Platform-agnostic design, auto-adapts to mainstream Agent toolchains

---

## ✨ Feature Highlights

### 🎯 Intelligent Intent Recognition
Automatically identifies user intent (create/update/validate) without manual workflow specification.

### 🔄 Dual-Mode Workflow
- **Coaching Mode (Default)** — Auto-inference → Complete draft → Self-review → On-demand interaction (~5-10 min)
- **Fast Mode** — Quick generation of complete document → Reverse question supplement (~2-3 min)

### 🔍 Strict Validation Mechanisms
- **First Principles Validation** — 5+ fundamental questions ensure document foundation correctness
- **Logical Completeness Review** — US↔FR bidirectional traceability, Tracking↔Metrics traceability
- **Boundary & Risk Scanning** — Proactively identifies exception flows, boundary conditions, external dependencies

### 📝 12-Chapter Standard Template + 3 Auto-Generated
- Fixed skeleton: Problem Description, Goal Definition, Target Users, User Stories, Feature Flowchart, Feature List, Feature Details, Tracking Design, Future Improvements, Risks & Dependencies
- Auto-generated: Decision Log, Glossary, Assumption Index

### 🌐 Auto Language Adaptation
Intelligent detection of conversation language (Chinese/English), auto-generates PRD in the matching language. User explicit override takes highest priority.

### 📊 Quality Scoring System
7-dimension quantitative scoring (max 100 points) with production-ready benchmarks (70+ = ready, 85+ = excellent).

### 🎯 Progress Tracking
Auto-creates task list at start, real-time progress播报 ("✅ Chapters 1-3 completed. Moving to User Stories...").

### 💡 Recommendation-Driven Interaction
Each interaction provides 1-3 carefully considered recommendations with rationale, guiding decisions not fill-in-the-blanks.

---

## 🎯 Available Skills

| Skill                            | Language | Purpose                              | Version | Install Command                                   |
| -------------------------------- | -------- | ------------------------------------ | ------- | ------------------------------------------------- |
| [create-prd](create-prd/SKILL.md) | EN/CN    | PRD creation/update/validation       | v2.0.0  | `npx skills add sacrtap/Opc_Kit --skill create-prd` |

## ⚡ Quick Start

### Prerequisites
No installation required. The skill auto-creates `docs/specs/` directory if absent.

**Node.js (optional)**: Only needed for running the PRD validation script `validate-prd.js`.

### Installation

#### Option 1: Via skills.sh (Recommended)

```bash
# Install all skills
npx skills add sacrtap/Opc_Kit

# Install specific skill
npx skills add sacrtap/Opc_Kit --skill create-prd

# List available skills before installing
npx skills add sacrtap/Opc_Kit --list
```

#### Option 2: Manual Clone

```bash
# Clone repository
git clone https://github.com/sacrtap/Opc_Kit.git

# Copy skill to your project's .agents/skills/ directory
cp -r Opc_Kit/create-prd /your/project/.agents/skills/
```

### Usage

Activate the skill in your AI Agent:

```
/create-prd Create a PRD for user authentication feature
```

Or directly describe your requirement:

```
/create-prd Help me write a PRD for: users can create and share collections on the platform
```

### Workflow Mode Switching

```
# Fast Mode (skip interaction, direct generation, ~2-3 min)
fast

# Coaching Mode (on-demand interaction, progressive refinement, ~5-10 min)
coaching
```

---

## 📚 create-prd Overview

**create-prd** is a professional PRD (Product Requirements Document) writing assistant, providing complete workflow support from creation, update to validation.

| Intent   | Function                  | Trigger Signals                                                    |
| -------- | ------------------------- | ------------------------------------------------------------------ |
| **create**   | Create new PRD            | "New PRD", "write requirements doc", "create product requirements", "创建PRD" |
| **update**   | Update existing PRD       | "Update/modify existing PRD", "PRD change", "add features to existing doc" |
| **validate** | Validate PRD completeness | "Validate/check PRD", "review requirements doc completeness"       |

### 8 Core Highlights

1. **Fixed Template** — 12-chapter skeleton + 3 auto-generated, immutable order
2. **Strict Validation** — US↔FR bidirectional traceability, 18+ criteria checklist
3. **Mandatory Change Log** — Every update must append change records
4. **Exception-Covered Flowcharts** — Every API call has failure + timeout branches
5. **Testable Acceptance Criteria** — Quantifiable, executable judgment conditions
6. **Auto Language Detection** — Chinese/English bilingual PRD generation
7. **Cross-Agent Compatible** — Works on OpenCode, Claude Code, Cursor, Codex
8. **Progress Tracking** — Auto task list with real-time status updates

### Usage Scenarios

#### Scenario 1: Create New Feature PRD

```
User: /create-prd Help me write a PRD for user collection feature

Skill:
1. Deep reasoning: Analyze user motivation, business value, technical feasibility
2. Auto inference: Generate 12-chapter complete draft
3. On-demand interaction: Real-time confirmation for critical assumptions
4. Strict validation: US↔FR bidirectional traceability, flowchart exception check
5. Output: High-quality executable PRD + assumption index + quality score
```

### Core Advantages

| Dimension               | Traditional Approach                            | create-prd Skill                                                      |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| **Structural Completeness** | Depends on author experience, prone to omission | Mandatory 12-chapter skeleton + bidirectional traceability validation |
| **Quality Assurance**       | No automatic validation mechanism               | First principles validation + boundary risk scanning                  |
| **Efficiency**              | Extensive fill-in-the-blank Q&A                 | Inference + on-demand interaction, recommendation-driven decision     |
| **Traceability**            | Features separated from requirements            | US↔FR bidirectional traceability, every feature has a source          |
| **Change Management**       | No version records                              | Mandatory change log + key update annotations                         |
| **Professionalism**         | Generic templates                               | Senior PM perspective + industry best practices                       |

---

## 🛡️ Trust & Quality

- **Validation Script** — `scripts/validate-prd.js` programmatically checks 18+ quality criteria
- **Quality Score** — 7-dimension scoring (max 100 points), see Quality Scoring section
- **Peer-Reviewed Methodology** — Amazon PRFAQ, First Principles, YAGNI, MoSCoW frameworks
- **Bidirectional Traceability** — US↔FR 1:1 mapping, no orphaned requirements
- **Exception Path Coverage** — Every API call and external dependency has failure + timeout branches
- **Version History** — Mandatory changelog for every update, tracked in PRD metadata

**Benchmark**: 70+ points = production-ready, 85+ = excellent

---

## 📊 PRD Quality Scoring

Every PRD is scored on 7 dimensions (max 100 points):

| Dimension          | Weight | Max Points | Description                                      |
| ------------------ | ------ | ---------- | ------------------------------------------------ |
| Completeness       | 20%    | 20         | All 12 chapters present and filled               |
| Traceability       | 20%    | 20         | US↔FR 1:1 mapping, no orphaned requirements      |
| Testability        | 15%    | 15         | Acceptance criteria are executable and quantifiable |
| Clarity            | 15%    | 15         | Unambiguous language, clear terminology          |
| Exception Coverage | 10%    | 10         | Failure paths documented for all external calls  |
| Metrics Alignment  | 10%    | 10         | Tracking events map to success metrics 1:1       |
| Risk Management    | 10%    | 10         | Dependencies, risks, and mitigations addressed   |

**Benchmark Scores**:
- **70+ points** = production-ready
- **85+ points** = excellent
- **< 70 points** = needs revision before sharing

---

## 🔗 Integrations

Generated PRDs integrate with common product development tools:

- **Figma**: Include prototype URLs in PRD metadata (`metadata.prototype`)
- **Jira**: Export feature list as Jira Epic/Story structure (F-x.x → Story ID mapping)
- **GitHub**: Link to related issues/PRs in PRD metadata (`metadata.related-docs`)
- **Confluence**: Mermaid flowcharts render natively in Confluence markdown
- **Notion**: PRD markdown imports cleanly with table and heading support
- **Analytics**: Tracking events compatible with Amplitude, Mixpanel, Segment

---

## 🌐 Cross-Platform Compatibility

This skill is platform-agnostic, auto-adapting to mainstream AI Coding Agents:

### Tool Mapping

| Operation             | OpenCode | Claude Code | Cursor   | Codex      |
| --------------------- | -------- | ----------- | -------- | ---------- |
| File Read             | `read`     | `Read`        | Built-in | `read_file`  |
| File Create/Overwrite | `write`    | `Write`       | Built-in | `write_file` |
| Precise Edit          | `edit`     | `Edit`        | Built-in | `edit_file`  |
| File Lookup           | `glob`     | `Glob`        | Built-in | `glob`       |
| Content Search        | `grep`     | `Grep`        | Built-in | `search`     |
| Large File Processing | `ctx_execute_file` | `Bash`      | `Bash`     | `run_shell`  |
| Task List Management  | `todowrite` | `TodoWrite`   | Built-in | Built-in   |
| Subagent Dispatch     | `task`     | `Task`        | ❌ Not supported | ❌ Not supported |

### Fallback Strategies

When a specific tool is unavailable:
1. **Large file analysis** → Use `bash`/`run_shell` with `head`/`tail`/`grep` to read key sections
2. **Subagents** → Execute tasks sequentially in current session, report progress after each
3. **Task list** → Outline plan in text at session start, mark completion step by step

---

## 🤝 Contributing Guide

We welcome high-quality skill contributions!

### Adding New Skills

1. Fork this repository
2. Create new skill folder (e.g., `my-skill/`)
3. Write SKILL.md following this structure:
   - Frontmatter (name, description, license, metadata)
   - Trust & Quality
   - Quick Start
   - When to Use / Intent Recognition
   - Core Principles
   - Quality Scoring
   - Template + Validation
   - Assets & Scripts / Integrations
4. Submit PR with skill usage examples

### Skill Quality Standards

- ✅ Fixed template + mandatory validation mechanism
- ✅ Recommendation-driven interaction (not fill-in-the-blank Q&A)
- ✅ Bidirectional traceability / traceability assurance
- ✅ Professional perspective + industry best practices
- ✅ Cross-platform compatible (no Agent toolchain lock-in)
- ✅ Complete documentation + usage examples

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © sacrtap | create-prd v2.0.0

---

## 💬 Community

- **GitHub Issues**: [Report issues or request features](https://github.com/sacrtap/Opc_Kit/issues)
- **Discussions**: [Share use cases](https://github.com/sacrtap/Opc_Kit/discussions)

---

> **Opc_Kit** — Empower AI Agents to become true product workflow experts, not simple Q&A machines.
