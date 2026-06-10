---
name: create-prd
description: >
  Create, update, or validate Product Requirements Documents (PRDs). Triggers for: PRD creation, writing requirements, product specs, feature documentation, updating existing PRDs, reviewing PRD completeness, requirements validation, 创建PRD, 产品需求文档. Features: 13-chapter template (shared CN/EN structure), bidirectional traceability (US↔FR), mandatory mermaid flowcharts with exception paths, strict validation (18+ criteria), coaching/fast modes, auto language detection, default docs/specs/ save path, mandatory progress tracking, cross-platform AI agent compatible.
license: MIT
metadata:
  author: sacrtap
  version: "2.2.2"
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
- **First message in Chinese** → Global use of Chinese
- **First message in English** → Global use of English
- **Mixed/ambiguous** → Ask user preference

**Language Consistency Constraint (globally active):**
- All internal reasoning, analysis, and judgment use the detected conversation language
- All interaction with the user (questions, recommendations, confirmations, progress updates) uses the detected conversation language
- PRD document content (outline headings + body text) uses the detected conversation language
- English is only permitted for code snippets, Mermaid diagrams, and technical identifiers (API paths, library names, variable names)
- **User explicit override takes highest priority**, e.g. "用英文写" / "write this in Chinese"

**Detection & Switch Rules:**
1. Read the user's first message, determine the primary language
2. Once determined, remain consistent throughout (unless the user explicitly switches)
3. When generating PRD, automatically replace outline heading titles with the corresponding language (see "Headline Translation Mapping Table")

### Phase 0: Key Information Inventory (Layered Strategy)

Scan user's first message, fill the Key Info Inventory using **inference-first** strategy:

| Field               | Source         | Behavior                                               | Interaction Cost  |
| ------------------- | -------------- | ------------------------------------------------------ | ----------------- |
| Core Problem        | **AI Inference Filled**    | High confidence → direct use                           | ❌ Zero           |
| Target User         | **AI Inference Filled**    | Medium confidence → show in inventory, user can modify | ❌ Zero (usually) |
| Platform Ecosystem  | **AI Inference Filled**    | Same as Target User logic                              | ❌ Zero (usually) |
| Success Metric      | User confirmed | Ask if missing                                         | ✅ 1 round        |
| Current Baseline    | User confirmed | Ask if missing                                         | ✅ 1 round        |
| Compliance/Security | User confirmed | Ask if missing (smart default: "No special compliance requirements?")     | ✅ 1 round        |

**Smart Merge Rule**: Combine the 3 confirmation-needed items into **ONE consolidated question** (not sequential asking):

```
About [feature name], I understand:
- Core Problem: [inference result]
- Target Users: [inference result]
- Platform Scope: [inference result]

Before generating, 3 key items need confirmation:

1. **Success Metrics**: What quantifiable goal should this feature achieve?
   (e.g., adoption rate > 30%, conversion rate +15%)

2. **Current Alternatives**: How do users solve this problem today?
   (e.g., Excel/manual process/existing tool/no current solution)

3. **Compliance**: Any special compliance requirements?
   (e.g., GDPR, data export, audit logs. Reply "none" if not applicable)

You can reply item by item or all together in one message.
```

**Proceed when**: All 6 fields filled (inferred or confirmed).

### Headline Translation Mapping Table

PRD outline headings automatically switch based on the detected conversation language. When generating a PRD, strictly use the corresponding language for headings.

| #    | Chinese Headline     | English Headline           |
| ---- | -------------------- | -------------------------- |
| Ch1  | 问题描述             | Problem Description        |
| Ch2  | 目标定义             | Goal Definition            |
| Ch3  | 目标用户             | Target Users               |
| Ch4  | 用户故事             | User Stories               |
| Ch5  | 功能交互流程图       | Feature Flowcharts         |
| Ch6  | 详细功能清单         | Feature List               |
| Ch7  | 各详细功能说明       | Feature Details            |
| Ch8  | 埋点设计             | Tracking Design            |
| Ch9  | 未来改进计划         | Future Improvements        |
| Ch10 | 风险与依赖           | Risks and Dependencies     |
| Ch11 | 决策日志             | Decision Log               |
| Ch12 | 术语表               | Glossary                   |
| Ch13 | 假设索引             | Assumption Index           |

**Section sub-headings** (e.g., `## 变更记录` / `## Change Log`, `## 核心问题` / `## Core Problem`, `## 成功指标` / `## Success Metrics`) also follow this mapping rule and are replaced with the corresponding language during generation.

**Review Records headings and labels** also follow this mapping: in Chinese sessions keep the Chinese format below; in English sessions replace the main heading with "Review Records", sub-headings with "First Principles Validation" / "Logical Completeness" / "Boundaries and Risks", and internal labels (`用户是谁` → `Who is the user`, `他要什么` → `What does the user need`, `为什么现在要` → `Why Now`, `为什么用你的方案` → `Why Your Solution`, `怎么知道做对了` → `How to Know You're Right)` are also replaced.

### Sub-headline Translation Mapping

Sub-headings within chapters follow this mapping. Generate PRD using the language matching the detected conversation language.

#### A. Common Sub-headings

| Chinese          | English                    | Appears In    |
| ---------------- | -------------------------- | ------------- |
| 变更记录         | Change Log                 | All versions  |
| 核心问题         | Core Problem               | Chapter 1     |
| 具体问题         | Specific Problems          | Chapter 1     |
| 影响范围         | Impact Scope               | Chapter 1     |
| 核心目标         | Core Goals                 | Chapter 2     |
| 成功指标         | Success Metrics            | Chapter 2     |
| 使用场景         | Usage Scenario             | Chapter 3     |
| 验收标准         | Acceptance Criteria        | Chapters 4, 7 |
| 功能描述         | Feature Description        | Chapter 7     |
| 触发时机         | Trigger Condition          | Chapter 7     |
| 交互说明         | Interaction Details        | Chapter 7     |
| 场景行为         | Scenario Behavior          | Chapter 7     |
| 埋点说明         | Tracking Description       | Chapter 8     |
| 埋点功能清单     | Tracking Feature List      | Chapter 8     |
| 成功指标计算方式 | Metric Calculation Methods | Chapter 8     |
| CSAT 调研方案    | CSAT Research Plan         | Chapter 8     |
| 技术风险         | Technical Risks            | Chapter 10    |
| 外部依赖         | External Dependencies      | Chapter 10    |
| 已知限制         | Known Limitations          | Chapter 10    |

#### B. Review Record Labels

| Chinese          | English                     |
| ---------------- | --------------------------- |
| 评审记录         | Review Records              |
| 第一性原理验证   | First Principles Validation |
| 用户是谁         | Who is the user             |
| 他要什么         | What does the user need     |
| 为什么现在要     | Why Now                     |
| 为什么用你的方案 | Why Your Solution           |
| 怎么知道做对了   | How to Know You're Right    |
| 逻辑完整度       | Logical Completeness        |
| 断裂点           | Break Points                |
| 边界与风险       | Boundaries and Risks         |
| 异常流程         | Exception Flows             |
| 边界条件         | Boundary Conditions         |
| 外部依赖         | External Dependencies       |
| 不可控因素       | Uncontrollable Factors      |

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

When creating the task list, use chapter names matching the detected conversation language (see "Headline Translation Mapping Table"). The task structure is:

- [ ] Deep reasoning analysis
- [ ] Generate Ch1-Ch3
- [ ] Generate Ch4-Ch5
- [ ] Generate Ch6-Ch7
- [ ] Generate Ch8-Ch10
- [ ] Auto-generate Ch11-Ch13 (Decision Log, Glossary, Assumption Index)
- [ ] Run strict validation checklist
- [ ] Output completed PRD

#### Update Rules
- Mark task `completed` ONLY after chapter draft is written
- **NEVER skip tasks** — complete sequentially
- If a chapter requires user interaction → mark `in_progress`, ask question, then complete after response

#### Status Communication

Report progress after each major step, using chapter names in the detected conversation language:

Example (Chinese): "✅ 第 1-3 章已完成。正在生成用户故事..."
Example (English): "✅ Chapters 1-3 completed. Moving to User Stories..."

## When to Use This Skill

✅ Use when:
- Writing new product requirements documents
- Updating existing PRDs with new features
- Validating PRD completeness and quality
- Creating feature specifications with bidirectional traceability

❌ Don't use when:
- Writing technical design docs (use technical-spec skill)
- Creating user stories only (too lightweight)
- Writing marketing or business documents

## Prototype Workflow Constraint

If user expresses intent to create prototype/wireframe/mockup:

1. **Acknowledge intent**: Confirm user wants prototype design
2. **Explain workflow**: "I follow a 'requirements first, prototype after' workflow. A complete PRD ensures prototype accuracy and reduces rework."
3. **Check PRD status**:
   - **PRD not yet created**: Guide user to complete PRD first. Offer to start PRD creation immediately.
   - **PRD in progress**: Continue completing PRD chapters. Prototype will be designed after PRD validation passes.
   - **PRD complete & validated**: Proceed to prototype design. Suggest tools based on PRD content (Figma for UI-heavy features, Mermaid for flow diagrams, HTML prototype for interaction demos).
4. **After PRD validation**: Offer prototype design with context from the completed PRD (user stories, feature list, acceptance criteria).

**Exception**: If user explicitly overrides ("skip PRD, go straight to prototype"), respect but warn: "I'll go straight to prototype design, but note: without a PRD, requirement changes will cause significant prototype rework."

## Intent Recognition

When a user message arrives, determine the intent:

| Intent   | Trigger Signals                                              | Next Step                            |
| -------- | ------------------------------------------------------------ | ------------------------------------ |
| **create** | New PRD, write requirements doc, create product requirements | Read `references/intent-create.md`   |
| **update** | Update/modify existing PRD, PRD change, add features to existing doc | Read `references/intent-update.md`   |
| **validate** | Validate/check PRD, review requirements doc completeness   | Read `references/intent-validate.md` |

If intent is ambiguous, confirm with the user once. Update intent must provide a target file path.

## Working Mode (create/update)

**Default: coaching mode** — first autonomously infer and generate a full draft based on context, then conduct conditional interaction for completeness.

| Mode       | Behavior                                                    |
| ---------- | ----------------------------------------------------------- |
| **coaching** | First autonomously infer all chapter content to generate a full draft → self-review to find breaks/gaps → conditional interaction (only engage user when uncertainty affects subsequent chapter accuracy) → reverse questions to complete non-key inferences |
| **coaching --auto** | Same as coaching, but skips the user confirmation gate (Step 3: Boundary & Risk) and auto-accepts all [ASSUMPTION]s. Designed for automated testing where user interaction is unavailable. |
| **fast**     | Generate full PRD from existing info → reverse-question missing items |

User can switch to fast mode at any time with:
- "fast / fast path / skip / just generate / don't ask just write"

**Coaching Interaction Rules:**
- Every time a question is asked, must attach 1-3 carefully considered recommendation options (no more than 3)
- Each recommendation must include reasoning, guiding users to make choices rather than fill-in-the-blanks
- Must confirm user's answer before proceeding
- **All question text, recommendation copy, and reasoning explanations use the detected conversation language**

## Lightweight Real-time Confirmation (coaching mode)

During coaching conversation, handle inferred content in tiers:

| Inference Type      | Handling                              | Example                                    |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| **Key Assumption**  | Confirm softly on the spot, no [ASSUMPTION] tag | "I assume the target user is a broker, correct?" |
| **Non-key Inference** | Tag `[ASSUMPTION: xxx]`, don't interrupt | Auto-tagged in PRD, summarized in reverse questions at the end |

**Key Assumption Definition (8 categories):** user roles, success metric quantified values, technical constraints, permission scope, data volume, **business rules (state machines/limits/approval chains), compliance & security requirements (audit logs/data residency/GDPR), current alternative solutions / user behavior baseline**. These 8 categories must be confirmed or tagged [ASSUMPTION] before document generation.

**Non-key Inference Definition:** interaction details, UI style preferences, default parameter values, exception flow handling.

**Coaching Supplemental Behavior:**
- After generating the full PRD, append a "Reverse Questions" section at the end, listing all unconfirmed [ASSUMPTION] tags and inferred content
- User can say "rewrite chapter X" or "add Y details" for specific chapters

**Fast Path Supplemental Behavior:**
- After generating the full PRD, append a "Reverse Questions" section at the end, listing all [ASSUMPTION] tags and missing items
- User can say "rewrite chapter X" or "add Y details" for specific chapters

## Mode Switch Command Recognition

Users can explicitly control the working mode with the following commands (higher priority than default):

| User Command Example                                  | Hit Mode |
| ----------------------------------------------------- | -------- |
| "use fast/fast path/skip/just generate/don't ask just write" | fast     |
| "use coaching/coach/guide/one question at a time/take it slow" | coaching |
| "coaching --auto" | coaching --auto |

**Recognition Rules:**
1. Keywords appear in user's first message → adopt specified mode directly
2. User says "switch to X" during conversation → switch immediately, no confirmation
3. User doesn't explicitly specify → default coaching
4. Neither mode fits → ask user preference

### Auto-Testing Mode (--auto flag)

If `--auto` flag is active (e.g. user input "coaching --auto"):
- Execute Step 1 (First Principles) and Step 2 (Logical Completeness) normally
- Skip Step 3 (Boundary & Risk) — no user interaction possible in automated testing
- Auto-accept all [ASSUMPTION]s with note: "[AUTO] Accepted in --auto mode for testing"
- Append auto-acceptance summary to Review Record

Output the same Review Record format, with [AUTO] prefixed items where applicable.

### Fast Mode Self-Check & Auto-Fix (MANDATORY)

After generating the full PRD in fast mode, MUST run self-check before delivering:

1. **Run validation**: Execute the Strict Validation Checklist against the generated PRD
2. **Check US↔FR traceability**: For each F-x.x in Chapter 6 Feature List, verify `### F-x.x` section exists in Chapter 7 Feature Details
3. **Auto-fix gaps**: If any feature is missing expansion in Chapter 7:
   - Generate ONLY the missing `### F-x.x` section (User Story, Description, Acceptance Criteria, Edge Cases)
   - Append to Chapter 7 after the last existing feature section
   - Do NOT rewrite or modify existing feature sections
4. **Re-check**: Run validation again — all checks must pass
5. **If still failing**: Report remaining gaps to user with specific feature numbers

**Exception**: If `--auto` mode is also active (automated testing), auto-accept gaps and log them without asking user.

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

Review results are appended at the end of the PRD (not inserted into main document). **Heading and label language follows the detected conversation language:**
- Chinese sessions keep the Chinese format below
- English sessions replace the main heading with "Review Records", sub-headings with "First Principles Validation" / "Logical Completeness" / "Boundaries and Risks", and internal labels (`用户是谁`→`Who is the user`, `他要什么`→`What does the user need`, `为什么现在要`→`Why Now`, `为什么用你的方案`→`Why Your Solution`, `怎么知道做对了`→`How to Know You're Right`)

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

1. **Fixed Template**: CN and EN share the same 13-chapter structure (10 fixed skeleton + 3 auto-generated), heading language switches automatically based on detected conversation language, chapter order cannot be changed. See "Headline Translation Mapping Table"
2. **Strict Validation Cannot Be Skipped**: US↔FR bidirectional traceability, Chapter 6↔Chapter 7 1:1 correspondence, tracking↔success metric traceability, metric→calculation method 1:1 traceability
3. **Changelog Mandatory**: update intent must append changelog entry before saving
4. **Flowchart Required**: at least 1 mermaid flowchart, core scenarios independent; **Cross-engine compatibility (MANDATORY)**:
   - No ASCII double quotes `"` in mermaid code blocks — use single quotes `'` or no quotes
   - No circle nodes `((text))` — use rounded rectangles `(text)` for API/service calls
   - No HTML tags `<br/>` in node text — split long text into separate nodes
   - API calls/data queries/external dependencies must have failure+timeout branches
5. **Acceptance Criteria Testable**: each must contain quantifiable/executable judgment conditions
6. **[ASSUMPTION] Tag Mandatory**: inferred content must be tagged, auto-summarized to assumption index after completion
7. **One Question at a Time** (coaching mode interaction): no batch questioning
8. **Exception Path Coverage**: every API call/external dependency node in flowcharts must have success/failure/timeout branches, user operation nodes must have exception paths (network disconnect, insufficient permissions, data not found)
9. **Deep Reasoning First**: Before generating the PRD draft, must conduct deep reasoning analysis (user motivation, business value, technical feasibility, risk matrix), integrating reasoning results into PRD content rather than directly asking the user

### Platform Ecosystem Inference (Inference-first, zero-interaction design)

During Deep Reasoning (Step 1), automatically infer the product's platform ecosystem from user input:

**Inference signals**:
- Direct mentions: "iOS App", "Web", "Mini Program", "Admin Backend" → **High confidence** 🔴
- Implied needs: "Operations staff manage content" → Admin Backend; "Push notifications" → Mobile; "Scan QR code" → Mini Program; "Share to social media" → Mobile App
- Project context: Inherit platform info from referenced related docs

**Confidence levels & behavior**:
| Level | Trigger | Action | Interrupt User |
| ----- | ------- | ------ | -------------- |
| 🔴 High | User explicitly mentions | Adopt directly, generate Target Platform column | ❌ No |
| 🟡 Medium | Reasonable inference from context | Use in generation, flag for confirmation in Reverse Questions | ❌ No |
| ⚪ Low | No clear clues or pure speculation | One-line confirmation before generation: "I infer the platform is X, correct?" | ✅ Confirm |

**Chapter 6 Target Platform Column Rule**:
- Use inferred/confirmed platform for each feature in the `Target Platform` column
- If a feature's platform differs from the main product or involves cross-platform interaction → ask user to confirm
- Platform was not inferred or confirmed → use `TBD` and flag in Reverse Questions

10. **Senior PM Perspective**: Guide and think with the standard of an experienced senior product manager, introducing product thinking frameworks in problem description and goal definition chapters (Why Now, differentiation, user segmentation, business value), and providing industry best practice recommendations in the risks & dependencies chapter
11. **Recommendation-Driven Interaction**: Every time interacting with the user, provide carefully considered recommendations (no more than 3 in principle), each with clear reasoning, not fabricated, clearly mark the recommended option, let the user make a decision
12. **Global Language Consistency** — Detect user's first message language, global match: reasoning process, conversation interaction, PRD headings, PRD body all in the same language; English only permitted for code/technical identifiers; user explicit override takes highest priority
13. **Default Path Convention** — Auto-save to `docs/specs/` with clear naming; confirm path before saving
14. **Mandatory Progress Tracking** — Create TodoWrite task list at start, update after each chapter completion
15. **Cross-Agent Compatible** — Platform-agnostic skill supporting OpenCode, Claude Code, Cursor, Codex. Tool calls use generic descriptions; each agent maps to its own toolset
16. **Environment Detection First** — Must detect Node.js environment before running validation script; if absent, ask user before installing; never auto-install without confirmation
17. **Prototype Workflow Constraint** — Requirements first, prototype after. Guide users to complete PRD before prototype design. Respect explicit override but warn about rework risk.
18. **Platform Inference First** — Infer platform ecosystem, core problem, and target users from Deep Reasoning. Only ask for confirmation on low-confidence items. Merge confirmation questions into one consolidated message.

## Incremental Write Strategy (MANDATORY)

Never generate all 13 chapters in one shot. Always write in 5 batches,
appending each batch to the file immediately.

### Batch Definitions

| Batch | Chapters | Content                                                    | Write Method             |
| ----- | -------- | ---------------------------------------------------------- | ------------------------ |
| **1** | Ch1-3    | Problem Description, Goal Definition, Target Users         | `write()` create/overwrite |
| **2** | Ch4-5    | User Stories, Feature Flowcharts                           | Append to existing file  |
| **3** | Ch6-7    | Feature List, Feature Details                              | Append to existing file  |
| **4** | Ch8-10   | Tracking Design, Future Improvements, Risks & Dependencies | Append to existing file  |
| **5** | Ch11-13  | Decision Log, Glossary, Assumption Index                   | Append to existing file  |

### Rules

1. **Append-only**: Each batch appends its chapters, NEVER modifies already-written
   earlier chapters. If earlier chapters need correction (e.g. logical gaps found),
   mark them in a note and handle in the next iteration or post-generation pass.
2. **Progress notification**: After each batch save, output structured progress
   update (see "Progress Notification Rules").
3. **Checkpoint tracking**: Before writing each batch, update the `generate_progress`
   field in the PRD front matter with current batch status.
4. **Cross-platform adaptation**:
   | Platform     | Method                                                  |
   | ------------ | ------------------------------------------------------- |
   | OpenCode     | `write()` overwrite (batch 1) + `edit` append (batches 2-5) |
   | Claude Code  | `Write` overwrite (batch 1) + `Edit` append (batches 2-5)   |
   | Cursor/Codex | `Write` overwrite per batch, IDE auto-save                |
   | Fallback     | Generate all → single write (degraded mode)             |

## Progress Notification Rules (MANDATORY)

After each batch is saved, MUST output a structured progress update to the user.

### Format

Use the following format (language matches conversation language):

**English session**:
```
📋 PRD Generation Progress
✅ Batch 1/5: Chapters 1-3 (Problem Description, Goal Definition, Target Users) — Saved
⏳ Generating Batch 2/5: Chapters 4-5 (User Stories, Feature Flowcharts)...
```

**Chinese session**:
```
📋 PRD 生成进度
✅ Batch 1/5: 第 1-3 章（问题描述、目标定义、目标用户）— 已保存
⏳ 正在生成 Batch 2/5: 第 4-5 章（用户故事、功能交互流程图）...
```

### Rules

1. Show **current batch number / total batches** (e.g. "Batch 2/5")
2. Show **saved chapter names** for completed batches
3. Show **next batch content** being generated
4. Language MUST match detected conversation language
5. Include remaining time estimate when possible (e.g. "~2 batches remaining")

## Checkpoint & Recovery (MANDATORY)

### Checkpoint Tracking

Before writing each batch, update the `generate_progress` field in the PRD
front matter:

```yaml
generate_progress:
  batch_1: completed
  batch_2: in_progress
  batch_3: pending
  batch_4: pending
  batch_5: pending
  started_at: "2026-06-09T10:30:00Z"
```

### Recovery on Resume

New session opening an in-progress PRD file:
1. Read `generate_progress` field from front matter
2. Find first batch with status `pending` or `in_progress`
3. Resume generation from that batch (do NOT regenerate completed batches)
4. Update checkpoint after each batch save

### Status Values

| Status      | Meaning                         |
| ----------- | ------------------------------- |
| `completed`   | Batch fully written and saved   |
| `in_progress` | Batch currently being generated |
| `pending`     | Batch not yet started           |

## Final Cleanup (MANDATORY for completed PRDs)

After Batch 5 completes AND validation passes, execute final cleanup:

1. **Remove entire front matter block** from PRD file
2. **Keep only** the `## Metadata` section as official business metadata source
3. **Verify** no `generate_progress` or other temporary fields remain

**Rationale**:
- Prevents duplicate metadata (front matter vs Metadata table)
- Cleaner final document for human reading and tool integration
- Eliminates risk of metadata inconsistency

**Exception**: Do NOT cleanup if session interrupted with `pending` batches;
preserve checkpoint for recovery.

**Verification command**:
```bash
grep -c "^---$" prd-file.md   # Should return 0 after cleanup
```

## PRD Quality Scoring

Every PRD is scored on 7 dimensions (max 100 points):

| Dimension          | Weight | Max Points | Description                                      |
| ------------------ | ------ | ---------- | ------------------------------------------------ |
| Completeness       | 20%    | 20         | All 13 chapters present and filled               |
| Traceability       | 20%    | 20         | US↔FR 1:1 mapping, no orphaned requirements      |
| Testability        | 15%    | 15         | Acceptance criteria are executable and quantifiable |
| Clarity            | 15%    | 15         | Unambiguous language, clear terminology          |
| Exception Coverage | 10%    | 10         | Failure paths documented for all external calls  |
| Metrics Alignment  | 10%    | 10         | Tracking events map to success metrics 1:1       |
| Risk Management    | 10%    | 10         | Dependencies, risks, and mitigations addressed   |

**Benchmark Scores:**
- **70+ points** = production-ready
- **85+ points** = excellent
- **< 70 points** = needs revision before sharing with stakeholders

## PRD Standard Template

Full template in `assets/prd-template.md`. 13-chapter shared structure (10 fixed skeleton + 3 auto-generated), heading language follows conversation language during generation:

1. Problem Description / 2. Goal Definition / 3. Target Users / 4. User Stories /
5. Feature Interaction Flowcharts / 6. Detailed Feature List / 7. Feature Details /
8. Tracking Design / 9. Future Improvement Plans / 10. Risks & Dependencies
+ 11. Decision Log (auto-generated) / 12. Glossary (auto-generated) / 13. Assumption Index (auto-generated)

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

## Post-Update Quality Re-scoring (Mandatory)

After saving an updated PRD, perform the following re-scoring:

1. **Re-run** full 7-dimension quality scoring
2. **Read** previous score from changelog entry
3. **Calculate** delta (= new score - old score)
4. **If delta < -10 OR new score < 70**:
   Output warning (in conversation language):
   "⚠️ This update reduced quality score from {old} to {new} (Δ{delta}). Review recommended before sharing."
5. **Append** score record to changelog: `"v{version} — Quality: {old} → {new} ({delta})"`

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

### Validation Script Bilingual Support (MANDATORY)

The validation script `scripts/validate-prd.js` fully supports both English and Chinese PRDs. All checks are language-agnostic:

| Check Item | English Keywords | Chinese Keywords |
|------------|-----------------|------------------|
| Changelog | Changelog, \| Date \| | 变更记录，\|\s*Date\s*\| |
| Key Update Notes | Key Update Notes | 关键更新说明 |
| Chapter 6 | Detailed Feature List | 详细功能清单 |
| Chapter 7 | Feature Details | 各详细功能说明 |
| Chapter 9 | Future Improvement Plans | 未来改进计划 |
| Success Metric | Success Metric | 成功指标 |
| Calculation Method | Calculation Method | 计算方式 |
| External Dependencies | External Dependencies, Dependency Item | 外部依赖，依赖项 |
| Assumption Index | Assumption Index | 假设索引 |
| Data Table | Field, Type, Description | 字段，类型，描述 |
| Review Record | ## Review Record | ## 评审记录 |
| Degradation Strategy | retry, degrade, fallback | 重试，降级，回退 |

**Verification**: Both English PRDs and Chinese PRDs will pass all validation checks without modifications.
