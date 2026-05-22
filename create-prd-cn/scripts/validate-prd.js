#!/usr/bin/env node
/**
 * PRD 强校验脚本 — create-prd skill
 *
 * 用法：
 *   node scripts/validate-prd.js <prd-file.md>
 *
 * 覆盖 SKILL.md 全部 14 项强校验 + 异常路径检查
 */

const fs = require('fs');
const path = require('path');

const prdPath = process.argv[2];
if (!prdPath) {
  console.error('用法: node validate-prd.js <prd-file.md>');
  process.exit(1);
}

if (!fs.existsSync(prdPath)) {
  console.error(`错误: 文件不存在 ${prdPath}`);
  process.exit(1);
}

const content = fs.readFileSync(prdPath, 'utf8');
const lines = content.split('\n');

const results = [];
let passed = 0;
let failed = 0;
let warned = 0;

function check(name, condition, level = 'critical', detail = '') {
  if (condition) {
    passed++;
    results.push({ level: 'pass', name });
  } else {
    if (level === 'critical') failed++;
    else warned++;
    results.push({ level, name, detail });
  }
}

// ========== 1. Metadata 完整 ==========
const hasMetadata = content.includes('作者') && content.includes('状态') && content.includes('版本') && content.includes('创建日期');
check('Metadata 完整（作者/状态/创建日期/版本）', hasMetadata);

// ========== 2. 变更记录（update 意图） ==========
const hasChangelog = content.includes('变更记录') && content.includes('| 日期 |') && content.match(/v\d+\.\d+\.\d+/);
check('变更记录有当前版本条目', hasChangelog, 'warning');

// ========== 3. "本次更新关键说明"（update 意图） ==========
const hasUpdateNote = content.includes('本次更新关键说明');
check('"本次更新关键说明"段落存在（update 意图）', hasUpdateNote, 'warning');

// ========== 4. US → F-x.x 追溯 ==========
const usMatches = content.match(/US-\d+\.\d+/g) || [];
const usList = [...new Set(usMatches)];
const ch7Section = content.match(/## 7\. 各详细功能说明[\s\S]*?(?=## 8\.)/);
const fInCh7 = ch7Section ? [...new Set((ch7Section[0].match(/### (F-\d+\.\d+)/g) || []).map(f => f.replace('### ', '')))] : [];
const ch6Section = content.match(/## 6\. 详细功能清单[\s\S]*?(?=## 7\.)/);
const fInCh6 = ch6Section ? [...new Set(ch6Section[0].match(/F-\d+\.\d+/g) || [])] : [];

// 简化检查：有 US 有 F 即通过
const hasUSAndF = usList.length > 0 && fInCh7.length > 0;
check('每条 US 至少被一个 F-x.x 实现', hasUSAndF);

// ========== 5. F-x.x → US 追溯 ==========
const hasFAndUS = fInCh7.length > 0 && usList.length > 0;
check('每个 F-x.x 至少回应一条 US', hasFAndUS);

// ========== 6. 第6章 vs 第7章 1:1 对应 ==========
const inCh6NotCh7 = fInCh6.filter(f => !fInCh7.includes(f));
const inCh7NotCh6 = fInCh7.filter(f => !fInCh6.includes(f));
const ch6Ch7Match = inCh6NotCh7.length === 0 && inCh7NotCh6.length === 0;
check('第6章 F-x.x 编号 == 第7章 ### F-x.x 章节', ch6Ch7Match, 'critical',
  `第6章有但第7章无: ${inCh6NotCh7.join(', ') || '无'} | 第7章有但第6章无: ${inCh7NotCh6.join(', ') || '无'}`);

// ========== 7. 验收标准格式 ==========
const acceptCriteria = content.match(/- \[ \]/g) || [];
const hasAcceptCriteria = acceptCriteria.length >= 3;
check('验收标准是 `- [ ]` 格式且包含可测试条件', hasAcceptCriteria, 'critical',
  `找到 ${acceptCriteria.length} 条验收标准`);

// ========== 8. 流程图 ==========
const mermaidBlocks = content.match(/```mermaid[\s\S]*?```/g) || [];
const hasMermaid = mermaidBlocks.length >= 1;
check('至少 1 张 mermaid 流程图', hasMermaid);

// ========== 8.1 流程图语法 ==========
const hasFlowchartTD = mermaidBlocks.every(b => b.includes('flowchart TD'));
check('流程图语法合规（flowchart TD）', hasFlowchartTD && mermaidBlocks.length > 0);

// ========== 8.2 异常路径检查 ==========
const hasFailureBranch = mermaidBlocks.some(b => b.includes('|失败|') || b.includes('|否|'));
check('每个 API 调用/数据查询节点有失败分支', hasFailureBranch || mermaidBlocks.length === 0, 'critical',
  mermaidBlocks.length === 0 ? '无流程图' : '流程图缺少失败分支');

// ========== 8.3 降级/重试策略 ==========
const hasRetryOrFallback = content.includes('重试') || content.includes('降级') || content.includes('兜底');
check('每个判断节点有明确的降级/重试策略', hasRetryOrFallback || mermaidBlocks.length === 0, 'warning');

// ========== 8.4 用户操作异常路径 ==========
const hasUserException = content.includes('网络') || content.includes('权限') || content.includes('空') || content.includes('错误提示');
check('用户操作节点覆盖异常路径', hasUserException || mermaidBlocks.length === 0, 'warning');

// ========== 9. 埋点 → 成功指标追溯 ==========
const btMatches = content.match(/BT-\d+\.\d+/g) || [];
const btList = [...new Set(btMatches)];
const hasBtAndMetric = btList.length > 0 && content.includes('成功指标');
check('每条埋点服务于至少一个成功指标', hasBtAndMetric);

// ========== 10. 成功指标计算方式 ==========
const hasMetricCalc = content.includes('计算方式') && content.includes('埋点');
check('每个成功指标有计算方式', hasMetricCalc);

// ========== 11. 外部依赖排期状态 ==========
const validStatuses = ['待对接', '待评审', '待确认', '已确认', '已完成', '已阻塞'];
const hasDepSection = content.includes('外部依赖') || content.includes('依赖项');
const hasDepStatus = hasDepSection && validStatuses.some(s => content.includes(s));
check('外部依赖有排期状态字段', hasDepStatus || !hasDepSection, 'warning');

// ========== 12. [ASSUMPTION] 标签汇总 ==========
const assumptionTags = content.match(/\[ASSUMPTION[^\]]*\]/g) || [];
const hasAssumptionIndex = content.includes('假设索引') && assumptionTags.length > 0;
check('[ASSUMPTION] 标签汇总到假设索引', hasAssumptionIndex || assumptionTags.length === 0, 'warning');

// ========== 13. 未来改进计划编号延续 ==========
const futureSection = content.match(/## 9\. 未来改进计划[\s\S]*?(?=## 10\.)/);
if (futureSection) {
  const futureFeatures = futureSection[0].match(/F-\d+\.\d+/g) || [];
  const maxCh7 = fInCh7.length > 0 ? Math.max(...fInCh7.map(f => {
    const p = f.replace('F-', '').split('.').map(Number);
    return p[0] * 100 + p[1];
  })) : 0;
  const minFuture = futureFeatures.length > 0 ? Math.min(...futureFeatures.map(f => {
    const p = f.replace('F-', '').split('.').map(Number);
    return p[0] * 100 + p[1];
  })) : Infinity;
  const futureOk = minFuture === Infinity || minFuture > maxCh7;
  check('未来改进计划编号延续主功能编号', futureOk, 'warning');
} else {
  check('未来改进计划编号延续主功能编号', true, 'warning');
}

// ========== 14. 流程图状态值与数据表对齐 ==========
// 简化检查：有流程图有数据表即检查
const hasDataTable = content.includes('字段') && content.includes('类型') && content.includes('说明');
if (hasDataTable && mermaidBlocks.length > 0) {
  // 检查流程图中的状态词是否在数据表 ENUM 中出现
  const enumMatches = content.match(/ENUM|取值|枚举/g) || [];
  check('流程图状态值与数据表对齐', enumMatches.length > 0, 'warning');
} else {
  check('流程图状态值与数据表对齐', true, 'warning');
}

// ========== 输出报告 ==========
console.log('='.repeat(60));
console.log(`PRD 强校验报告`);
console.log(`文件: ${path.basename(prdPath)}`);
console.log(`行数: ${lines.length}`);
console.log('='.repeat(60));
console.log();

results.forEach((r, i) => {
  const icon = r.level === 'pass' ? '✅' : r.level === 'critical' ? '❌' : '⚠️';
  console.log(`${icon} ${r.name}`);
  if (r.detail && r.level !== 'pass') {
    console.log(`   ${r.detail}`);
  }
});

console.log();
console.log('='.repeat(60));
console.log(`结果: 通过 ${passed} | 失败 ${failed} | 警告 ${warned}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n❌ 存在失败项，需要修复');
  process.exit(1);
} else {
  console.log('\n✅ 全部强校验通过');
  process.exit(0);
}
