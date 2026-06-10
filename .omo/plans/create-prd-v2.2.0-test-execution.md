# create-prd v2.2.0 测试与对比分析执行计划

## TL;DR

> **核心目标**: 验证create-prd v2.2.0相比v2.1.0的改进效果，通过三向对比（with_skill v2.2.0 vs baseline v2.1.0 vs without_skill）量化新特性价值
> 
> **交付物**: 
> - 8个测试用例完整执行记录（5核心+3新特性）
> - 定量+定性综合对比分析报告
> - v2.2.0新特性验证状态清单
> 
> **预估工作量**: Medium（约2-3小时并行执行）
> **并行执行**: YES - 3 waves，最高8任务并行
> **关键路径**: 用例设计 → 并行执行 → 数据收集 → 报告生成

---

## Context

### 原始需求
用户已完成create-prd技能v2.2.0版本优化，希望进行测试和对比分析验证改进效果。

### 历史基准（iteration-1 v2.1.0）
| 测试用例 | With Skill v2.1.0 | Without Skill |
|----------|-------------------|---------------|
| coaching-default | 519L, 28.5KB, **95/100** | 151L, 4.4KB |
| coaching-command | 480L, 28.2KB, **99/100** | 79L, 1.8KB |
| fast-command | 558L, 33.9KB, **97/100** | 355L, 15.4KB |
| update-with-review | 666L, 35.8KB, **94/100** | 473L, 26.0KB |
| validate-existing | 268L, 10.9KB, 15/19 pass | 122L, 9.4KB |

**核心发现**:
- PRD体积增大111%，耗时增加162%
- 质量评分均值96.25/100（4个create类测试）
- coaching模式无用户响应时阻塞（已修复）
- validate-prd.js存在6个严重问题未捕获

### v2.2.0 新增特性
1. **进度通知**: 分步写入时实时进度通知
2. **跨引擎Mermaid兼容**: Zed/VS Code/GitHub渲染兼容
3. **语言一致性**: 中英文检测和PRD生成语言匹配
4. **平台推理**: 从用户输入自动推断目标平台
5. **更新重评分**: update模式后重新质量评分
6. **断点恢复**: session中断后从checkpoint恢复

---

## Work Objectives

### 核心目标
验证v2.2.0相比v2.1.0的功能改进和性能变化，通过三向对比量化新特性价值。

### 具体交付物
- 8个测试用例完整执行记录（三向对比）
- 定量指标数据表（通过率、耗时、Token消耗、PRD体积、质量评分）
- 定性分析报告（新特性验证状态、输出质量对比）
- v2.2.0 vs v2.1.0 delta差异清单

### 完成标准
- [x] 8个测试用例全部执行完成（24个PRD输出）
- [x] 每个PRD通过validate-prd.js验证
- [x] 综合对比分析报告生成
- [x] 新特性验证状态100%覆盖

### Must Have
- 三向对比数据完整（with_skill v2.2.0, baseline v2.1.0, without_skill）
- 定量指标可量化对比（体积、耗时、评分、Token）
- 新特性验证状态明确（通过/失败/部分）
- 每个测试用例包含evidence文件

### Must NOT Have
- 不修改v2.2.0 SKILL.md代码（仅测试）
- 不删除iteration-1历史基准数据
- 不覆盖v2.1.0 baseline快照
- 不使用人工干预验证结果

---

## Verification Strategy

### 测试决策
- **基础设施存在**: YES（evals.json + validate-prd.js + 测试工作空间）
- **自动化测试**: YES（tests-after模式）
- **验证框架**: evals.json断言 + validate-prd.js脚本 + 手动质量评分

### QA策略
每个测试用例执行后：
1. 运行`node validate-prd.js`验证输出结构
2. 检查evals.json定义的assertions是否通过
3. 记录timing.json耗时数据
4. 人工审查PRD质量（针对新特性）

---

## Execution Strategy

### 并行执行Waves

```
Wave 1（立即开始 - 测试用例设计 + 工作空间准备）:
├── 任务 1: 扩展evals.json新增3个新特性用例 [quick]
├── 任务 2: 创建iteration-3测试工作空间目录结构 [quick]
└── 任务 3: 验证v2.1.0 baseline快照可用 [quick]

Wave 2（Wave 1完成后 - 核心用例并行执行）:
├── 任务 4: eval-create-coaching-default（三向对比） [deep]
├── 任务 5: eval-create-fast-command（三向对比） [deep]
├── 任务 6: eval-update-with-review（三向对比） [deep]
└── 任务 7: eval-validate-existing（三向对比） [deep]

Wave 3（Wave 2完成后 - 新特性用例并行执行）:
├── 任务 8: eval-progress-notification（进度通知验证） [unspecified-high]
├── 任务 9: eval-platform-inference（平台推理验证） [unspecified-high]
└── 任务 10: eval-breakpoint-recovery（断点恢复验证） [unspecified-high]

Wave FINAL（所有任务完成后 - 数据收集 + 报告生成）:
├── 任务 F1: 定量数据收集和分析 [quick]
├── 任务 F2: 定性对比分析报告生成 [deep]
└── 任务 F3: 新特性验证状态清单 [quick]
```

### 依赖矩阵
- **任务1-3**: 无依赖，可立即开始
- **任务4-7**: 依赖任务1-2（evals.json和工作空间）
- **任务8-10**: 依赖任务1-2（evals.json和工作空间）
- **任务F1-F3**: 依赖任务4-10（所有测试执行完成）

### Agent调度摘要
- **Wave 1**: 3任务并行 - T1-T3 → `quick`
- **Wave 2**: 4任务并行 - T4-T7 → `deep`
- **Wave 3**: 3任务并行 - T8-T10 → `unspecified-high`
- **FINAL**: 3任务并行 - F1-F3 → F1 `quick`, F2 `deep`, F3 `quick`

---

## TODOs

- [x] 1. 扩展evals.json新增新特性测试用例

  **What to do**:
  - 读取当前evals.json（5个用例）
  - 新增3个测试用例：
    1. `progress-notification`: 验证分步写入时进度通知输出
    2. `platform-inference`: 验证从用户输入推断目标平台
    3. `breakpoint-recovery`: 验证session中断后checkpoint恢复
  - 每个用例包含5-7个assertions
  - 保存到create-prd/evals/evals.json

  **Must NOT do**:
  - 不修改现有5个用例的assertions
  - 不删除任何已有测试数据

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与任务2-3）
  - **Blocks**: 任务4-10
  - **Blocked By**: 无

  **References**:
  - `create-prd/evals/evals.json:1-244` - 现有用例结构参考

  **Acceptance Criteria**:
  - [ ] evals.json包含8个测试用例（id 1-8）
  - [ ] 新增用例包含明确的assertions
  - [ ] JSON格式验证通过

- [x] 2. 创建iteration-3测试工作空间

  **What to do**:
  - 创建目录结构：
    ```
    create-prd-workspace/iteration-3/
    ├── eval-create-coaching-default/
    │   ├── with_skill/outputs/
    │   ├── old_skill/outputs/
    │   └── without_skill/outputs/
    ├── eval-create-fast-command/
    ├── eval-create-coaching-command/
    ├── eval-update-with-review/
    ├── eval-validate-existing/
    ├── eval-progress-notification/
    ├── eval-platform-inference/
    └── eval-breakpoint-recovery/
    ```
  - 每个子目录创建 to copy

  **Must NOT do**:
  - 不修改iteration-1目录
  - 不修改skill-snapshot-v2.1.0

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与任务1,3）
  - **Blocks**: 任务4-10
  - **Blocked By**: 无

  **References**:
  - `create-prd-workspace/iteration-1/` - 历史工作空间结构参考

  **Acceptance Criteria**:
  - [ ] 8个测试用例目录全部创建
  - [ ] 每个目录包含with_skill/old_skill/without_skill子目录
  - [ ] outputs子目录存在

- [x] 3. 验证v2.1.0 baseline快照可用

  **What to do**:
  - 检查`create-prd-workspace/skill-snapshot-v2.1.0/`目录是否存在
  - 验证SKILL.md文件可读
  - 如不存在，从git历史或iteration-1恢复

  **Must NOT do**:
  - 不修改baseline快照内容

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与任务1-2）
  - **Blocks**: 任务4-10
  - **Blocked By**: 无

  **References**:
  - `create-prd-workspace/skill-snapshot-v2.1.0/SKILL.md` - baseline快照路径

  **Acceptance Criteria**:
  - [ ] baseline SKILL.md文件存在且可读
  - [ ] 文件大小>10KB（确保完整）

- [x] 4. 执行核心用例1: coaching-default（三向对比）

  **What to do**:
  - **with_skill**: 使用当前v2.2.0执行eval-create-coaching-default
  - **baseline**: 使用v2.1.0快照执行相同prompt
  - **without_skill**: 无技能直接生成
  - 每个模式PRD保存到outputs/docs/specs/coaching-default-PRD-{mode}.md
  - 记录timing.json（开始时间、结束时间、耗时）
  - 运行validate-prd.js验证每个输出

  **Must NOT do**:
  - 不人工干预PRD生成过程
  - 不修改prompt内容

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与任务5-7）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/evals/evals.json:5-48` - coaching-default用例定义
  - `create-prd/scripts/validate-prd.js` - 验证脚本

  **Acceptance Criteria**:
  - [ ] 3个PRD文件生成（with_skill, baseline, without_skill）
  - [ ] 每个PRD通过validate-prd.js验证
  - [ ] timing.json记录完成
  - [ ] evidence目录包含验证输出

- [x] 5. 执行核心用例2: fast-command（三向对比）

  **What to do**:
  - 同任务4，执行eval-create-fast-command三向对比
  - PRD保存: fast-command-PRD-{mode}.md

  **Must NOT do**:
  - 不人工干预生成过程

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与任务4,6-7）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/evals/evals.json:50-105` - fast-command用例定义

  **Acceptance Criteria**:
  - [ ] 3个PRD文件生成
  - [ ] 每个PRD通过validate-prd.js验证
  - [ ] timing.json记录完成

- [x] 6. 执行核心用例3: update-with-review（三向对比）

  **What to do**:
  - 同任务4，执行eval-update-with-review三向对比
  - 输入文件: sample-existing-prd.md
  - PRD保存: update-with-review-PRD-{mode}.md

  **Must NOT do**:
  - 不修改sample-existing-prd.md

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与任务4-5,7）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/evals/evals.json:136-190` - update-with-review用例定义
  - `create-prd/evals/sample-existing-prd.md` - 输入PRD

  **Acceptance Criteria**:
  - [ ] 3个PRD文件生成
  - [ ] 每个PRD通过validate-prd.js验证
  - [ ] timing.json记录完成

- [x] 7. 执行核心用例4: validate-existing（三向对比）

  **What to do**:
  - 同任务4，执行eval-validate-existing三向对比
  - 输入文件: sample-existing-prd.md
  - PRD保存: validate-existing-PRD-{mode}.md

  **Must NOT do**:
  - 不修改sample-existing-prd.md

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与任务4-6）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/evals/evals.json:192-242` - validate-existing用例定义

  **Acceptance Criteria**:
  - [ ] 3个PRD文件生成
  - [ ] 每个PRD通过validate-prd.js验证
  - [ ] timing.json记录完成

- [x] 8. 执行新特性用例1: progress-notification验证

  **What to do**:
  - 创建测试prompt要求生成长PRD（触发分步写入）
  - 执行with_skill模式，捕获进度通知输出
  - 验证：
    1. 进度通知包含具体章节完成状态
    2. 通知格式一致（"✅ Chapters X-Y completed. Moving to Z..."）
    3. checkpoint tracking记录存在
  - PRD保存: progress-notification-PRD-with_skill.md
  - 记录进度通知日志

  **Must NOT do**:
  - 不人工模拟多轮对话（使用command模式跳过交互）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3（与任务9-10）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/SKILL.md` - 查找进度通知相关实现

  **Acceptance Criteria**:
  - [ ] PRD生成完成
  - [ ] 进度通知日志包含至少3条进度更新
  - [ ] checkpoint tracking记录存在
  - [ ] timing.json记录完成

- [x] 9. 执行新特性用例2: platform-inference验证

  **What to do**:
  - 创建3个测试prompt分别暗示不同平台：
    1. iOS: "Create a PRD for an iPhone app..."
    2. Android: "Create a PRD for an Android app..."
    3. Web: "Create a PRD for a web dashboard..."
  - 执行with_skill模式
  - 验证每个PRD：
    1. 元数据包含platform字段
    2. 推理置信度明确（HIGH/MEDIUM/LOW）
    3. 平台特定功能建议合理
  - PRD保存: platform-inference-{platform}-PRD-with_skill.md

  **Must NOT do**:
  - 不显式指定平台（测试推理能力）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3（与任务8,10）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/SKILL.md` - 查找平台推理相关实现

  **Acceptance Criteria**:
  - [ ] 3个PRD文件生成（iOS/Android/Web）
  - [ ] 每个PRD包含platform和confidence字段
  - [ ] 推理结果与prompt暗示平台一致
  - [ ] timing.json记录完成

- [x] 10. 执行新特性用例3: breakpoint-recovery验证

  **What to do**:
  - 创建测试prompt生成长PRD（触发checkpoint）
  - 模拟中途中断（生成Ch1-3后停止）
  - 验证checkpoint记录存在
  - 从checkpoint恢复，继续生成Ch4-13
  - 验证：
    1. 恢复后PRD结构完整
    2. 无重复章节
    3. 质量评分正常
  - PRD保存: breakpoint-recovery-PRD-with_skill.md

  **Must NOT do**:
  - 不修改checkpoint机制代码

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3（与任务8-9）
  - **Blocks**: 任务F1-F3
  - **Blocked By**: 任务1-2

  **References**:
  - `create-prd/SKILL.md` - 查找断点恢复相关实现

  **Acceptance Criteria**:
  - [ ] PRD生成完成（从checkpoint恢复）
  - [ ] PRD结构完整（13章节）
  - [ ] 无重复章节
  - [ ] timing.json记录完成

---

## Final Verification Wave

- [x] F1. **定量数据收集和分析**

  收集所有测试用例数据，生成定量对比表：
  - 通过率（evals.json assertions）
  - 耗时（timing.json）
  - PRD体积（行数、KB）
  - 质量评分（validate-prd.js）
  - Token消耗（如可获取）
  
  输出: `create-prd-workspace/iteration-3/quantitative-metrics.json`

- [x] F2. **定性对比分析报告生成**

  生成综合对比分析报告，包含：
  - v2.2.0 vs v2.1.0 delta差异清单
  - 新特性验证状态（通过/失败/部分）
  - 输出质量对比（结构完整性、流程图质量、假设标签）
  - coaching模式改进验证
  - validate-prd.js改进验证
  
  输出: `create-prd-workspace/iteration-3/benchmark-report.md`

- [x] F3. **新特性验证状态清单**

  生成6个v2.2.0新特性验证状态：
  1. 进度通知: [通过/失败/部分] + 证据
  2. 跨引擎Mermaid兼容: [通过/失败/部分] + 证据
  3. 语言一致性: [通过/失败/部分] + 证据
  4. 平台推理: [通过/失败/部分] + 证据
  5. 更新重评分: [通过/失败/部分] + 证据
  6. 断点恢复: [通过/失败/部分] + 证据
  
  输出: `create-prd-workspace/iteration-3/features-validation.md`
