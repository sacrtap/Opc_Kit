# Browser with TypeSafe — 使用指南

> **基于 TypeSafe Jev 的快速、低成本浏览器自动化** — 浏览器工作流的宿主无关机械动作委托

📚 [返回 Opc_Kit](README-CN.md) | 🎭 [Party Mode 指南](party-mode-guide-CN.md)

---

## 概述

**browser-with-typesafe** 是一个宿主无关的浏览器技能，它将重复性 UI 工作流分配给两个执行者：宿主模型和 TypeSafe Jev。

| 执行者 | 职责 |
|--------|------|
| **宿主模型** | 任务规划、视觉识别、语义判断、敏感操作、最终验证 |
| **Jev (TypeSafe)** | 机械动作选择：导航、点击、切换、滚动、翻页 —— 在紧凑的决策循环中选择 |

没有这个分工时，每一次机械点击都要消耗一次完整的宿主模型回合；有了它，宿主模型只在真正需要判断的地方才被调用。该技能适用于 omp、Codex、Cursor、Claude Code、Workbuddy、Zcode 或任何提供 Computer Use 标签页、Playwright 页面或 CDP 的宿主。

---

## 工作原理

### 职责分工

宿主模型负责高价值工作：
- 任务规划和目标制定
- 按键输入和表单填写
- 视觉识别和语义理解
- 关键操作判断（发布、删除、购买）
- 针对最新状态的最终验证

Jev 负责机械循环：
- 可访问性树分析
- 单一下一步动作选择（点击、滚动、按键、重载）
- 带置信度的决策
- 基于历史的进度推进

### 决策循环

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              宿主模型                                    │
│  规划任务 → 判断视觉 → 输入文本 → 验证结果                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        bridge/core.mjs                                   │
│  会话边界 ──► 决策请求 ──► 动作执行                                      │
│  (来源、策略、  │ 发往 Jev 端点  │ 通过适配器执行                        │
│   最大步数等)  │                │                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TypeSafe / OpenRouter (Jev)                         │
│  分析 IR 状态 → 返回下一步机械动作                                       │
│  (点击、滚动、按键 或 DONE)                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 适配器架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          宿主运行时                                      │
│  omp browser prelude │ Codex cua_repl │ Playwright / CDP 页面           │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      bridge/adapters/                                    │
│  omp.mjs ───┐                                                          │
│  codex.mjs ─┼──► bridge/ir.mjs（统一的中间表示层）                      │
│  playwright.mjs                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        bridge/core.mjs                                   │
│  决策引擎：零依赖，宿主无关                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

每个适配器将其宿主的可访问性树转换为共享的 IR（中间表示层）。决策引擎 (`bridge/core.mjs`) 从不导入浏览器 API —— 它只调用五方法适配器契约。

---

## 核心特性

| 特性 | 说明 |
|------|------|
| **3 个内置适配器** | omp（browser prelude）、codex（Computer Use 标签页）、playwright（Playwright/CDP 页面） |
| **统一 IR** | 跨所有宿主的单一可访问性表示；角色规范化、唯一引用、来源提取 |
| **运行时检测** | `detectAdapter({ tab })` / `detectAdapter({ page })` 从真实能力中挑选正确适配器 |
| **安全边界** | 来源白名单、陈旧状态检测、`denyNames`/`requireHostNames` 用于敏感控件 |
| **核心零依赖** | `bridge/core.mjs` 和 `bridge/ir.mjs` 无第三方依赖 |

### 适配器契约（5 个方法）

每个适配器实现：

```js
{
  name: 'omp' | 'codex' | 'playwright',
  async getState() -> IR,           // 最新可访问性快照
  async click(ref),                  // 通过引用点击节点
  async scroll({ direction, amount, target }),
  async pressKey(key),               // 仅安全按键
  async reload(),                    // 重载并等待就绪状态
}
```

### 安全模型要点

- `allowedOrigins` 在每次模型调用和每次动作前重新检查
- 陈旧决策（基于过时状态做出的）会被丢弃，不会执行
- 文本输入已支持（`policy.fill` + 小模型 helper），但搜索/筛选/表单实测显示：短流程上仍不优于直接驱动
- 模糊控件会导致回交而非自动猜测
- `needs_verification` 从不视为通过 —— 宿主必须独立验证

---

## 要求与配置

### 前置要求

| 要求 | 详情 |
|------|------|
| **Node.js** | 版本 22+（或任何支持 ES 模块、`fetch` 和文件系统访问的运行时） |
| **浏览器宿主** | 现有的浏览器句柄：Computer Use 标签页（omp、Codex）或 Playwright 页面（CDP 宿主）。该技能不提供这些。 |
| **API Key** | TypeSafe 或 OpenRouter 密钥 —— 见下方提供商选择 |

### 步骤 1：安装技能

两种安装渠道：

**选项 A：npx skills**
```sh
npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe
```

**选项 B：omp marketplace**
```sh
omp plugin marketplace add sacrtap/Opc_Kit
omp plugin install browser-with-typesafe@opc-kit
```

### 步骤 2：选择提供商

支持两种提供商。选择其一：

| 提供商 | 说明 | 默认模型 | 获取密钥 |
|--------|------|----------|----------|
| `typesafe` | TypeSafe 官方端点 | `jev-latest` | https://console.typesafe.ai/keys |
| `openrouter` | OpenRouter Decisions 端点 | `~typesafe/jev-latest` | https://openrouter.ai/settings/keys |

除非你已经通过 OpenRouter 路由模型流量，否则选择 `typesafe`。

### 步骤 3：配置

**重要：安装工具从不接收、提示或存储 API 密钥。**

运行安装程序写入模板配置：

```sh
node install.mjs --provider typesafe --model jev-latest
```

这将创建 `~/.config/browser-with-typesafe/config.json`，其中 `apiKey` 字段为**空**。你必须自己填入：

```json
{
  "provider": "typesafe",
  "model": "jev-latest",
  "apiKey": "YOUR_KEY_HERE"
}
```

**文件权限（强制执行）：**
```sh
chmod 700 ~/.config/browser-with-typesafe
chmod 600 ~/.config/browser-with-typesafe/config.json
```

### 步骤 4：使用 Doctor 验证

```sh
node scripts/doctor.mjs
```

就绪时的预期输出：

```
  ok    config file           /Users/you/.config/browser-with-typesafe/config.json
  ok    file permissions      0600 (not readable by group or other)
  ok    directory permissions 0700 (not accessible by group or other)
  ok    json                  parsed
  ok    provider / model      typesafe / jev-latest
  ok    apiKey                set (96 characters, not shown)
  ok    endpoint              https://api.typesafe.ai/v1/systemone -> HTTP 200 (model jev-1.13.0)

result  READY
```

Doctor 只有在全部通过时才返回 `0`。它从不打印凭据 —— 只显示其存在和长度。

### 密钥安全保证

- `loadConfig()` 返回 `{ provider, model, configPath, hasApiKey }` —— **从不返回密钥本身**
- 只有 `decide()` 读取密钥；它会拒绝发送请求体中包含密钥的请求
- `install.mjs` 直接拒绝 `--key`、`--api-key` 和 `--token` 参数
- 凭据永远不会被记录或传输到决策端点之外

---

## 快速开始

### 安装

```sh
# 通过 npx skills
npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe

# 或通过 omp marketplace
omp plugin marketplace add sacrtap/Opc_Kit
omp plugin install browser-with-typesafe@opc-kit
```

### 最小可运行示例

```js
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

// 步骤 0：配置
const config = await loadConfig();
// { provider, model, configPath, hasApiKey } —— 从不包含密钥

// 步骤 1：从宿主运行时检测适配器
const { adapter } = detectAdapter({ tab: myTab });  // 或 { page } 用于 Playwright

// 步骤 2：创建有界会话
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://example.com'],
  maxSteps: 12,
  maxMs: 45000,
  minConfidence: 0.55,
});

// 步骤 3：运行循环
const outcome = await session.run({
  goal: 'Expand the report, scroll down through it, then collapse it.',
  controls: [
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: { scrollDirections: ['down'], scrollAmount: 2, scrollTargetName: 'Evaluation report' },
});

// 步骤 4：独立验证
console.log('Status:', outcome.status);  // needs_verification, blocked 等
const fresh = await adapter.getState();    // 宿主验证最新状态
```

### 预期输出

成功运行会产生：

```
[session] Starting: Expand the report, scroll down through it, then collapse it.
[step 1] decision: click "Expand section" (confidence: 0.97)
[step 2] decision: scroll down 2 pages within "Evaluation report" (confidence: 0.94)
[step 3] decision: click "Collapse section" (confidence: 0.96)
[step 4] decision: DONE (confidence: 0.98)
[session] Completed with status: needs_verification
```

---

## 工作流

### 步骤 0 —— 确认配置就绪

在接触浏览器之前运行：

```js
import { loadConfig } from 'skill://browser-with-typesafe/bridge/index.mjs';

const config = await loadConfig();  // 未配置时抛出异常
```

| 结果 | 操作 |
|------|------|
| 抛出 "No configuration" | 运行 `node install.mjs` |
| `hasApiKey: false` | 用户必须在配置文件中设置 `apiKey` |
| `hasApiKey: true` | 运行 `node scripts/doctor.mjs` 验证 |

### 步骤 1 —— 查找浏览器句柄

| 宿主运行时 | 句柄 | 说明 |
|------------|------|------|
| omp | `browser.open()` / `browser.tab()` 的标签页 | Eval 中的 `browser` prelude |
| Codex Computer Use | `cua_repl` 的标签页 | `cua.createBrowserTab()` |
| Playwright / CDP | Playwright `page` | `chromium.connectOverCDP()` |

```js
import { detectAdapter } from 'skill://browser-with-typesafe/bridge/index.mjs';

const { kind, adapter } = detectAdapter({ tab: myTab });  // 或 { page }
// 不匹配时大声失败
```

### 步骤 2 —— 准备有界任务

每次运行一个任务。保持小巧。

```js
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://example.com'],  // 每次动作前重新检查
  maxSteps: 12,
  maxMs: 45000,
  minConfidence: 0.55,
});
```

策略选项：

```js
policy: {
  click: true,                          // 可发现的低风险控件
  scrollDirections: ['down', 'up'],
  scrollAmount: 2,                     // 引擎限制为最多 5 页
  scrollTargetName: 'Evaluation report', // 在此容器内滚动
  denyNames: [/delete/i, /purchase/i], // 永不自动点击这些
  requireHostNames: [/publish/i],    // 总是回交给宿主
  keys: ['Escape'],
  reload: false,
}
```

### 步骤 3 —— 运行循环

```js
const outcome = await session.run({
  goal: 'Expand the report, scroll down, then collapse it.',
  controls: [                          // 明确允许的控件
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: { scrollDirections: ['down'], scrollAmount: 2 },
});
```

在需要该步骤之前使用宿主工具**输入文本**，然后再次调用 `session.run()` —— 历史会延续。

### 步骤 4 —— 处理结果并验证

| 状态 | 含义 | 宿主操作 |
|------|------|----------|
| `needs_verification` | Jev 认为目标已达成 | 针对最新状态独立验证 |
| `low_confidence` | 故意回交 | 检查状态；重新确定范围或手动处理 |
| `blocked` | 无允许的动作可推进 | 执行不支持的操作，然后恢复 |
| `no_progress` / `loading_timeout` / `action_error` / `decision_error` | 步骤失败 | 检查状态和交接，然后恢复或停止 |
| `step_limit` / `budget` | 达到边界限制 | 仅当任务仍然有效时恢复 |

**验证是强制的：**

```js
const fresh = await adapter.getState();  // 独立读取
// 断言 fresh.nodes、fresh.url；视觉检查使用截图
```

---

## 安全模型

### 来源白名单

- `allowedOrigins` 在每次模型调用和每次动作前重新检查
- 导航超出白名单会停止运行

### 陈旧状态检测

- 在执行任何决策的动作前会获取新的快照
- 如果页面自决策后发生变化，决策会被丢弃
- 适配器必须在未知引用上大声失败（永不点击其他内容）

### 文本输入已委派

存在 `fill` 动作：Jev 只选**哪个字段**，值由小模型 helper（免费 `bifrost/deepseek-v4-flash`）生成。`fill` **永不**按 Enter、永不提交 —— 提交类后果性操作仍由宿主负责。

### 控件分类

- `denyNames`：永不自动点击的控件模式（删除、购买）
- `requireHostNames`：总是回交给宿主的控件模式（发布、发送）
- 重复标签永不被自动发现；文本字段仅在 `policy.fill` 下作为候选

### 快照清理

快照文本被转义，防止页面内容伪造快照结构（注入保护）。

### `needs_verification` 不算通过

宿主必须独立验证。永远不要仅根据动作历史报告成功。

---

## 成本：15 动作流程实测

本技能的前提是"一段机械流程不再为每次点击花掉一个宿主模型轮次"。我们在 15 个动作的流程上实测了它：
每臂 3 个样本，两臂使用同一宿主模型与同一目标，正确性取自**页面自报**而非任一 agent 的自述。

- **A 臂** —— 宿主 agent 自己驱动浏览器；其工作目录下**看不到**本技能
- **B 臂** —— 宿主 agent 使用本技能

| | A 臂（不用技能） | B 臂（用技能） |
| --- | ---: | ---: |
| 宿主轮次 | 14.3 | 29.0 |
| 未缓存输入 tokens | 47,206 | 65,029 |
| 缓存读取 tokens | 481,237 | 1,339,520 |
| 输出 tokens | 6,727 | 10,301 |
| **宿主计费成本** | **$0.025122** | **$0.039907** |
| 墙钟时间 | 96.7 秒 | 163.5 秒 |
| **每个机械动作耗时** | **6.45 秒** | **10.90 秒** |
| 任务正确完成 | 3/3 | 3/3 |

**在这个流程上，本技能贵 58.9%、每个动作慢 69%，而准确率相同。**

逐次数据如下，便于判断离散度而非只看均值：

| 运行 | 轮次 | 未缓存 | 缓存读取 | 输出 | 成本 | 墙钟 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 12 | 38,279 | 421,504 | 11,468 | $0.027774 | 107.2 秒 |
| A2 | 22 | 42,888 | 769,536 | 5,514 | $0.024100 | 100.5 秒 |
| A3 | 9 | 60,451 | 252,672 | 3,200 | $0.023491 | 82.4 秒 |
| B1 | 27 | 51,026 | 1,204,224 | 9,354 | $0.033758 | 137.7 秒 |
| B2 | 22 | 86,577 | 997,248 | 10,446 | $0.044492 | 173.5 秒 |
| B3 | 38 | 57,483 | 1,817,088 | 11,104 | $0.041472 | 179.3 秒 |

每臂 3 个样本、单一测试页，因此请把百分比视为量级提示，而非精确值。

### Jev 不是瓶颈

三次 B 臂运行中技能共做了 **55 次决策**。Jev 自身延迟为 **p50 373 毫秒**（跨运行 363–385 毫秒），
最坏 1,890 毫秒。模型是亚秒级返回的，开销全在它周围。

### 为什么这个前提在此不成立

A 臂完成 15 个动作只用了 **14.3 个宿主轮次** —— 约每个动作一轮，而不是"每次点击一轮"。能一次调用
批量执行几个机械动作的宿主，从来就没有付出本技能所要消除的"按点击计费"。而 B 臂还额外付出了：
阅读本文档、编写接线代码，以及**大 2.8 倍**的缓存读取上下文（1,339,520 对 481,237）。

### 请求载荷的修复确实解决了什么

本技能过去在每次请求中发送全部决策历史，载荷随已执行步数增长。现在已封顶并投影：

| 步数 | 发送的历史条数 | 输入 tokens |
| ---: | ---: | ---: |
| 1 | 1 | 1,730 |
| 10 | 10 | 1,919 |
| 40 | 10 | 1,929 |
| 80 | 10 | 1,929 |

修复前第 80 步同一决策发送 **10,314** 输入 token —— **5.3 倍**，且无界增长。那是真实缺陷且已修复，
但在这个规模的流程上不足以抵过集成成本。

### 未测量的部分

- **盈亏平衡的流程长度。** 本文没有任何数据表明存在技能取胜的长度；我们也没有找到。
- 下一步真正依赖实时观察状态的流程 —— 那是本技能的设计目标场景，而本测试页并未覆盖，因为 15 个
  动作都是预先已知的。
- 需要文本输入的流程现已支持，但短流程实测未达标（见下）。

如果你在"直接驱动浏览器"与"对一段可脚本化流程使用本技能"之间选择，实测结论是**直接驱动**。

## 文本输入：Jev 选字段，小模型生成值

Jev 是选择器，不能生成文本。`madewithjev.com` 上的每个构建都为它配一个小快模型，本技能同理：

- `policy.fill: true` 把所有文本字段（textbox / textarea / combobox / searchbox）作为候选；Jev 选**哪个字段**。
- 免费 helper 模型（`bifrost/deepseek-v4-flash`）根据目标与字段标签生成**值**；严格解析，空值/非字符串/超长值会让该动作失败并交回宿主，绝不猜测。
- `fill` **永不**按 Enter、永不提交；后果性提交仍由宿主负责。

搜索+筛选+表单流程实测（每臂 3 样本、双臂免费宿主模型、正确性取自页面自报）：A 臂 29,299 tokens / 每动作 52.68s / 3-of-3；B 臂 49,180 tokens / 每动作 89.52s / 2-of-3。技能 tokens 为 A 的 **1.68 倍**、每动作耗时为 **1.70 倍** —— ≤0.8 倍判据未达成。Jev 不是瓶颈（10 次决策，p50 **379ms**）。

## 验证矩阵

| 后端 | 验证方法 | 结果 |
|------|----------|------|
| **omp** (`browser` prelude) | **真实端到端** —— Jev 决策循环对抗 headless omp Chromium；宿主验证最新状态 | **通过** —— 5/5 检查，干净退出，3 个执行动作 / 4 次决策，约 1.9 秒实际，约 1.7 秒 Jev API |
| **Playwright 1.59** (headless Chrome) | **真实端到端** —— 相同任务夹具；失败时进程非零退出 | **通过** —— 5/5 检查，退出 0，3 个执行动作 / 4 次决策，约 2.3 秒实际，约 2.0 秒 Jev API |
| **Codex** (`cua_repl`) | **仅契约测试** —— mock 标签页句柄 + 完整决策循环回归 | **真实宿主未覆盖** —— 此环境无 Codex Computer Use 运行时 |
| **配置 + doctor** | **真实** —— `doctor.mjs` 对抗实时凭据，加上全新用户安装 | **通过** —— `READY`，退出 0，端点 HTTP 200；空密钥报告 `NOT READY (apiKey)`，错误密钥报告 `NOT READY (endpoint)` 及 HTTP 401 |

### 覆盖说明

| 项目 | 状态 | 说明 |
|------|------|------|
| 真实 Codex Computer Use 宿主 | **未覆盖** | 无 Codex CUA 运行时；适配器通过契约测试和决策循环回归覆盖 |
| 从 `.agents/skills/` 进行 omp 技能发现 | **已确认** | `skill://browser-with-typesafe` 在全新 omp 会话中解析；发现是启动时范围的 |

### 测试命令

```sh
npm test                     # 69 个单元、契约、安装程序、doctor 与架构测试
npm run test:e2e:playwright  # 真实端到端，成功时退出 0
npm run doctor               # 配置检查，仅可用时退出 0
```

两次实时运行（omp 和 Playwright）产生了相同的动作序列：

1. 点击 "Expand section"
2. 在 "Evaluation report" 内向下滚动 2 页
3. 点击 "Collapse section"
4. DONE

---

## 跨平台兼容性

### 已验证宿主

| 宿主 | 适配器 | 验证状态 |
|------|--------|----------|
| **omp** | `omp` | ✅ 真实端到端已验证 |
| **Codex** (Computer Use) | `codex` | ⚠️ 仅契约测试；真实宿主不可用 |
| **Cursor** | `playwright` | ✅ 契约覆盖 |
| **Claude Code** | `playwright` | ✅ 契约覆盖 |
| **Workbuddy** | `playwright` | ✅ 契约覆盖 |
| **Zcode** | `playwright` | ✅ 契约覆盖 |
| **任何 Playwright/CDP 宿主** | `playwright` | ✅ 真实端到端已验证 |

### 能力检测

`detectAdapter()` 检查传入的句柄并挑选正确的适配器：

```js
detectAdapter({ tab })      // 返回 omp 或 codex 适配器
detectAdapter({ page })     // 返回 playwright 适配器
detectAdapter({ tab, page }) // 选择最佳匹配；有歧义时失败
```

无匹配适配器时大声失败 —— 永不静默降级。

---

## 故障排查

| 消息 | 含义 | 修复 |
|------|------|------|
| `No configuration at <path>. Create one with node install.mjs...` | 配置文件缺失 | 运行安装程序，然后设置 `apiKey` |
| `Configuration at <path> is not valid JSON` | 文件损坏 | 修复或删除后重新运行安装程序 |
| `Unsupported provider "x"` | 提供商拼写错误 | 使用 `typesafe` 或 `openrouter` |
| `Invalid model "x" for provider typesafe` | 错误的模型 ID | 使用 `jev-latest` |
| `"apiKey" is empty in <path>` | 模板未填写 | 从提供商 URL 设置密钥 |
| `HTTP 401` / `HTTP 403` | 凭据或访问问题 | 在提供商控制台检查密钥有效性 |
| `transport failure or timeout` | 网络或超时 | 检查连接；验证 `decisionTimeoutMs` |
| `Invalid <provider> decision schema` | 端点响应但格式错误 | 向提供商报告 |
| `Snapshot too large` | 页面暴露过多节点 | 确定任务或区域范围 |
| `Browser left authorized origins` | 导航超出白名单 | 如合法则扩展 `allowedOrigins` |

### Doctor 输出解读

| 输出 | 含义 |
|------|------|
| `result READY` | 配置有效，端点可达，准备使用 |
| `NOT READY (apiKey)` | 配置存在但 `apiKey` 为空 |
| `NOT READY (endpoint)` 及 HTTP 401 | 密钥已设置但被端点拒绝（密钥错误或无权访问） |
| 退出码 0 | Doctor 通过 |
| 退出码 1 | Doctor 失败 —— 查看具体检查项 |

### 端点验证（手动）

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"jev-latest","state":{"goal":"ping","browser":"none","history":[]},"questions":{"next":{"type":"choice","instructions":"pick","criteria":{"a":"first","b":"second"}}}}'
```

预期：`200`

---

## 限制 / 未覆盖

| 限制 | 详情 |
|------|------|
| **文本输入已委派** | Jev 选字段，小模型生成值；`fill` 不提交，后果性操作归宿主 |
| **无原生选择框处理** | 原生 `<select>` 下拉框需要宿主处理 |
| **无 canvas/iframe 支持** | Canvas 应用和跨域 iframe 不受支持 |
| **无拖拽支持** | 拖拽操作需要宿主级自动化 |
| **无文件上传** | 上传流程需要宿主端文件选择 |
| **无 CAPTCHA 解决** | CAPTCHA 挑战留在宿主 |
| **Codex 真实宿主未验证** | 适配器存在并通过契约测试，但未在真实 Codex Computer Use 运行时上验证 |

---

## 使用示例

### 示例 1：浏览器验证流程

端到端验证设置页面：

```js
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

const config = await loadConfig();
const { adapter } = detectAdapter({ tab: settingsTab });

const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://app.example.com'],
  maxSteps: 8,
});

const outcome = await session.run({
  goal: 'Open notification settings, enable email alerts, save changes',
  controls: [
    { op: 'click', name: 'Notification settings' },
    { op: 'click', name: 'Email alerts' },
    { op: 'click', name: 'Save changes' },
  ],
});

// 宿主验证：检查开关状态
const fresh = await adapter.getState();
const emailToggle = fresh.nodes.find(n => n.name.includes('Email alerts'));
console.assert(emailToggle?.state?.checked === true, 'Email alerts should be enabled');
```

### 示例 2：仪表盘报告检查

滚动浏览大型评估报告：

```js
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://dashboard.example.com'],
  maxSteps: 15,
  maxMs: 60000,
});

const outcome = await session.run({
  goal: 'Expand the Q3 evaluation report, scroll through all sections, confirm status shows "Reviewed"',
  controls: [
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: {
    scrollDirections: ['down'],
    scrollAmount: 3,
    scrollTargetName: 'Q3 evaluation report',
  },
});

// 滚动后验证状态文本可见
const fresh = await adapter.getState();
const statusVisible = fresh.nodes.some(n => n.name.includes('Reviewed'));
console.assert(statusVisible, 'Status should show Reviewed');
```

### 示例 3：跨宿主可复用任务脚本

相同的任务脚本适用于任何支持的宿主：

```js
// task.mjs —— 跨宿主可复用
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

export async function runInspectionTask(browserHandle) {
  const config = await loadConfig();
  const { adapter } = detectAdapter(browserHandle);  // 从标签页或页面自动检测
  
  const session = createSession(adapter, {
    ...config,
    allowedOrigins: ['https://admin.example.com'],
    maxSteps: 10,
  });
  
  return await session.run({
    goal: 'Navigate to audit log, filter to last 7 days, verify at least one entry exists',
    controls: [
      { op: 'click', name: 'Audit log' },
      { op: 'click', name: 'Last 7 days' },
    ],
    policy: { scrollDirections: ['down'], scrollAmount: 1 },
  });
}

// omp 上的用法：
// const result = await runInspectionTask({ tab: ompTab });

// Playwright 上的用法：
// const result = await runInspectionTask({ page: pwPage });
```

---

## 参考

- [TypeSafe 介绍](https://docs.typesafe.ai/introduction)
- [OpenRouter Jev 最新版](https://openrouter.ai/~typesafe/jev-latest)
- [SKILL.md](skills/browser-with-typesafe/SKILL.md) —— 宿主无关说明
- [references/configuration.md](skills/browser-with-typesafe/references/configuration.md) —— 提供商设置和故障排查
- [references/adapter-contract.md](skills/browser-with-typesafe/references/adapter-contract.md) —— 添加新宿主
