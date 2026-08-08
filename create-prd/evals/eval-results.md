## create-prd 评估结果

### 两次运行对比

| Item | Run 1 (w=1) | Run 2 (w=3) | 说明 |
|------|-------------|-------------|------|
| probe_0000 收藏功能引导 | ❌ no_answer | ❌ no_answer | 一致 |
| probe_0001 收藏功能快速模式 | ✅ 100% | ❌ agent_exception | 不一致 |
| probe_0002 引导模式 | ✅ 100% | ✅ 100% | 一致 |
| probe_0003 更新+权限 | ❌ agent_exception | ❌ no_answer | 一致失败 |
| probe_0004 验证PRD | ✅ 100% | ✅ 100% | 一致 |
| probe_0005 综合搜索工具 | ❌ agent_exception | ❌ agent_exception | 一致 |
| probe_0006 微信小程序 | ❌ no_answer | ❌ agent_exception | 一致失败 |
| probe_0007 恢复生成 | ❌ agent_exception | — 未完成 | 未完成 |
| probe_0008 用户认证 | ✅ 100% | ❌ agent_exception | 不一致 |

### 汇总

| 指标 | Run 1 | Run 2 |
|------|-------|-------|
| Score | 44% (4/9) | 22% (2/9) |
| 稳定通过 | probe_0002, probe_0004 | probe_0002, probe_0004 |
| 稳定失败 | probe_0000, probe_0003, probe_0005, probe_0006 | probe_0000, probe_0003, probe_0005, probe_0006, probe_0008 |
| 不稳定 | — | probe_0001, probe_0008 翻转 |

### 失败原因

- **agent_exception** (5/8 失败项): Claude Code 返回 success 但被当作异常。9router 模型与 claude-agent-sdk 协议兼容性问题
- **no_answer** (3/8 失败项): Session 完成但未写 answer.txt。fast 模式代理可能省略了文件输出步骤
- **502 server_error**: 观察在 probe_0002 passing 轨迹中有 api_retry（502 error），模型不稳定性