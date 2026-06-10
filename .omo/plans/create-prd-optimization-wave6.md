# create-prd 技能 Wave 6 优化执行计划

## TL;DR

> **Quick Summary**: 在保持需求严谨性的前提下，通过深度推理和智能合并策略，将 Phase 0 交互从最多 5 轮减少到 1 轮，同时增加 YAML 引号规范性、原型流程约束、功能清单平台归属列。
> 
> **Deliverables**:
> - `assets/prd-template.md`: Front matter 引号化 + Chapter 6 Target Platform 列
> - `SKILL.md`: Prototype Workflow Constraint + Platform Ecosystem Inference + Phase 0 分层策略 + Core Principles 新增 2 条
> - `references/section-rules.md`: 功能清单平台归属规则
> - `scripts/validate-prd.js`: 新增 3 项校验
> 
> **Estimated Effort**: Short (4 waves, ~94 行变更)
> **Parallel Execution**: YES - 4 waves, Wave 1 & 2 独立可并行

---

## Context

### 原始需求
1. PRD 模板 front matter 值统一加 `"` 包裹（YAML 1.2 标准）
2. 用户有原型意图时先提示遵守工作流（PRD 完善 → 原型设计）
3. 需求清单增加系统/平台/app 列，不确定时及时确认

### 优化演进
- 用户要求"深度推理预测 + 减少打扰"
- 讨论后采纳"推理优先 + 置信度分层 + 关键项合并提问"策略
- Phase 0 从"5 项必问"优化为"3 项推理填充 + 3 项合并为 1 轮提问"

---

## Work Objectives

### Core Objective
通过深度推理和智能合并策略，最小化用户交互轮次，同时保持需求严谨性。

### Must Have
- Front matter 全部 8 个值加引号
- Chapter 6 增加 Target Platform 列
- Prototype Workflow Constraint 规则
- Platform Ecosystem Inference（高/中/低置信度分层）
- Phase 0 分层策略（3 项推理 + 3 项合并提问）
- Core Principles 新增第 17、18 条
- validate-prd.js 新增对应校验

### Must NOT Have
- 不在 SKILL.md 中增加独立一轮交互问项
- 不对高风险信息（Success Metric、Current Baseline、Compliance）做纯推理填充
- 不改变现有 coaching/fast 模式的核心逻辑
- 不引入新文件

---

## Verification Strategy

### QA Policy
每项修改后读取对应行验证。最终运行 validate-prd.js 确认新增校验生效。

### Test Decision
- **Automated tests**: None (no test framework present)
- **Agent-Executed QA**: Always

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (模板层修改 - 独立，可与其他 wave 并行):
├── Task 1.1: Front matter YAML 引号化 (assets/prd-template.md) [quick]
└── Task 1.2: Chapter 6 增加 Target Platform 列 (assets/prd-template.md) [quick]

Wave 2 (技能规则层修改 - 依赖 Wave 1 完成，因 SKILL.md 修改可能影响模板引用):
├── Task 2.1: 新增 Prototype Workflow Constraint (SKILL.md) [quick]
├── Task 2.2: 新增 Platform Ecosystem Inference (SKILL.md) [unspecified-high]
└── Task 2.3: 替换 Phase 0 分层策略 (SKILL.md) [unspecified-high]

Wave 3 (引用文件 + 验证脚本 - 可与 Wave 2 并行):
├── Task 3.1: 更新 section-rules.md (references/section-rules.md) [quick]
└── Task 3.2: 更新 validate-prd.js (scripts/validate-prd.js) [quick]

Wave FINAL (并行审查):
├── Task F1: Plan compliance audit (oracle) [oracle]
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> 呈现结果 -> 获取用户明确确认
```

### Dependency Matrix

| Task  | Blocked By | Blocks    |
| ----- | ---------- | --------- |
| 1.1   | None       | 2.2, 2.3  |
| 1.2   | None       | 2.2, 2.3  |
| 2.1   | None       | F1-F4     |
| 2.2   | 1.1, 1.2   | F1-F4     |
| 2.3   | 1.1, 1.2   | F1-F4     |
| 3.1   | None       | F1-F4     |
| 3.2   | None       | F1-F4     |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks → `quick`
- **Wave 2**: 3 tasks → T2.1 `quick`, T2.2 `unspecified-high`, T2.3 `unspecified-high`
- **Wave 3**: 2 tasks → `quick`
- **Final**: 4 tasks → `oracle`, `unspecified-high`, `unspecified-high`, `deep`

---

## TODOs

- [x] 1. Front matter YAML 引号化

  **What to do**:
  - 读取 `assets/prd-template.md` 第 1-10 行
  - 给 8 个 front matter 值统一加 `""` 包裹
  - 验证 YAML 语法正确（无破坏性修改）

  **Must NOT do**:
  - 不修改 front matter 的键名
  - 不修改缩进或结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无（纯文本编辑）

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 1.2 同文件但不冲突)
  - **Parallel Group**: Wave 1 (与 Task 1.2)
  - **Blocks**: 2.2, 2.3（依赖模板结构变化）
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `assets/prd-template.md` 第 1-10 行所有 8 个值有 `""` 包裹
  - [ ] YAML 语法正确（无解析错误）

  **QA Scenarios**:

  ```
  Scenario: Front matter YAML 引号格式验证
    Tool: Bash (节点 js-yaml 解析或使用 grep 验证)
    Steps:
      1. 执行: grep -A10 '^---' assets/prd-template.md | head -11
    Expected Result: 所有 8 个值格式为 `key: "value"`
    Evidence: .omo/evidence/task-1.1-frontmatter-quote.txt
  ```

  **Commit**: YES (groups with 1.2)
  - Message: `docs(create-prd): quote all front matter values per YAML 1.2 spec`
  - Files: `assets/prd-template.md`

---

- [x] 2. Chapter 6 增加 Target Platform 列

  **What to do**:
  - 读取 `assets/prd-template.md` 第 110-120 行（Chapter 6 详细功能清单）
  - 在 `Feature Name` 和 `Priority` 之间插入 `Target Platform` 列
  - 更新表头和数据行

  **Must NOT do**:
  - 不改变表格其他列的顺序或内容
  - 不修改章节结构

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 1.1 同文件不同区域)
  - **Parallel Group**: Wave 1 (与 Task 1.1)
  - **Blocks**: 2.2（依赖新列存在以引用）
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Chapter 6 表格表头包含 `Target Platform` 列
  - [ ] 数据行包含目标平台枚举值示例

  **QA Scenarios**:

  ```
  Scenario: Chapter 6 表格 Target Platform 列存在性验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "Target Platform" assets/prd-template.md
    Expected Result: 至少在表头和数据行各出现 1 次
    Evidence: .omo/evidence/task-1.2-target-platform-column.txt
  ```

  **Commit**: YES (groups with 1.1)
  - Message: `feat(create-prd): add Target Platform column to Chapter 6 feature list`
  - Files: `assets/prd-template.md`

---

- [x] 3. 新增 Prototype Workflow Constraint

  **What to do**:
  - 在 SKILL.md 的 `## When to Use This Skill` 之后、`## Intent Recognition` 之前插入新小节
  - 定位 `## When to Use This Skill` 的结束位置和 `## Intent Recognition` 的开始位置
  - 插入完整的 Prototype Workflow Constraint 规则（~13 行）

  **Must NOT do**:
  - 不修改现有 When to Use / Intent Recognition 内容
  - 不改变文件其他部分

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (与 2.2, 2.3 并行)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `## Prototype Workflow Constraint` 存在于 SKILL.md
  - [ ] 插入位置正确（When to Use 之后，Intent Recognition 之前）
  - [ ] 包含 Acknowledge → Explain → Check → After 4 步流程
  - [ ] 包含 Exception 处理规则

  **QA Scenarios**:

  ```
  Scenario: Prototype Workflow Constraint 规则存在性验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "Prototype Workflow Constraint\|Acknowledge intent\|Explain workflow\|PRD not yet created\|PRD in progress\|PRD complete" SKILL.md
    Expected Result: 规则标题和核心流程步骤都存在
    Evidence: .omo/evidence/task-2.1-prototype-constraint.txt
  ```

  **Commit**: YES
  - Message: `feat(create-prd): add prototype workflow constraint rule`
  - Files: `SKILL.md`

---

- [x] 4. 新增 Platform Ecosystem Inference

  **What to do**:
  - 在 SKILL.md 的 `## Core Principles` 区域，Principle 9（Deep Reasoning First）之后插入独立小节
  - 或使用 `edit` 在 Principle 9 描述后、Principle 10 之前插入
  - 插入完整的 Platform Ecosystem Inference 规则（~24 行）

  **Must NOT do**:
  - 不修改现有 Principle 9 的内容
  - 不改变编号顺序

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `brainstorming`（需要精确插入位置判断）

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (与 2.1, 2.3 并行)
  - **Blocks**: F1-F4
  - **Blocked By**: 1.1, 1.2（依赖模板新列存在以引用）

  **Acceptance Criteria**:
  - [ ] `Platform Ecosystem Inference` 小节存在于 SKILL.md
  - [ ] 包含 3 种 Inference signals（直接提到、隐含需求、项目上下文）
  - [ ] 包含 3 级置信度行为表（🔴高/🟡中/⚪低）
  - [ ] 包含 Chapter 6 Target Platform Column Rule（含 TBD 处理）

  **QA Scenarios**:

  ```
  Scenario: Platform Ecosystem Inference 规则完整性验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "Platform Ecosystem Inference\|Inference signals\|High confidence\|Medium confidence\|Low confidence\|Target Platform Column Rule\|TBD" SKILL.md
    Expected Result: 所有关键元素都存在
    Evidence: .omo/evidence/task-2.2-platform-inference.txt
  ```

  **Commit**: YES
  - Message: `feat(create-prd): add platform ecosystem inference rule with confidence levels`
  - Files: `SKILL.md`

---

- [x] 5. 替换 Phase 0 分层策略

  **What to do**:
  - 在 SKILL.md 中定位 Phase 0 相关声明的位置
  - 检查当前是否有现有的 Phase 0 声明，如果有则替换；如果没有则在合适位置新增
  - 插入完整的 Phase 0: Key Information Inventory 分层策略（~30 行）
  - 包含 6 字段的 Source/Behavior/Interaction Cost 表
  - 包含 Smart Merge Rule 合并提问模板

  **Must NOT do**:
  - 不改变现有 Deep Reasoning 规则（Principle 9）
  - 不破坏其他规则的上下文

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (与 2.1, 2.2 并行)
  - **Blocks**: F1-F4
  - **Blocked By**: 1.1, 1.2

  **Acceptance Criteria**:
  - [ ] Phase 0 分层策略存在于 SKILL.md
  - [ ] 包含 6 字段表（Core Problem、Target User、Platform Ecosystem 为 AI 推理填充；Success Metric、Current Baseline、Compliance 为用户确认）
  - [ ] 包含 Smart Merge Rule 合并提问模板
  - [ ] 包含 Proceed when 条件

  **QA Scenarios**:

  ```
  Scenario: Phase 0 分层策略完整性验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "Phase 0\|Key Information Inventory\|AI 推理填充\|User confirmed\|Smart Merge Rule\|Success Metric\|Current Baseline\|Compliance" SKILL.md
    Expected Result: 所有关键元素都存在
    Evidence: .omo/evidence/task-2.3-phase0-strategy.txt
  ```

  **Commit**: YES
  - Message: `feat(create-prd): implement Phase 0 layered strategy with inference-first approach`
  - Files: `SKILL.md`

---

- [x] 6. Core Principles 新增第 17、18 条

  **What to do**:
  - 在 SKILL.md 的 `## Core Principles` 列表末尾（Principle 16 之后）新增 2 条原则
  - 第 17 条：Prototype Workflow Constraint
  - 第 18 条：Platform Inference First

  **Must NOT do**:
  - 不修改现有 1-16 条原则

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (与 2.1-2.3 并行)
  - **Blocks**: F1-F4
  - **Blocked By**: 2.1, 2.2（依赖新规则存在）

  **Acceptance Criteria**:
  - [ ] 第 17 条存在：`17. **Prototype Workflow Constraint** — ...`
  - [ ] 第 18 条存在：`18. **Platform Inference First** — ...`

  **QA Scenarios**:

  ```
  Scenario: Core Principles 新增规则验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "^17\.\|^18\." SKILL.md
    Expected Result: 第 17、18 条都存在
    Evidence: .omo/evidence/task-2.4-core-principles.txt
  ```

  **Commit**: YES
  - Message: `feat(create-prd): add principles 17 and 18 for prototype constraint and platform inference`
  - Files: `SKILL.md`

---

- [x] 7. 更新 section-rules.md 功能清单规则

  **What to do**:
  - 读取 `references/section-rules.md`
  - 定位 Chapter 6 功能清单生成规则区域
  - 新增 Target Platform Column 规则（~3 行）

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 3.2)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `references/section-rules.md` 包含 Target Platform 相关规则
  - [ ] 引用了 Platform Ecosystem Inference 概念

  **QA Scenarios**:

  ```
  Scenario: section-rules.md Target Platform 规则验证
    Tool: Bash (grep)
    Steps:
      1. 执行: grep -n "Target Platform\|Platform Ecosystem" references/section-rules.md
    Expected Result: 至少出现 1 次
    Evidence: .omo/evidence/task-3.1-section-rules.txt
  ```

  **Commit**: YES
  - Message: `docs(create-prd): add target platform rule to section-rules.md`
  - Files: `references/section-rules.md`

---

- [x] 8. 更新 validate-prd.js 新增校验

  **What to do**:
  - 读取 `scripts/validate-prd.js`
  - 在现有校验逻辑末尾新增 3 项校验：
    1. Front matter 引号校验
    2. Chapter 6 Target Platform 列存在性校验
    3. Platform ecosystem 推断确认提示
  - 确保新增校验输出格式与现有日志一致

  **Must NOT do**:
  - 不修改现有校验逻辑
  - 不改变脚本执行流程

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `backend-development`（如果需要理解脚本结构）

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 3.1)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] validate-prd.js 包含 Front matter 引号校验
  - [ ] validate-prd.js 包含 Target Platform 列校验
  - [ ] 运行脚本无语法错误

  **QA Scenarios**:

  ```
  Scenario: validate-prd.js 语法验证
    Tool: Bash (node)
    Steps:
      1. 执行: node -c scripts/validate-prd.js
    Expected Result: 无语法错误输出
    Evidence: .omo/evidence/task-3.2-validate-syntax.txt
  ```

  **Commit**: YES
  - Message: `feat(create-prd): add validation checks for front matter quotes and target platform column`
  - Files: `scripts/validate-prd.js`

---

## Final Verification Wave

- [x] F1. **Plan compliance audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check all evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code quality review** — `unspecified-high`
  Read all changed files. Check for: edit match failures, partial writes, YAML syntax errors, JS syntax errors. Verify no unintended modifications to adjacent content.
  Output: `Files [N/N clean] | Issues [N] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Execute all QA scenarios from tasks. Verify each evidence file exists. Test front matter YAML parsing. Verify SKILL.md structure integrity (no broken headings).
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope fidelity check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **Commit 1** (Tasks 1.1, 1.2): `docs(create-prd): quote front matter + add target platform column`
  - Files: `assets/prd-template.md`

- **Commit 2** (Tasks 2.1-2.4): `feat(create-prd): add prototype constraint, platform inference, phase0 strategy`
  - Files: `SKILL.md`

- **Commit 3** (Tasks 3.1, 3.2): `chore(create-prd): update section-rules and validate-prd.js`
  - Files: `references/section-rules.md`, `scripts/validate-prd.js`

---

## Success Criteria

### Verification Commands
```bash
grep -c "\"" assets/prd-template.md  # Expected: 8 quoted front matter values
grep -n "Target Platform" assets/prd-template.md  # Expected: at least header + 2 data rows
grep -n "Prototype Workflow Constraint" SKILL.md  # Expected: 1 match (heading) + 1 match (principle)
grep -n "Platform Ecosystem Inference" SKILL.md  # Expected: 1 match (heading) + 1 match (principle)
grep -n "Phase 0" SKILL.md  # Expected: at least 1 match (strategy heading)
grep -n "^17\.\|^18\." SKILL.md  # Expected: 2 matches
node -c scripts/validate-prd.js  # Expected: no syntax error
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] No unintended file modifications
- [ ] YAML syntax valid
- [ ] JS syntax valid
- [ ] SKILL.md heading structure intact