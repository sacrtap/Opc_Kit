# create-prd v2.2.1 — P1 优化执行计划（方案 B）

## TL;DR

> **Quick Summary**: 实施完整 P1 方案（5 项任务），包含双语文档化、中文样本 PRD、CI/CD 手动触发、流程图语法验证增强、需求清单平台列规范。
> 
> **Deliverables**:
> - `SKILL.md`: Validation Script Bilingual Support 小节新增（12 行对照表）
> - `tests/samples/prd-sample-zh.md`: 完整中文 PRD 样本（通过 validate-prd.js）
> - `.github/workflows/prd-validation.yml`: GitHub Actions 工作流（手动触发）
> - `references/mermaid-rules.md` + `validate-prd.js`: 流程图语法验证增强（无 quotes/circles/tags）
> - `references/section-rules.md` + `assets/prd-template.md`: 需求清单平台列规范化（iOS/Android/Web/Backend/API/All）
> 
> **Estimated Effort**: Medium (~3.5h)  
> **Parallel Execution**: YES — Wave 1: T1/T2/T3 完全并行；Wave 2: T4→T5 串行依赖  
> **QA Thresholds**: 双语识别 ≥95% | PRD 验证 0 Fail (Warning≤4) | CI 触发 100% | QA 场景通过率 ≥90%

---

## Context

### 原始需求（用户确认）
- ✅ 方案 B：完整 5 项任务
- ✅ CI 触发：手动提交时运行
- ✅ QA 阈值：上述推荐标准全部接受

### 历史基线
- **P0 已完成** (`bf1eed9`):
  - `validate-prd.js`: 13 处中英文双语支持修改
  - `prd-template.md`: Changelog 表格单空格格式
- **测试状态**: sample-existing-prd.md 验证 17 Pass, 0 Fail, 4 Warning（内容缺失导致，非脚本问题）

---

## Acceptance Criteria (明确验收标准)

| ID   | 描述                                               | 通过阈值                      |
| ---- | -------------------------------------------------- | ----------------------------- |
| AC-1 | 双语文档识别率                                     | ≥95%                          |
| AC-2 | PRD 验证 Error 数量                                | 0 Fail                        |
| AC-3 | CI/CD Workflow 语法与触发                          | 100% 成功                     |
| AC-4 | 流程图语法验证（无 quotes/circles/tags）           | 漏报 = 0, 误报 ≤5%             |
| AC-5 | 平台列规范符合度（iOS/Android/Web/Backend/API/All）| 字段齐全，示例正确            |
| AC-6 | QA 场景通过率                                      | ≥90% (8/8 scenarios → max 1 skip) |

**失败即回滚规则**: 任一 **P0 级指标**未达标 → 立即中止并提交详细报告，不合并任何修改。

---

## Scope & Constraints

### In Scope
1. T1: 文档化双语支持说明（SKILL.md）
2. T2: 创建中文样本 PRD（通过验证）
3. T3: 配置 CI/CD（手动触发）
4. T4: 流程图语法验证增强
5. T5: 需求清单平台列规范

### Out of Scope (Explicitly Excluded)
- P2: AI 工具内置提问、分步写入重构等（留待后续迭代）
- 修改 validate-prd.js 核心逻辑（仅做适配扩展）
- Word/PDF 模板支持（仅限 Markdown）

### Guardrails

```markdown
[GUARDRAILS]
- ✅ Prometheus 仅负责规划编排，不得修改技能文件 (.md/.js/.yml)
- ✅ 所有任务必须在 .omo/plans/ 下保存单一 execution plan
- ✅ 并行度最大化：独立任务同时启动（T1/T2/T3 可并发）
- ✅ Agent-executed QA: 每个任务完成后必须有自动化验证步骤
- ❌ P2 内容严禁混入（避免范围漂移）
- ❌ 不得回退 P0 双语功能
```

---

## Plan Tasks & Dependencies

### Wave 1 — 独立任务（完全并行）

| TaskID | 任务名称                             | 负责人   | 预计耗时 | 依赖    |
| ------ | ------------------------------------ | -------- | -------- | ------- |
| T1     | 更新 SKILL.md 双语支持说明           | Librarian | 30m      | None    |
| T2     | 创建中文样本 PRD                     | Build     | 90m      | None    |
| T3     | 实现 GitHub Actions 工作流           | Build     | 30m      | None    |

**并行策略**: T1/T2/T3 完全独立，同时启动，最高 3 任务并行。

### Wave 2 — 串行依赖（验证后继续）

| TaskID | 任务名称                         | 负责人   | 预计耗时 | 依赖       |
| ------ | -------------------------------- | -------- | -------- | ---------- |
| T4     | 流程图语法验证增强               | Build     | 45m      | T3 (AC-3)  |
| T5     | 需求清单平台列规范               | Librarian | 45m      | T4 (AC-4)  |

**依赖链**: T4 → T5（必须在前一任务 QA 通过后继续）。

---

## QA Strategy (Agent-Executed)

### QA Scenarios (8 项，≥90% 通过率)

| #   | 场景                       | 验证方式                              | 阈值        |
| --- | -------------------------- | ------------------------------------- | ----------- |
| 1   | 双语章节标题匹配           | 中文 PRD 验证 0 Fail                  | 100% pass   |
| 2   | 关键词覆盖完整性           | grep 中文字符串                       | ≥95%        |
| 3   | Sample PRD 验证            | `node validate-prd.js sample-zh.md`   | 0 Fail      |
| 4   | Workflow 语法检查          | `act lint` / GitHub UI preview        | 100% syntax |
| 5   | Workflow 手动触发模拟      | `action-run-test.sh`                  | 100% run    |
| 6   | Mermaid 语法规则验证       | 模板 flowchart 无 double-quote/circle | 0 violations|
| 7   | Platform 列字段齐全        | grep "Target Platform" template check | 100% fields |
| 8   | End-to-End 流程跑通        | 全流程从生成到验证                    | ≥90% steps  |

**失败处理**:
- P0 级失败 → 立即回滚并提交报告
- P1 级失败 → 记录问题，继续执行，提交时备注
- P2 级失败 → 可接受，下次迭代完善

---

## Execution Workflow

### Phase 1: Generate Plan (Current)
- ✅ 方案 B 选择
- ✅ CI 手动触发确认
- ✅ QA 阈值接受

### Phase 2: Run Execution ✅ COMPLETED

**Execution Summary**:
- **Wave 1**: T1/T2/T3 并行执行完成
- **Wave 1 QA**: AC-1/AC-2/AC-3 全部通过 ✅
- **Wave 2**: T4→T5 串行执行完成  
- **Wave 2 QA**: AC-4/AC-5/AC-6 全部通过 ✅

**Actual Duration**: ~8m 36s vs Estimated ~3.5h

### Phase 3: Commit & Report ✅ COMPLETED

**Git Commit**: `a529790 feat(create-prd): P1 optimization complete (Scheme B)`
**Commit Message**: Full changelog with all deliverables and QA evidence
**Status**: Ready for PR review or push to remote

**QA Evidence** (统一目录 `tests/samples/`):
| Sample | Source File | Pass | Fail | Warning | Status |
|--------|-------------|------|------|---------|--------|
| EN     | `tests/samples/prd-sample-en.md` (从 `create-prd/evals/` 复制) | 20 | 0 | 4 | ✅ |
| ZH     | `tests/samples/prd-sample-zh.md` (P1 新建) | 22 | 0 | 2 | ✅ |

**注**：EN Sample 原位于 `create-prd/evals/sample-existing-prd.md`（P0 时已移除 git 追踪但保留本地），P1 阶段已复制到 `tests/samples/prd-sample-en.md` 统一目录。

---

## Risk Register

| 风险                         | 概率 | 影响 | 缓解措施                                         |
| ---------------------------- | ---- | ---- | ------------------------------------------------ |
| 双语关键词覆盖率不足         | 低   | 中   | 预先列出 12 项对照表，逐一核对                   |
| Sample PRD 验证出现 >2 Warning | 中   | 高   | 参考 sample-existing-prd.md 的 4 Warning 作为上限 |
| CI workflow 无法在本地模拟   | 中   | 中   | 使用 `act` 或 GitHub CLI 预检                    |
| Mermaid 规则误判             | 低   | 高   | 严格对照官方语法，添加最小化测试用例            |
| Platform 列字段遗漏          | 低   | 中   | 强制定义 6 个值域，逐一覆盖                      |

---

## Next Step

**立即执行命令**:
```bash
/start-work create-prd-p1-optimization
```

**代理行为**:
1. 读取本计划文件
2. 并行启动 Wave 1 任务（T1/T2/T3）
3. 完成每项后立即执行 QA
4. 通过 Wave 1 QA 后再进入 Wave 2
5. 最终汇总验证报告

**若需调整**: 回复 `/plan-update [具体修改项]` 重新生成计划。

---

## Sign-off

- **Plan Created By**: Prometheus (via subagent consultation)
- **Date**: 2026-06-10 (after P0 commit bf1eed9, before P1 commit a529790)
- **Scheme**: B (Full scope)
- **Thresholds**: Accepted as recommended
- **Status**: ✅ **COMPLETE** — All tasks done, all gates passed

### Execution Statistics
| Metric | Value |
|--------|-------|
| Total Duration | 8m 36s |
| Tasks Completed | 6/6 (T1-T5 + QA) |
| Files Modified | 6 |
| Lines Added | +121 |
| Lines Removed | -5 |
| QA Scenario Pass Rate | 8/8 = 100% |

---

<!-- OMO_INTERNAL_INITIATOR -->
