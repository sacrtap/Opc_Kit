# create-prd 技能优化

## TL;DR

> **Quick Summary**: 优化 create-prd SKILL.md 的语种一致性和 PRD 标题双语映射
>
> **Deliverables**:
> - SKILL.md 第64-68行后新增语言一致性规则
> - SKILL.md 第299-306行替换为双语标题映射表
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — sequential (same file)

---

## Context

### Original Request
用户要求优化 create-prd 技能：
1. 所有思考过程和互动使用与推测出的用户对话语种保持一致
2. 生成的PRD文档，所有大纲标题根据对话语种使用相应的语言书写
3. 为技能定义版本号（已有 v2.0.0，无需修改）
4. 在metadata中增加来源（已决定不添加）

最终确认执行优化项1和2。

### Current SKILL.md State
- 文件路径: `/Users/sacrtap/Documents/product_workspace/Opc_Kit/create-prd/SKILL.md`
- 总行数: 420行
- 修改项 1: 第64行后新增语言一致性规则
- 修改项 2: 第299-306行替换为双语标题映射表

---

## Work Objectives

### Core Objective
向 SKILL.md 添加两项规则：语言一致性约束、PRD标题双语映射表

### Concrete Deliverables
- `create-prd/SKILL.md` 两处编辑

### Must Have
- 语言一致性规则使用 `Language consistency rules (MANDATORY):` 标题
- 双语映射表包含13章完整标题
- 使用规则明确禁止同文档混用语言

### Must NOT Have
- 不修改 description 中的中文触发词（保留技能发现效果）
- 不添加 metadata.repository 字段
- 不删除现有 metadata 中的任何字段

---

## TODOs

- [ ] 1. 新增语言一致性规则

  **What to do**:
  - 读取 SKILL.md 第58-70行区域确认上下文
  - 在第64行（`4. **Output language priority:** ...`）之后、下一个空行前插入新增规则段落

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: 先于任务2执行
  - **Blocks**: 无

  **Acceptance Criteria**:
  - `grep "Language consistency rules" create-prd/SKILL.md` 返回1条匹配
  - 新增段落包含 ALL/N EVER/N EVER 关键词

- [ ] 2. 替换 PRD 标准模板为双语映射表

  **What to do**:
  - 定位第299-306行 `## PRD Standard Template` 下的模板描述
  - 替换现有英文列表为包含13章的双语标题映射表（含使用规则）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: 任务1
  - **Blocks**: 无

  **References**:
  - `create-prd/SKILL.md:299-306` - 当前PRD Standard Template部分

  **Acceptance Criteria**:
  - 映射表包含13行（1-13章），中英文各一列
  - 包含 "English conversation → use English column titles" 规则
  - 包含 "Chinese conversation → use Chinese column titles" 规则
  - 包含 "**Do NOT mix languages** in the same PRD" 规则
  - 表格 Markdown 语法正确（列对齐）

---

## Commit Strategy

- **1**: `fix(create-prd): add language consistency rules and bilingual chapter mapping`
  - `create-prd/SKILL.md`
  - Pre-commit: `git diff --stat`

## Success Criteria

### Verification Commands
```bash
grep "Language consistency rules" create-prd/SKILL.md  # Expected: 1 match
grep "Chinese conversation" create-prd/SKILL.md  # Expected: 1 match
grep "English conversation" create-prd/SKILL.md  # Expected: 1 match
```
