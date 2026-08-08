# Create PRD — Usage Guide

> **Professional PRD Writing Assistant** — Complete workflow support for creation, update, and validation

📚 [Back to Opc_Kit](README.md) | 🎭 [Party Mode Guide](party-mode-guide.md)

---

## Overview

**create-prd** is a professional PRD (Product Requirements Document) writing assistant that provides complete workflow support from creation, update to validation.

| Intent   | Function                  | Trigger Signals                                                    |
| -------- | ------------------------- | ------------------------------------------------------------------ |
| **create**   | Create new PRD            | "New PRD", "write requirements doc", "create product requirements" |
| **update**   | Update existing PRD       | "Update/modify existing PRD", "PRD change", "add features to existing doc" |
| **validate** | Validate PRD completeness | "Validate/check PRD", "review requirements doc completeness"       |

---

## Core Features

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
Auto-creates task list at start, real-time progress updates ("✅ Chapters 1-3 completed. Moving to User Stories...").

### 💡 Recommendation-Driven Interaction
Each interaction provides 1-3 carefully considered recommendations with rationale, guiding decisions not fill-in-the-blanks.

### 🧠 Platform Ecosystem Inference
Auto-infers target platform (iOS/Android/Web/Mini Program/Admin Backend) from user input using confidence-level strategy. High confidence: direct use. Medium: use + flag. Low: one-line confirm.

### 📦 Incremental Write with Progress Tracking
PRD generation follows 5-batch incremental write (Ch1-3 → Ch4-5 → Ch6-7 → Ch8-10 → Ch11-13). Real-time progress notifications after each batch. Session-interrupt recovery via **temporary** checkpoint tracking (front matter removed after completion).

> **Note**: Checkpoint metadata (generate_progress) is stored in YAML front matter during generation and automatically removed when PRD generation completes. Final PRDs contain no front matter; business metadata lives only in the `## Metadata` section.

### 🎨 Prototype Workflow Constraint
Requirements-first, prototype-after workflow. Validates PRD status before prototype design, warning users about rework risk when skipping PRD.

---

## Workflow Modes

### Coaching Mode (Default)

The coaching mode provides guided interaction with intelligent inference:

1. **Auto-inference** — Analyzes context and generates complete draft
2. **Self-review** — Identifies gaps and inconsistencies
3. **On-demand interaction** — Asks clarifying questions only when needed
4. **Recommendation-driven** — Provides 1-3 options with rationale for each decision

**Duration**: ~5-10 minutes

### Fast Mode

Skip interaction and generate PRD directly:

1. **Quick generation** — Creates complete document from available information
2. **Reverse questions** — Lists assumptions and missing items for later supplement

**Duration**: ~2-3 minutes

### Mode Switching

```
# Fast Mode (skip interaction, direct generation)
fast

# Coaching Mode (on-demand interaction, progressive refinement)
coaching
```

---

## PRD Template Structure

### 12 Fixed Chapters

| # | Chapter | Content |
|---|---------|---------|
| 1 | Problem Description | Core problem + specific issues + impact scope |
| 2 | Goal Definition | Core goals + success metrics (baseline/target) |
| 3 | Target Users | User types with use cases, P0/P1/P2 priority |
| 4 | User Stories | US-x.x IDs with "As a... I want... so that..." format |
| 5 | Feature Flowcharts | Mermaid flowcharts with failure/timeout branches |
| 6 | Feature List | F-x.x IDs with module, priority, platform |
| 7 | Feature Details | Detailed specs with acceptance criteria |
| 8 | Tracking Design | Events + success metric calculation methods |
| 9 | Future Improvements | P2 features and enhancements |
| 10 | Risks & Dependencies | Technical risks + external dependencies |
| 11 | Decision Log | Key decisions with rationale |
| 12 | Glossary + Assumptions | Domain terms + all [ASSUMPTION] tags |

### 3 Auto-Generated Sections

- **Review Record** — First principles validation + logical completeness + boundary risk
- **Metadata** — Author, status, version, dates, project info
- **Change Log** — Version history (for updates)

---

## Quality Assurance

### Three-Step Review Process

#### Step 1: First Principles Validation (5+ Questions)

1. **Who is the user?** — Are target users clear and describable?
2. **What do they want?** — Do user stories cover real scenarios?
3. **Why now?** — Is the problem urgency valid (Why Now)?
4. **Why your solution?** — Is the differentiation value clear?
5. **How do you know you got it right?** — Are success metrics quantifiable and executable?
6-10+ (Supplement based on product complexity, at least 5 questions)

#### Step 2: Logical Completeness Review

| Traceability Direction | Rule | Requirement |
| ---------------------- | ---- | ----------- |
| US→FR | Each user story is implemented by at least one feature | 100% |
| FR→US | Each feature addresses at least one user story | 100% |
| Tracking→Metrics | Each tracking event serves at least one success metric | 100% |
| Metrics→Calculation | Each success metric has corresponding calculation method in Ch8 | 100% |
| Metrics→Problem | Each success metric answers "Did we solve the pain point?" | 100% |

**Breakpoint Detection**: Any process step that cannot connect to the previous step is marked as a breakpoint.

#### Step 3: Boundary & Risk Scanning

| Category | Probe Questions | Examples |
| -------- | --------------- | -------- |
| Exception Flows | "What if user fails at X operation?" | Network disconnect during save, storage full |
| Boundary Conditions | "What's the maximum? What about concurrent calls?" | Collection limits, API rate limits, data volume |
| External Dependencies | "Which external APIs aren't integrated yet? Any backups?" | Maps API, permission system, sharing service |
| Uncontrollable Factors | "What if users don't use it as expected?" | Users save 1000+ items, share permission abuse |

---

## Quality Scoring System

Every PRD is scored on 7 dimensions (max 100 points):

| Dimension          | Weight | Max Points | Description                                      |
| ------------------ | ------ | ---------- | ------------------------------------------------ |
| Completeness       | 30%    | 30         | All 13 chapters present and filled                  |
| Traceability       | 25%    | 25         | US↔FR 1:1 mapping, no orphaned requirements      |
| Testability        | 15%    | 15         | Acceptance criteria are executable and quantifiable |
| Exception Coverage | 15%    | 15         | Failure paths documented for all external calls  |
| Assumption Coverage| 5%     | 5         | All inferences tagged and summarized             |
| Review Completeness| 5%     | 5          | Three review steps executed with fixed format    |
| Product Thinking   | 5%     | 5          | Why Now, differentiation, user segmentation      |

**Benchmark Scores**:
- **70+ points** = production-ready
- **85+ points** = excellent
- **< 70 points** = needs revision before sharing

---

## Methodology

- **First Principles** (Elon Musk / Aristotle) — Strip away surface assumptions, return to fundamental truths
- **Working Backwards** (Amazon/PRFAQ) — Start from user pain points and work backward
- **YAGNI Principle** (XP Extreme Programming) — Don't build what you don't need now
- **MoSCoW Priority** — Must/Should/Could/Won't — Ensure v1 only includes must-haves

---

## Core Advantages

| Dimension               | Traditional Approach                            | create-prd Skill                                                      |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| **Structural Completeness** | Depends on author experience, prone to omission | Mandatory 12-chapter skeleton + bidirectional traceability validation |
| **Quality Assurance**       | No automatic validation mechanism               | First principles validation + boundary risk scanning                  |
| **Efficiency**              | Extensive fill-in-the-blank Q&A                 | Inference + on-demand interaction, recommendation-driven decision     |
| **Traceability**            | Features separated from requirements            | US↔FR bidirectional traceability, every feature has a source          |
| **Change Management**       | No version records                              | Mandatory change log + key update annotations                         |
| **Professionalism**         | Generic templates                               | Senior PM perspective + industry best practices                       |

---

## Integrations

Generated PRDs integrate with common product development tools:

- **Figma**: Include prototype URLs in PRD metadata (`metadata.prototype`)
- **Jira**: Export feature list as Jira Epic/Story structure (F-x.x → Story ID mapping)
- **GitHub**: Link to related issues/PRs in PRD metadata (`metadata.related-docs`)
- **Confluence**: Mermaid flowcharts render natively in Confluence markdown
- **Notion**: PRD markdown imports cleanly with table and heading support
- **Analytics**: Tracking events compatible with Amplitude, Mixpanel, Segment

---

## Cross-Platform Compatibility

Skills are platform-agnostic by design. They use natural language instructions and generic tool descriptions that any AI coding agent can interpret. See the [main README](README.md#cross-platform-compatibility) for the full list of 15+ verified platforms.

### Tool Mapping (Common Platforms)

| Operation             | OpenCode | Claude Code | Cursor   | Codex      | GitHub Copilot |
| --------------------- | -------- | ----------- | -------- | ---------- | -------------- |
| File Read             | `read`     | `Read`        | Built-in | `read_file`  | Built-in       |
| File Create/Overwrite | `write`    | `Write`       | Built-in | `write_file` | Built-in       |
| Precise Edit          | `edit`     | `Edit`        | Built-in | `edit_file`  | Built-in       |
| File Lookup           | `glob`     | `Glob`        | Built-in | `glob`       | Built-in       |
| Content Search        | `grep`     | `Grep`        | Built-in | `search`     | Built-in       |
| Large File Processing | `ctx_execute_file` | `Bash`      | `Bash`     | `run_shell`  | `Bash`         |
| Task List Management  | `todowrite` | `TodoWrite`   | Built-in | Built-in   | Built-in       |
| Subagent Dispatch     | `task`     | `Task`        | ❌        | ❌         | ❌             |

### Fallback Strategies

When a specific tool is unavailable:
1. **Large file analysis** → Use `bash`/`run_shell` with `head`/`tail`/`grep` to read key sections
2. **Subagents** → Execute tasks sequentially in current session, report progress after each
3. **Task list** → Outline plan in text at session start, mark completion step by step

---

## Trust & Quality

- **Validation Script** — `scripts/validate-prd.js` programmatically checks 18+ quality criteria
- **Bidirectional Traceability** — US↔FR 1:1 mapping, no orphaned requirements
- **Exception Path Coverage** — Every API call and external dependency has failure + timeout branches
- **Version History** — Mandatory changelog for every update, tracked in PRD metadata
- **Peer-Reviewed Methodology** — Amazon PRFAQ, First Principles, YAGNI, MoSCoW frameworks

---

## Usage Examples

### Scenario 1: Create New Feature PRD

```
User: /create-prd Help me write a PRD for user collection feature

Skill:
1. Deep reasoning: Analyze user motivation, business value, technical feasibility
2. Auto inference: Generate 12-chapter complete draft
3. On-demand interaction: Real-time confirmation for critical assumptions
4. Strict validation: US↔FR bidirectional traceability, flowchart exception check
5. Output: High-quality executable PRD + assumption index + quality score
```

### Scenario 2: Update Existing PRD

```
User: /create-prd Update docs/specs/prd-auth.md, add SSO support

Skill:
1. Read baseline PRD
2. Analyze change scope and impact
3. Update affected chapters with version bump (v1.0.0 → v1.1.0)
4. Append change log entry
5. Re-validate and re-score
```

### Scenario 3: Validate PRD Completeness

```
User: /create-prd Validate docs/specs/prd-payment.md

Skill:
1. Structural scan: Check all 13 chapters present
2. Traceability check: US↔FR mapping validation
3. Quality scoring: 7-dimension assessment
4. Output: Validation report with Critical/Warning/Info items
```

---

📚 **See also**: [Opc_Kit Overview](README.md) | [Party Mode Guide](party-mode-guide.md)
