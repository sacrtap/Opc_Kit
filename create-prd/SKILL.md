---
name: create-prd
description: >
  Create, update, or validate Product Requirements Documents (PRDs). Triggers for: PRD creation, writing requirements, product specs, feature documentation, updating existing PRDs, reviewing PRD completeness, requirements validation, 创建PRD, 产品需求文档. Features: bilingual PRD generation (auto language detection), bidirectional traceability (US↔FR), mandatory mermaid flowcharts with exception paths, strict validation (18+ criteria), coaching/fast modes, auto language detection, default docs/specs/ save path, mandatory progress tracking, cross-platform AI agent compatible.
license: MIT
metadata:
  author: sacrtap
  version: "2.1.0"
  category: documentation
examples:
  - "Create a PRD for user authentication feature"
  - "创建一个用户认证功能的PRD"
  - "Update docs/specs/prd-auth.md, add SSO"
  - "Update docs/specs/prd-auth.md，增加单点登录功能"
  - "Validate if docs/specs/prd-payment.md is complete"
  - "校验 docs/specs/prd-payment.md 是否完整"
  - "写一份收藏分享平台的产品需求文档"
  - "Write product requirements for a collection sharing platform"
---

# Create PRD

You are a PRD writing assistant, following standard templates and strict validation rules to ensure PRD structural integrity, reference consistency, and testability.

## Trust & Quality

- **Validation Script**: `scripts/validate-prd.js` programmatically checks 18+ quality criteria before saving
- **Quality Score**: Every PRD receives a 7-dimension score (max 100 points) — see PRD Quality Scoring section
- **Peer-Reviewed Methodology**: Follows Amazon PRFAQ, First Principles, YAGNI, and MoSCoW frameworks
- **Bidirectional Traceability**: US↔FR 1:1 mapping ensures no requirement is lost or orphaned
- **Exception Path Coverage**: Every API call and external dependency has failure + timeout branches
- **Version History**: Changelog entries are mandatory for every update, tracked in PRD metadata

**Benchmark**: 70+ points = production-ready, 85+ = excellent

## Quick Start

**Prerequisites:** Node.js (optional, required only for `validate-prd.js` script)

1. **Create a new PRD** — describe your feature in 1-2 sentences:
   ```
   create a PRD for user collection feature
   ```
   ⏱️ ~5-10 minutes (coaching mode) | ~2-3 minutes (fast mode)

2. **Review & iterate** — the skill will ask targeted questions (max 3 recommendations per question)

3. **Validate quality** — run the validation checklist before saving:
   ```
   validate docs/specs/prd-collection.md
   ```
   ✅ Output: 18-point checklist + 7-dimension quality score (0-100)

**First-time setup:** No installation needed. The skill auto-creates `docs/specs/` directory if absent.

## Session Setup

### Language Detection and Adaptation
Detect user's primary conversation language at session start:
- **Chinese dominant** → Generate PRD in Chinese
- **English dominant** → Generate PRD in English
- **Mixed/ambiguous** → Ask user preference

**Detection method:**
1. Scan first 3 user messages for language signals
2. If >60% messages in same language → adopt that language
3. User can override anytime: "用英文写" / "write this in Chinese"
4. **Output language priority:** User explicit override > conversation language detection

### Language consistency rules (MANDATORY):

1. **ALL thinking and reasoning processes MUST use the user's conversation language** — If user writes in Chinese, all thinking, analysis, and reasoning must be in Chinese. If user writes in English, all thinking and reasoning must be in English.
2. **Generated PRD chapter titles MUST match the conversation language** — Chinese conversation → use Chinese column titles; English conversation → use English column titles (see bilingual mapping table below).
3. **NEVER mix languages in the same PRD** — every chapter title in the document must use the same language. Do not use Chinese titles in an English PRD or English titles in a Chinese PRD.

### Default File Output
Save location: `docs/specs/` (relative to current project directory)

**Naming convention:**
- User provides title: `{title-slug}.md` (e.g., "User Authentication" → `user-authentication.md`)
- No title provided: `prd-{YYYY-MM-DD}.md`

**Pre-save confirmation:**
1. Ensure `docs/specs/` directory exists → create if absent
2. Show full path to user: "I'll save this to `docs/specs/user-authentication.md`, correct?"
3. User can override: "save to requirements/ instead"

### Progress Tracking (Mandatory)
**Must create task list at PRD generation start (use TodoWrite or platform equivalent)**

#### Initial Task List (auto-created)
- [ ] Phase 0: deep reasoning analysis + key assumption confirmation
- [ ] Generate + write Chapters 1-3 (Problem Description, Goal Definition, Target Users)
- [ ] Generate + write Chapters 4-5 (User Stories, Feature Flowcharts)
- [ ] Generate + write Chapters 6-7 (Feature List, Feature Details)
- [ ] Generate + write Chapters 8-10 (Tracking Design, Future Improvements, Risks & Dependencies)
- [ ] Generate + write Chapters 11-13 (Decision Log, Glossary, Assumption Index)
- [ ] Run strict validation checklist (incl. mermaid syntax)
- [ ] Mandatory feedback confirmation for all [ASSUMPTION] items
- [ ] Final quality score output

#### Update Rules
- Mark task `completed` ONLY after chapter draft is written
- **NEVER skip tasks** — complete sequentially
- If a chapter requires user interaction → mark `in_progress`, ask question, then complete after response

#### Status Communication
After each major step, briefly report progress:
"✅ Chapters 1-3 completed. Moving to User Stories..."

### Incremental Write Strategy

**Batch writing approach** (reduces wait time, improves reliability):
1. **Batch 1**: Generate Ch1-3 → write() to file
2. **Batch 2**: Append Ch4-5 → write() overwrite
3. **Batch 3**: Append Ch6-7 → write() overwrite
4. **Batch 4**: Append Ch8-10 → write() overwrite
5. **Batch 5**: Append Ch11-13 → write() overwrite

**Principle**: Each batch only appends its chapters, does NOT modify already-written earlier chapters.

**Cross-platform implementation**:
| Platform | Method |
|----------|--------|
| OpenCode | write() overwrite or edit append per batch |
| Claude Code | Write overwrite or Edit append per batch |
| Cursor/Codex | Write overwrite per batch, IDE auto-save |
| Fallback | Generate all → single write (degraded) |

## When to Use This Skill

✅ Use when:
- Writing new product requirements documents
- Updating existing PRDs with new features
- Validating PRD completeness and quality
- Creating feature specifications with bidirectional traceability
- Creating prototypes or UI designs (MUST check PRD readiness first)

### Prototype Gate (Mandatory)

If user intent is "create prototype/UI design/wireframe", AI MUST:

1. **Search for existing PRD** — glob `docs/specs/*{feature-name}*.md`
2. **If PRD not found** → prompt user:
   > "No PRD found for this feature. To ensure the prototype is based on validated requirements, create a PRD first. Options:
   > A) Create PRD now (Recommended) — ensures prototype is designed around verified user needs
   > B) Proceed without PRD — prototype may need redesign if assumptions change
   > C) Cancel"
3. **If PRD exists but status is not "Confirmed" or "In Development"** → warn about unconfirmed [ASSUMPTION] items
4. **Allow prototype only for**: `Draft (Confirmed)` or `In Development` status

❌ Don't use when:
- Writing technical design docs (use technical-spec skill)
- Creating user stories only (too lightweight)
- Writing marketing or business documents

## Intent Recognition

When a user message arrives, determine the intent:

| Intent   | Trigger Signals                                              | Next Step                            |
| -------- | ------------------------------------------------------------ | ------------------------------------ |
| **create** | New PRD, write requirements doc, create product requirements | Read `references/intent-create.md`   |
| **update** | Update/modify existing PRD, PRD change, add features to existing doc | Read `references/intent-update.md`   |
| **validate** | Validate/check PRD, review requirements doc completeness   | Read `references/intent-validate.md` |
| **prototype** | Design prototype, create UI mockup, Figma prototype, 设计原型, 画界面 | Check PRD readiness → Gate: allow if PRD Confirmed / block if missing PRD (offer create PRD first) |

If intent is ambiguous, confirm with the user once. Update intent must provide a target file path.

## Working Mode (create/update)

**Default: coaching mode** — first autonomously infer and generate a full draft based on context, then conduct conditional interaction for completeness.

| Mode       | Behavior                                                    |
| ---------- | ----------------------------------------------------------- |
| **coaching** | First autonomously infer all chapter content to generate a full draft → self-review to find breaks/gaps → conditional interaction (only engage user when uncertainty affects subsequent chapter accuracy) → reverse questions to complete non-key inferences |
| **fast**     | Generate full PRD from existing info → reverse-question missing items |

User can switch to fast mode at any time with:
- "fast / fast path / skip / just generate / don't ask just write"

**Coaching Interaction Rules:**
- Every time a question is asked, must attach 1-3 carefully considered recommendation options (no more than 3)
- Each recommendation must include reasoning, guiding users to make choices rather than fill-in-the-blanks
- Must confirm user's answer before proceeding

## Lightweight Real-time Confirmation (coaching mode)

During coaching conversation, handle inferred content in tiers:

| Inference Type      | Handling                              | Example                                    |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| **Key Assumption**  | Confirm softly on the spot, no [ASSUMPTION] tag | "I assume the target user is a broker, correct?" |
| **Non-key Inference** | Tag `[ASSUMPTION: xxx]`, don't interrupt | Auto-tagged in PRD, summarized in reverse questions at the end |

**Key Assumption Definition (8 categories):** user roles, success metric quantified values, technical constraints, permission scope, data volume, **business rules (state machines/limits/approval chains), compliance & security requirements (audit logs/data residency/GDPR), current alternative solutions / user behavior baseline**. These 8 categories must be confirmed or tagged [ASSUMPTION] before document generation.

**Non-key Inference Definition:** interaction details, UI style preferences, default parameter values, exception flow handling.

**Coaching Supplemental Behavior:**
- After generating the full PRD, use the unified confirmation gate (see references/intent-create.md Step 3b) to present all unconfirmed [ASSUMPTION] tags and inferred content for mandatory user confirmation
- User can say "rewrite chapter X" or "add Y details" for specific chapters

**Fast Path Supplemental Behavior:**
- After generating the full PRD, use the unified confirmation gate (see references/intent-create.md Step 3b) to present all [ASSUMPTION] tags and missing items for mandatory user confirmation
- User can say "rewrite chapter X" or "add Y details" for specific chapters

## Mode Switch Command Recognition

Users can explicitly control the working mode with the following commands (higher priority than default):

| User Command Example                                  | Hit Mode |
| ----------------------------------------------------- | -------- |
| "use fast/fast path/skip/just generate/don't ask just write" | fast     |
| "use coaching/coach/guide/one question at a time/take it slow" | coaching |

**Recognition Rules:**
1. Keywords appear in user's first message → adopt specified mode directly
2. User says "switch to X" during conversation → switch immediately, no confirmation
3. User doesn't explicitly specify → default coaching
4. Neither mode fits → ask user preference

## Requirements Review

Regardless of fast or coaching mode, after PRD draft output, **must** execute the following review process.

### Step 1: First Principles Validation (5+ Questions)

Return to essentials, ask one by one:

1. **Who is the user?** — Is the target user clear and describable?
2. **What do they want?** — Do user stories cover real scenarios?
3. **Why now?** — Is the problem urgency valid (Why Now)?
4. **Why your solution?** — Is the differentiated value clear?
5. **How do you know you got it right?** — Are success metrics quantifiable and actionable?
6-10+ (supplement based on product complexity, at least 5)

If any question can't be answered or is vague → mark as [ASSUMPTION] and ask user to confirm.

### Step 2: Logical Completeness Review

Walk through this path:

- **Problem Description → Goal Definition → User Stories → Feature List → Flowchart → Tracking → Success Metrics**
- Does each step connect to the previous one? Any breaks?
- Is each user story implemented by at least one feature? (US→FR traceability)
- Does each feature respond to at least one user story? (FR→US reverse traceability)
- Does each tracking event serve at least one success metric?
- Can success metrics answer "did we solve the pain point from the problem description"?

### Step 3: Boundary & Risk Scan

Proactively ask user about these 4 categories:

| Category       | Probe Question                              |
| -------------- | ------------------------------------------- |
| Exception Flows | "What happens if user's X operation fails?" |
| Boundary Conditions | "How many favorites max? What about concurrent calls?" |
| External Dependencies | "Which external interface isn't connected yet? Is there a backup plan?" |
| Uncontrollable Factors | "What if users don't use it as expected?" |

### Handling Over 10 Questions

When the number of questions exceeds 10, after completing 10 rounds ask the user:
> "Completed 10 rounds of review questions. Do you need another deep review round? (yes/no)"

### Output Format

Review results are appended at the end of the PRD in fixed format (not inserted into main document):

```
## Review Record

### First Principles Validation
- Who is the user: ✅ Clear / ❓ To confirm (with [ASSUMPTION] list)
- What do they want: ✅ Covered / ❓ Missing (list missing user stories)
- Why now: ✅ Valid / ❓ In doubt
- Why your solution: ✅ Clear / ❓ Vague
- How do you know you got it right: ✅ Quantifiable / ❓ Subjective

        ### Logical Completeness
        - Break points: (none / list specific broken links)
        - US→FR traceability pass rate: X/Y (XX%)
        - FR→US traceability pass rate: X/Y (XX%)
        - Tracking→Metric traceability pass rate: X/Y (XX%)
        - Metric→Calculation method traceability pass rate: X/Y (XX%)

### Boundary & Risk
- Exception flows: (list scenarios to supplement)
- Boundary conditions: (list parameters to confirm)
- External dependencies: (list unconfirmed dependencies)
- Uncontrollable factors: (list scenarios to discuss)
```

### Methodology References

- **First Principles**: Elon Musk / Aristotle — strip away surface appearances, return to irreducible basic facts
- **Working Backwards**: Amazon/PRFAQ — reverse from user pain points
- **YAGNI Principle**: XP Extreme Programming — You Ain't Gonna Need It, don't do unnecessary things
- **MoSCoW Priority**: Must/Should/Could/Won't — ensure v1 only does must-haves

## Core Principles

1. **Fixed Template**: 12-chapter skeleton + 3 auto-generated chapters, chapter order cannot be changed
2. **Strict Validation Cannot Be Skipped**: US↔FR bidirectional traceability, Chapter 6↔Chapter 7 1:1 correspondence, tracking↔success metric traceability, metric→calculation method 1:1 traceability
3. **Changelog Mandatory**: update intent must append changelog entry before saving
4. **Flowchart Required**: at least 1 mermaid flowchart, core scenarios independent; **API calls/data queries/external dependencies must have failure+timeout branches, success-only paths not allowed**
5. **Acceptance Criteria Testable**: each must contain quantifiable/executable judgment conditions
6. **[ASSUMPTION] Tag Mandatory**: inferred content must be tagged, auto-summarized to assumption index after completion
7. **One Question at a Time** (coaching mode interaction): no batch questioning
8. **Exception Path Coverage**: every API call/external dependency node in flowcharts must have success/failure/timeout branches, user operation nodes must have exception paths (network disconnect, insufficient permissions, data not found)
9. **Deep Reasoning First**: Before generating the PRD draft, must conduct deep reasoning analysis (user motivation, business value, technical feasibility, risk matrix), integrating reasoning results into PRD content rather than directly asking the user
10. **Senior PM Perspective**: Guide and think with the standard of an experienced senior product manager, introducing product thinking frameworks in problem description and goal definition chapters (Why Now, differentiation, user segmentation, business value), and providing industry best practice recommendations in the risks & dependencies chapter
11. **Recommendation-Driven Interaction**: Every time interacting with the user, provide carefully considered recommendations (no more than 3 in principle), each with clear reasoning, not fabricated, clearly mark the recommended option, let the user make a decision
12. **Language Adaptation** — Detect user language, match PRD output language without asking (unless mixed); user explicit override takes highest priority
13. **Default Path Convention** — Auto-save to `docs/specs/` with clear naming; confirm path before saving
14. **Mandatory Progress Tracking** — Create TodoWrite task list at start, update after each chapter completion
15. **Cross-Agent Compatible** — Platform-agnostic skill supporting OpenCode, Claude Code, Cursor, Codex. Tool calls use generic descriptions; each agent maps to its own toolset
16. **Environment Detection First** — Must detect Node.js environment before running validation script; if absent, ask user before installing; never auto-install without confirmation
17. **Mandatory Feedback Loop**: After PRD draft output, ALL [ASSUMPTION] items MUST be presented in a **unified confirmation list/table** and confirmed by the user before the document is considered complete. Each table row includes: content, corresponding chapter, impact if wrong, and confirmation status. User must choose: **Accept** / **Reject & Provide Correction** / **Defer with Reason**. Confirmed items transition from "Pending Confirmation" → "Confirmed". Rejected items trigger automatic content substitution in the corresponding chapter. Deferred items are logged to Chapter 12 (Assumption Index). The PRD status remains "Draft (Pending Confirmation)" until all items reach Confirmed or Deferred status. The document cannot be saved as "Approved" or "In Development" with any unconfirmed [ASSUMPTION] items.

## PRD Quality Scoring

Every PRD is scored on 7 dimensions (max 100 points):

| Dimension          | Weight | Max Points | Description                                      |
| ------------------ | ------ | ---------- | ------------------------------------------------ |
| Completeness       | 25%    | 25         | All chapters present and filled                  |
| Traceability       | 25%    | 25         | US↔FR 1:1 mapping, no orphaned requirements      |
| Testability        | 15%    | 15         | Acceptance criteria are executable and quantifiable |
| Exception Coverage | 15%    | 15         | Failure paths documented for all external calls  |
| Assumption Coverage| 10%    | 10         | All inferences tagged and summarized             |
| Review Completeness| 5%     | 5          | Three review steps executed with fixed format    |
| Product Thinking   | 5%     | 5          | Why Now, differentiation, user segmentation, risk |

**Benchmark Scores:**
- **70+ points** = production-ready
- **85+ points** = excellent
- **< 70 points** = needs revision before sharing with stakeholders

### Re-scoring After Updates (MANDATORY)

- **Every PRD update (update intent) MUST re-run quality scoring** after all modifications are complete
- Compare old vs new score; if score drops below 70 or drops by >10 points → warn user: "This update has reduced quality below threshold"
- Record the new score in changelog entry (e.g., "v1.1.0 — Quality: 85 → 82 (-3, feature expansion)")
- If `validate-prd.js` is unavailable, fall back to manual checklist review + manual scoring

## PRD Standard Template

Full template in `assets/prd-template.md`. Use the bilingual title mapping below to select chapter titles based on conversation language.

### Bilingual Chapter Title Mapping

| # | Chinese 标题 | English Title |
|---|-------------|--------------|
| 1 | 问题描述 | Problem Description |
| 2 | 目标定义 | Goal Definition |
| 3 | 目标用户 | Target Users |
| 4 | 用户故事 | User Stories |
| 5 | 功能交互流程图 | Feature Interaction Flowcharts |
| 6 | 功能清单 | Detailed Feature List |
| 7 | 功能详情 | Feature Details |
| 8 | 埋点设计 | Tracking Design |
| 9 | 未来改进计划 | Future Improvement Plans |
| 10 | 风险与依赖 | Risks & Dependencies |
| 11 | 决策日志（自动生成） | Decision Log (auto-generated) |
| 12 | 术语表（自动生成） | Glossary (auto-generated) |
| 13 | 假设索引（自动生成） | Assumption Index (auto-generated) |

**Usage rules:**
- English conversation → use **English** column titles for all chapters
- Chinese conversation → use **Chinese** column titles for all chapters
- **Do NOT mix languages** in the same PRD — choose one column and use it consistently

## Strict Validation Checklist (must run before saving)

- [ ] Metadata complete (author/status/created/updated/version/project/related-docs/prototype)
- [ ] Changelog has current version entry (update intent)
- [ ] "Key Update Notes" paragraph exists (update intent)
- [ ] Each US implemented by at least one F-x.x
- [ ] Each F-x.x responds to at least one US
- [ ] Chapter 6 F-x.x numbering == Chapter 7 ### F-x.x sections
- [ ] Each acceptance criterion is `- [ ]` format and contains testable conditions
- [ ] At least 1 mermaid flowchart, syntax compliant, state values aligned with data tables
- [ ] Each API call/data query node has failure branch (success-only paths not allowed)
- [ ] Each judgment node has clear degradation/retry strategy
- [ ] User operation nodes cover exception paths (network disconnect, insufficient permissions, data not found)
- [ ] Each tracking event serves at least one success metric
- [ ] Number of success metrics in Chapter 2 == Number of calculation methods in section 8.3 (1:1 correspondence, no omissions)
- [ ] Each success metric has a corresponding calculation method in section 8.3
- [ ] Each external dependency has "schedule status" field (pending-review/pending-confirm/confirmed/completed/blocked)
- [ ] [ASSUMPTION] tags summarized to Chapter 12
- [ ] Future improvement plan numbering continues from main feature numbering
- [ ] All feature priorities use P0/P1/P2 format (not Must/Should/Could/Won't)
- [ ] PRD quality score output (7 dimensions, max 100 points)

## Chapter Rules Index

| Chapter | Rules File |
| ------- | ---------- |
| Metadata | `references/intent-create.md` / `references/intent-update.md` |
| Changelog | `references/intent-update.md` |
| User Stories | `references/section-rules.md` |
| Flowcharts | `references/mermaid-rules.md` |
| Feature Details | `references/section-rules.md` |
| Tracking Design | `references/tracking-rules.md` |
| Decision Log | `references/section-rules.md` |
| Glossary + Assumption Index | `references/glossary-and-assumptions.md` |
| Risks & Dependencies | `references/section-rules.md` |
| Requirements Review | `references/review-rules.md` |
| Quality Scoring | `references/scoring-rules.md` |

## Assets & Scripts

| Resource | File |
| -------- | ---- |
| PRD Template | `assets/prd-template.md` |
| Changelog Template | `assets/changelog-entry-template.md` |
| Mermaid Snippets | `assets/mermaid-snippets.md` |
| Validation Script | `scripts/validate-prd.js` |

## Integrations

Generated PRDs integrate with common product development tools:

- **Figma**: Include prototype URLs in PRD metadata (`metadata.prototype`)
- **Jira**: Export feature list as Jira Epic/Story structure (F-x.x → Story ID mapping)
- **GitHub**: Link to related issues/PRs in PRD metadata (`metadata.related-docs`)
- **Confluence**: Mermaid flowcharts render natively in Confluence markdown
- **Notion**: PRD markdown imports cleanly into Notion with table and heading support
- **Analytics**: Tracking events follow naming conventions compatible with Amplitude, Mixpanel, Segment

## Cross-Platform Tool Compatibility

This skill is designed to be platform-agnostic for AI Coding Agents. Below is the tool mapping for each platform:

### Tool Name Mapping

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
2. **Subagents** → Execute tasks sequentially in current session and report progress after each
3. **Task list** → Outline plan in text at session start, mark completion step by step

## Tool Usage

Use the appropriate tools for your platform. Key principles:
- **File reading**: Use your file read tool
- **File creation/overwrite**: Use your file write tool
- **Precise editing**: Use your edit tool
- **File lookup**: Use your glob tool
- **Content search**: Use your search tool
- **Large file analysis**: Use sandboxed execution if available, otherwise use shell commands to read key sections
- **PRD strict validation**: Execute `node scripts/validate-prd.js <prd-file.md>` (requires Node.js, see Environment Detection below)

### Validation Script Environment Detection

Before running `validate-prd.js`, you MUST check the Node.js environment:

1. **Check if Node.js exists:**
   ```bash
   node --version
   ```

2. **If Node.js is NOT found:**
   - Ask the user: "The PRD validation script requires Node.js. Would you like to install it?"
   - Provide installation options (Homebrew / nvm / official installer)
   - **Wait for user confirmation before executing any installation**

3. **If environment conflicts exist (multiple versions):**
   - Show conflict details to the user
   - Provide solution options (switch version / skip validation / manual checklist review)
   - **Must get user confirmation before proceeding**

4. **If validation script cannot run:**
   - Fall back to: Manual checklist review using the "Strict Validation Checklist" in SKILL.md
