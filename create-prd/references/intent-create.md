# create Intent Detailed Flow

## Step 1: Intent Recognition + Mode Selection

1. Scan user's first message, detect if mode switch commands are present (fast/coaching keywords)
2. If explicit command present → adopt specified mode directly
3. If not explicitly specified → **default coaching mode**
4. User can switch modes at any time

## Step 2: Metadata Auto-Inference

Auto-infer and fill all Metadata fields from conversation context, only ask uniformly when completely unable to infer.

| Field | Inference Source | Inference Strategy |
| ----- | ---------------- | ------------------ |
| Author | Mentioned in conversation / git config user.name / history session memory | Prioritize author name explicitly mentioned in conversation |
| Status | Fixed | `Draft` |
| Created | System date | Today |
| Last Updated | System date | Today |
| Version | Fixed for new | `v1.0.0` |
| Project | Requirement name / mentioned in conversation | Extract from requirement name in user's first message |
| Related Docs | Default | "None" |
| Prototype | Default | "None" |

**Uniform Ask Rule**: Only when author and project fields are completely unable to be inferred, ask once uniformly:
> "Please fill in the Metadata info: who is the author? what is the project name? (fill 'None' for related docs and prototype if not applicable)"

## Step 3a: fast Mode Flow

1. User pastes large background/requirements → generate full PRD directly
2. Tag inferred content with `[ASSUMPTION: xxx]`
3. After generation, go through chapter by chapter, ask about missing items:
   - Success metric quantified values
   - Acceptance criteria testable conditions
   - Flowchart branch details
   - External dependency schedule status
4. After user confirmation, proceed to Step 4

## Step 3b: coaching Mode Flow (Refactored)

**New flow: First autonomous inference → Conditional interaction → Reverse questions for completion**

### Step 1: Autonomous Inference Draft

Based on user's first message and all visible context, infer content for all chapters from a senior PM perspective:

1. **Deep Reasoning Analysis** (must do before generation):
   - User motivation analysis: What problem does the user really want to solve? What is the underlying business value?
   - Why Now validation: Why build this feature now? Is there a time window?
   - User segmentation: Is the target user profile clear? Are there secondary user groups?
   - Technical feasibility: Is the solution technically viable? What is the biggest risk?
   - Risk matrix: List the top 3 possible risks and mitigation plans

2. **分批次推理与写入（按 Progress Tracking 分5批）**：
   - Batch 1：Ch1-3 推理 → write() 写入文件
   - Batch 2：追加 Ch4-5 → write() 覆盖
   - Batch 3：追加 Ch6-7 → write() 覆盖
   - Batch 4：追加 Ch8-10 → write() 覆盖
   - Batch 5：追加 Ch11-13 → write() 覆盖
   
   原则：每批次只追加自己的章节内容，不修改已写入的前序章节。

3. **Self-review**: Run the strict validation checklist, checking US↔FR traceability, tracking↔metric traceability, metric→calculation method traceability, etc.

### Step 2: Conditional Interaction

After self-review, decide whether to interact with the user based on the type of issues found:

| Issue Type Found | Handling |
| ------------- | --------- |
| **Key Assumption Missing** (user roles, success metric quantified values, technical constraints, permission scope, data volume) | Must confirm with user, attach 1-3 recommendation options |
| **Uncertainty affects subsequent chapter accuracy** (e.g., trigger mechanism uncertain leading to flowchart design issues) | Complete before proceeding |
| **Non-key Inference** (interaction details, UI style preferences, default parameter values, exception flow handling) | Tag `[ASSUMPTION: xxx]`, don't interrupt, summarize in reverse questions |

**Recommendation Options Rule** (must follow every time a question is asked):
- Attach 1-3 carefully considered recommendation options (no more than 3)
- Each with recommendation reasoning, helping users understand why it's recommended
- Clearly mark "Recommended", guiding users to make choices rather than fill-in-the-blanks
- Example: "For the configuration update trigger method, which do you prefer?
  - **A. Polling (Recommended)**: App periodically (e.g., every 5 minutes) checks for latest config version → Reasoning: Simple to implement, doesn't rely on push infrastructure, suitable for infrequent update scenarios
  - **B. Push method**: Server notifies App via push/WebSocket after config update → Requires additional push service support
  - **C. Hybrid method**: Polling as primary, push as supplement → Suitable for high-frequency update scenarios with high real-time requirements"

### Step 3b: 强制确认关卡 — 统一提问所有未完成确认项

After 5 batches of writing, consolidate ALL unconfirmed items — key assumptions not yet explicitly confirmed, non-key inferences, and self-review gaps — into a single structured list. Present this as a unified table and require user confirmation before marking the PRD as Confirmed.

#### 统一确认表格格式

| # | 内容 | 对应章节 | 错误影响 | 确认状态 | 修正/原因 |
|---|------|---------|---------|---------|---------|
| 1 | [ASSUMPTION] {inference description} | Ch.3 | {impact if wrong} | [Pending] | — |
| 2 | [ASSUMPTION] {inference description} | Ch.5 | {impact if wrong} | [Pending] | — |
| ... | ... | ... | ... | ... | ... |

**列定义：**
- **#** — 序号
- **内容** — [ASSUMPTION] 标签 + 推理内容（自动从对话中提取）
- **对应章节** — 该假设影响的具体章节编号
- **错误影响** — 若此假设错误，对产品决策/开发的影响程度
- **确认状态** — 当前状态：Pending Confirmation / Confirmed / Rejected / Deferred
- **修正/原因** — 用户提供的修正内容或推迟原因（Rejected/Deferred 时必填）

#### "Accept All" 批量确认选项

At the top of the confirmation list, provide an **"Accept All"** batch option:

```
📋 **批量操作**:
  - `accept all`          → 一次性接受所有未确认项（快速通过低风险假设）
  - `accept 1,3,5`       → 仅接受第 1、3、5 项
  - `reject 2: <修正内容>` → 拒绝第 2 项并提供替代内容（自动更新对应章节）
  - `defer 4: <原因>`     → 推迟第 4 项（自动记录到 Chapter 12 Assumption Index）
```

**Usage Example:**
```
User: accept all
→ 所有 Pending Confirmation 项变为 Confirmed，继续下一步

User: accept 1,3  defer 2: 需确认数据口径
→ 第 1、3 项 Confirmed，第 2 项 Deferred，第 4+ 项仍 Pending
```

#### 状态管理规则

- **Pending Confirmation** → 初始状态，所有未确认项默认此状态
- **Confirmed** → 用户接受（Accept），该项确认完成
- **Rejected** → 用户拒绝并提供修正内容，修正内容自动更新到对应章节
- **Deferred** → 用户推迟并说明原因，自动记录到 Chapter 12 (Assumption Index)

**规则：**
1. 所有项必须达到 Confirmed 或 Deferred 状态后才能继续下一步
2. 存在任何 Pending Confirmation 项时，PRD 状态保持为 **Draft (Pending Confirmation)**
3. 存在任何 Rejected 项时，必须完成对应章节的内容替换后才能继续
4. 确认过程中允许用户随时要求修改特定章节，修改后对应的 [ASSUMPTION] 状态自动重置为 Pending Confirmation
5. 输出 PRD quality score（按 `references/scoring-rules.md` 执行）

#### 为什么需要统一列表（Why Unified List Matters）

- **完整性**：确保每个推理点都经过用户确认，不存在"AI 自作主张"的内容
- **可追溯**：统一列表便于后续审查和变更追溯
- **影响可视化**："错误影响"列让用户直观了解每个假设的风险等级
- **批量效率**：Accept All 让低风险假设快速通过，用户只需关注高风险项
- **状态透明**：所有项的状态一目了然，不会遗漏未确认项

## Step 4: Flowchart Generation

1. Identify business scenarios from interaction logic
2. Propose split plan (by scenario/data flow, 8-20 nodes per chart)
3. Generate mermaid code one chart at a time, require user confirmation for each
4. Validate: node count, syntax, state value alignment with data tables

Rules detailed in `references/mermaid-rules.md`

## Step 5: Strict Validation

After generation, automatically run:

1. US ↔ F-x.x bidirectional traceability (list orphaned items)
2. Chapter 6 vs Chapter 7 1:1 correspondence (list missing items)
3. Acceptance criteria testability validation (mark untestable items)
4. Tracking ↔ success metric bidirectional traceability
5. Number of success metrics in Chapter 2 vs calculation methods in section 8.3 1:1 correspondence
6. Flowchart state values aligned with data table fields
7. External dependency schedule status field compliance
8. PRD quality score (7 dimensions)

## Step 6: Requirements Review (Mandatory)

After PRD draft output, must execute requirements review process:

1. **First Principles Validation** (5+ questions): validate user, needs, urgency, differentiation, success metrics one by one
2. **Logical Completeness Review**: full-chain traceability (problem→goal→US→FR→flowchart→tracking→metric→calculation method)
3. **Boundary & Risk Scan**: exception flows, boundary conditions, external dependencies, uncontrollable factors
4. **Over 10 questions**: after completing 10 rounds, ask user if another deep review round is needed

Review results appended at end of PRD in fixed format (not inserted into main document).

Rules detailed in `references/review-rules.md`

## Step 7: Glossary + Assumption Index Auto-Generation

1. Scan document, extract domain nouns appearing ≥2 times across chapters → candidate glossary
2. Scan `[ASSUMPTION]` tags → summarize to Chapter 12
3. Show candidate glossary to user, confirm entries

## Step 8: Save

1. Ask save path (default `docs/{product}_prd/PRD-{product}-{feature}.md`)
2. Write file, return path
3. Prompt user can continue with update or validate
