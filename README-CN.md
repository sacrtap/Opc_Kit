# Opc_Kit

> **专业的 AI Agent 技能工具集** — 从多角色决策辩论到结构化 PRD 输出，兼容所有 AI 编程代理的完整产品工作流解决方案

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: v2.5.1](https://img.shields.io/badge/Version-2.5.1-blue.svg)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-green.svg)]()
[![skills.sh](https://skills.sh/b/sacrtap/Opc_Kit)](https://skills.sh/sacrtap/Opc_Kit)
[![PRD Validation](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml/badge.svg)](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml)

---

## 为什么选择 Opc_Kit？

大多数 AI 工具只给你单一视角。Opc_Kit 给你**完整的产品决策闭环**。

- **从辩论到文档** — 用 **party-mode** 模拟专家圆桌讨论，再用 **create-prd** 将决策转化为结构化、可交付的 PRD。两个技能，一套完整工作流。
- **消除决策盲区** — 17 位专业角色覆盖工程、产品、战略三大维度，在写下需求之前先挑战你的假设。
- **专业级质量保证** — 双向追溯、第一性原理验证、7 维评分体系，每份输出都经得起资深 PM 审查。
- **零学习成本** — 自然语言触发，自动意图识别。无需记忆命令，无需配置。
- **全平台兼容** — 一套技能适配所有 AI 编程代理，无厂商锁定，自动适配工具链。

---

## 技能一览

| 技能 | 用途 | 版本 | 快速安装 | 使用指南 |
|------|------|------|----------|----------|
| 📝 [create-prd](create-prd/SKILL.md) | PRD 创建、更新与验证 | v2.5.1 | `npx skills add sacrtap/Opc_Kit --skill create-prd` | [使用指南](create-prd-guide-CN.md) |
| 🎭 [party-mode](party-mode/SKILL.md) | 多角色产品决策讨论 | v1.0.0 | `npx skills add sacrtap/Opc_Kit --skill party-mode` | [使用指南](party-mode-guide-CN.md) |

---

## 快速开始

### 安装

```bash
# 安装全部技能
npx skills add sacrtap/Opc_Kit

# 安装指定技能
npx skills add sacrtap/Opc_Kit --skill create-prd
npx skills add sacrtap/Opc_Kit --skill party-mode

# 查看可用技能列表
npx skills add sacrtap/Opc_Kit --list
```

### 基本使用

**单独使用 create-prd：**
```
/create-prd 帮我写一个用户认证功能的 PRD
```

**单独使用 party-mode：**
```
/party-mode — 微服务还是单体架构？我们是 5 人团队，MVP 阶段。
```

**完整工作流：先辩论，再文档化**
```
# 第一步：多视角压力测试你的想法
/party-mode — 我们要不要给文档编辑器做实时协作功能？
技术栈：React + Node.js。规模：5000 并发用户。时间线：8 周。

# 第二步：将决策转化为结构化 PRD
/create-prd 基于 party-mode 的讨论，写一份实时协作功能的 PRD
```

两个技能，一套完整工作流：从多视角辩论到可执行文档。

---

## 技能亮点

### 📝 create-prd — 专业 PRD 写作助手

将产品需求转化为结构化、可交付的文档，具备企业级质量保证。

**核心特性：**
- **13 章标准模板** — 固定骨架确保完整性，从问题描述到风险分析全覆盖
- **双向追溯机制** — US↔FR 1:1 映射，每个功能都可追溯到用户故事
- **双模式工作流** — Coaching 模式（引导交互，~5-10 分钟）或 Fast 模式（直接生成，~2-3 分钟）
- **7 维质量评分** — 量化评估体系，含生产就绪基准线（70+ 分 = 可交付，85+ 分 = 优秀）
- **异常覆盖流程图** — Mermaid 图表强制要求所有外部调用包含失败/超时分支
- **自动语言检测** — 中英双语支持，智能切换

**输出示例：**
```
用户：/create-prd 帮我写一个用户收藏功能的 PRD

结果：
✅ 13 章 PRD，双向追溯完整
✅ Mermaid 流程图含异常路径
✅ 质量评分：82/100（生产就绪）
✅ 假设索引标注 5 处推断
```

📚 [查看完整指南](create-prd-guide-CN.md)了解详细特性、模板和方法论。

---

### 🎭 party-mode — 多角色决策讨论

停止用单一视角做关键决策。让 17 位产品与工程专家围绕你的问题展开真实辩论——不是优缺点清单，而是一个会争论、挑战假设、推动你做出经得起辩护的结论的专家讨论室。

**在犯错代价很高时使用：**

| 场景 | 你获得什么 |
|------|-----------|
| **新产品（0→1）** | 压力测试市场假设、验证支付意愿、在投入资源前找到真正的护城河 |
| **关键功能设计** | 在开发前抓住 UX 缺口、安全风险、扩展问题和交付盲区 |
| **架构决策** | 多位经验丰富的架构师针对你的具体约束辩论不可逆的选择 |
| **产品路线图** | 多视角挑战下的基于证据的优先级排序 |
| **商业模式** | 单位经济模型验证、市场策略评估、长期防御性评估 |

**核心特性：**
- **17 位专业角色** — 覆盖工程、产品、战略三大领域，各有独特专业知识和沟通风格
- **动态角色选择** — 根据话题自动选择 4-6 位最相关的专家
- **三级讨论深度** — 快速决策（3-5 轮）、标准讨论（8-12 轮）、深度探讨（15-25 轮）
- **四种运行模式** — Subagent（独立思考）、Session（轻量级）、Auto（混合）、Agent-Team（持久化）
- **证据驱动讨论** — 角色引用行业数据、基准测试和案例研究，而非空谈观点
- **会话记忆** — 跨会话上下文保持，角色记住之前的结论和联盟

**示例：**
```
/party-mode — 我们想做一个 AI 习惯追踪 App。目标：25-40 岁职场人。
假设：AI 教练 $8/月。预算：$200K，4 人团队，6 个月跑道。

你会听到：
- Cai 用习惯类 App 的真实 ARPU 数据质疑 $8/月的假设
- Ren 追问你有没有跟 20 个目标用户聊过他们真正的痛点
- Tao 建议在写代码之前先跑一个 2 周的 WhatsApp 验证测试
- Wei 警告 AI 个性化不是护城河——6 个月内每个 App 都会加 GPT
- Splinter 质疑你的目标人群是不是正确的人群
```

📚 [查看完整指南](party-mode-guide-CN.md)了解详细场景、全部角色和高级功能。

---

## 跨平台兼容

技能天生具备平台无关性。它们使用自然语言指令和通用工具描述，任何 AI 编程代理都能理解和执行。无厂商锁定，无需配置。

### 已验证平台

| 平台 | 状态 | 说明 |
|------|------|------|
| OpenCode | ✅ 完整支持 | 原生技能系统，支持子代理 |
| Claude Code | ✅ 完整支持 | 原生技能系统，支持子代理 |
| Cursor | ✅ 完整支持 | 内置工具，内联聊天 |
| Codex | ✅ 完整支持 | CLI 模式，完整工具访问 |
| GitHub Copilot | ✅ 兼容 | Workspace 模式，聊天界面 |
| Windsurf (Codeium) | ✅ 兼容 | Cascade 流程，聊天模式 |
| Aider | ✅ 兼容 | 基于聊天的交互 |
| Cline | ✅ 兼容 | VS Code 扩展，完整工具访问 |
| Continue | ✅ 兼容 | 开源，可配置 |
| JetBrains AI | ✅ 兼容 | IDE 集成助手 |
| Amazon Q Developer | ✅ 兼容 | CLI 和 IDE 集成 |
| Google Jules | ✅ 兼容 | 基于代理的工作流 |
| Zed AI | ✅ 兼容 | 内置 AI 助手 |
| Void | ✅ 兼容 | 开源替代方案 |
| Trae | ✅ 兼容 | IDE 集成助手 |

### 工作原理

技能遵循**通用设计模式**：
- **自然语言指令** — 任何大语言模型都能理解工作流
- **通用工具描述** — "读取文件"、"写入文件"、"搜索内容"，而非特定工具 API
- **自动降级** — 当某功能不可用时（如子代理），技能优雅适配
- **零配置** — 安装即用，技能自动检测平台能力

### 为你的平台添加支持

如果你常用的 AI 工具未在列表中，技能很可能开箱即用。核心要求：
1. 代理能够读写文件
2. 代理能够执行 bash/shell 命令
3. 代理支持多轮对话

仅此而已，无需特殊集成。

---

## 贡献指南

我们欢迎高质量的技能贡献！

### 添加新技能

1. Fork 本仓库
2. 创建新技能文件夹（如 `my-skill/`）
3. 按结构规范编写 SKILL.md
4. 提交 PR 并附上使用示例

### 技能质量标准

- ✅ 固定模板 + 强制验证机制
- ✅ 推荐驱动交互（而非填空式问答）
- ✅ 双向追溯/可追溯性保证
- ✅ 专业视角 + 行业最佳实践
- ✅ 跨平台兼容（不绑定特定 Agent 工具链）
- ✅ 完整文档 + 使用示例

---

## 许可证

MIT © sacrtap

---

## 社区

- **GitHub Issues**：[报告问题或请求功能](https://github.com/sacrtap/Opc_Kit/issues)
- **Discussions**：[分享使用案例](https://github.com/sacrtap/Opc_Kit/discussions)
- **skills.sh**：[浏览和安装技能](https://skills.sh/sacrtap/Opc_Kit)

---

> **Opc_Kit** — 让 AI Agent 成为真正的产品工作流专家，而非简单的问答机器。
