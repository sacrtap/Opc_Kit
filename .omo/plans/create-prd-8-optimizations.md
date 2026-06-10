# create-prd 技能 8项优化合并实施

## TL;DR

> **Quick Summary**: 一次性实施6项优化（P0:1, P1:4, P2:1），覆盖6个文件的修改
>
> **Deliverables**:
> - SKILL.md: 强制反馈循环 + 分步写入 + 更新后重评质量 + 原型流程约束
> - intent-create.md: 分步写入重构 + 强制反馈循环
> - intent-update.md: 更新后重评质量
> - section-rules.md: 平台列定义
> - assets/prd-template.md: Chapter 6 增加 Platform 列
> - scripts/validate-prd.js: 流程图语法验证
> - review-rules.md: 强制确认流程定义
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 多文件并行修改，同文件内串行
> **Critical Path**: SKILL.md → intent-create.md → review-rules.md

**已放弃优化项（用户确认移除）**:
- ~~AI工具内置提问~~ → 保持现有对话流提问方式
- ~~流程图数量控制~~ → 不增加流程图总数上限

## Context

### Original Request
用户提出8个优化点，经 Product Manager 详细分析后确认优先级 P0:1 / P1:4 / P2:3，一次性全部实施。

### Previous Optimizations (已完成)
- 语言一致性规则（第70-74行）
- 双语标题映射表（第305-330行）
- 2026-05-22: Phase 0前置采集 + 8类Key Assumption + Fast Mode Smart Gate + No Fabrication Rule + 增量审查 + Decision Log追踪

### 优先级映射

| 排序 | 优化项             | 优先级 |
| ---- | ------------------ | ------ |
| 1    | 强制反馈循环       | P0     |
| 2    | 需求清单增加平台列 | P1     |
| 3    | 流程图语法验证     | P1     |
| 4    | 更新后重评质量     | P1     |
| 5    | 原型设计流程约束   | P1     |
| 6    | 分步写入           | P2     |

## Work Objectives

### Core Objective
对 create-prd 技能实施全部8项优化，确保7个文件修改无冲突，版本升级至 v2.1.0

### Must Have
- 每项优化有清晰的新增/修改代码
- validate-prd.js 新增验证逻辑不影响现有检查
- 跨文件修改保持一致性（如 SKILL.md 引用了新流程，对应 reference 文件也必须更新）

### Must NOT Have
- 不删除或破坏已落地的优化（语言一致性、双语映射、Phase 0、Key Assumption 8类等）
- 不修改 SKILL.md frontmatter 的结构化字段
- 不引入新的外部依赖（mermaid 语法验证需使用轻量方式）

## Execution Strategy

### 并行执行波形

```
Wave 1 (Foundation — 3文件并行):
├── Task 1: scripts/validate-prd.js — 流程图语法验证
├── Task 2: assets/prd-template.md — Chapter 6 增加 Platform 列
└── Task 3: section-rules.md — Chapter 6 平台列规则

Wave 2 (Core Logic — 3文件串行):
├── Task 4: SKILL.md — 4项修改（反馈循环、分步写入、重评质量、原型约束）
├── Task 5: intent-create.md — 分步写入重构 + 强制反馈循环
└── Task 6: review-rules.md — 强制确认流程定义

Wave 3 (Update Flow):
└── Task 7: intent-update.md — 更新后重评质量
```

## TODOs

- [ ] 1. validate-prd.js 流程图语法验证

  **What to do**:
  - 增加 mermaid 语法验证（轻量正则方式）
  - 保持现有所有检查不变

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 无

  **Acceptance Criteria**:
  - `node scripts/validate-prd.js` 对已有 PRD 不报新增错误
  - 对含 mermaid 语法错误的 PRD 能检测出错误

- [ ] 2. prd-template.md 增加平台列

  **What to do**:
  - Chapter 6 表格头增加 "Platform" 列
  - 取值约束：Web/iOS/Android/Admin/All，多平台用 `/` 分隔

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 无

  **Acceptance Criteria**:
  - Chapter 6 表格包含 Platform 列
  - 示例行显示正确的 Platform 取值

- [ ] 3. section-rules.md 平台列规则

  **What to do**:
  - 新增 Chapter 6 平台列定义
  - 场景处理表：明确指定/可推断/无法推断
  - 取值约束

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 无

  **Acceptance Criteria**:
  - 包含 Platform/System Column Rules
  - 包含场景处理表
  - 包含取值约束

- [ ] 4. SKILL.md 4项核心修改（阻塞 Wave 2）

  **What to do**:
  按顺序修改：
  1. **分步写入**: 修改 Progress Tracking 任务列表（添加"+write"），增加跨平台写入方式表
  2. **强制反馈循环**: 在核心原则新增第17条，在需求审核流程后插入Step 4
  3. **更新后重评质量**: 在质量评分部分增加"更新重评规则"，验证清单增加重评检查
  4. **原型设计流程约束**: 在意图识别表新增"prototype"行，When to Use 增加原型前置约束

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Wave 1 全部完成
  - **Blocks**: Task 5, Task 6

  **Acceptance Criteria**:
  - 所有4项修改都已应用
  - 核心原则从16条增至17条
  - 所有行号引用正确
  - 无破坏性修改

- [ ] 5. intent-create.md 分步写入 + 强制反馈

  **What to do**:
  - 修改 Step 3: 从"一次性推理草稿"改为分批次推理+写入
  - 修改 Step 3b Reverse Questions: 升级为强制确认关卡
  - 增加确认状态的元数据标记

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must read current file first)
  - **Blocked By**: Task 4
  - **Blocks**: Task 7

  **Acceptance Criteria**:
  - Step 3 包含分批次推理+写入说明
  - Step 3b 包含强制确认关卡
  - 与 SKILL.md 新规则一致

- [ ] 6. review-rules.md 强制确认流程

  **What to do**:
  - 新增强制确认流程定义
  - [ASSUMPTION] 项呈现方式
  - 批量确认语法支持

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Blocked By**: Task 4
  - **Blocks**: 无

  **Acceptance Criteria**:
  - 包含强制确认流程定义
  - 包含批量确认语法

- [ ] 7. intent-update.md 更新后重评质量

  **What to do**:
  - 在 update 流程末尾增加 Re-score Quality 步骤
  - 新旧分数对比逻辑
  - 质量下降警告机制

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must read current file first)
  - **Blocked By**: Task 4, Task 5
  - **Blocks**: 无

  **Acceptance Criteria**:
  - 包含更新后重评质量步骤
  - 包含旧新分数对比逻辑
  - 包含质量下降警告

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  验证每个 Must Have 都已实施，每个 Must NOT Have 都已遵守

- [ ] F2. **Code Quality Review** — `unspecified-high`
  验证所有文件的语法正确性、引用一致性

- [ ] F3. **Real Manual QA** — `unspecified-high`
  逐项执行8个优化项的 Acceptance Criteria

- [ ] F4. **Scope Fidelity Check** — `deep`
  验证7个文件修改范围正确，无未授权修改

## Commit Strategy

- **1**: `feat(create-prd): implement 6 optimizations (feedback loop, platform column, mermaid validation, re-score, prototype gate, incremental write)`
  - 6 files modified
  - Version bump: 2.0.0 → 2.1.0

## Success Criteria

### Verification Commands
```bash
grep "Mandatory Feedback" create-prd/SKILL.md  # Expected: 1 match
grep "Platform" create-prd/assets/prd-template.md  # Expected: column header
grep "mermaid syntax OR mermaid syntax valid" create-prd/scripts/validate-prd.js  # Expected: validation logic
grep "Re-score" create-prd/references/intent-update.md  # Expected: 1+ matches
grep "Prototype Gate OR 原型设计前置约束" create-prd/SKILL.md  # Expected: 1+ matches
grep "write Chapters OR 分批次.*write" create-prd/SKILL.md  # Expected: 1+ matches
grep "Mandatory Feedback Confirmation" create-prd/references/review-rules.md  # Expected: 1+ matches
```
