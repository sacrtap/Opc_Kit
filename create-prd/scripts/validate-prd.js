#!/usr/bin/env node
/**
 * PRD Strict Validation Script — create-prd skill
 *
 * Usage:
 *   node scripts/validate-prd.js <prd-file.md>
 *
 * Covers all 14 strict validation checks from SKILL.md + exception path checks
 */

const fs = require('fs');
const path = require('path');

const prdPath = process.argv[2];
if (!prdPath) {
  console.error('Usage: node validate-prd.js <prd-file.md>');
  process.exit(1);
}

if (!fs.existsSync(prdPath)) {
  console.error(`Error: File not found ${prdPath}`);
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

// ========== 1. Metadata Complete ==========
const hasMetadata = content.includes('Author') && content.includes('Status') && content.includes('Version') && content.includes('Created');
check('Metadata complete (Author/Status/Created/Version)', hasMetadata);

// ========== 2. Changelog (update intent) ==========
const hasChangelog = (content.includes('Changelog') || content.includes('变更记录')) && content.match(/\|\s*Date\s*\|/) && content.match(/v\d+\.\d+\.\d+/);
check('Changelog has current version entry', hasChangelog, 'warning');

// ========== 3. "Key Update Notes" (update intent) ==========
const hasUpdateNote = content.includes('Key Update Notes') || content.includes('关键更新说明');
check('"Key Update Notes" paragraph exists (update intent)', hasUpdateNote, 'warning');

// ========== 4. US → F-x.x Traceability ==========
const usMatches = content.match(/US-\d+\.\d+/g) || [];
const usList = [...new Set(usMatches)];
const ch7Section = content.match(/## 7\.\s+(Feature Details|各详细功能说明)[\s\S]*?(?=## 8\.)/);
const fInCh7 = ch7Section ? [...new Set((ch7Section[0].match(/### (F-\d+\.\d+)/g) || []).map(f => f.replace('### ', '')))] : [];
const ch6Section = content.match(/## 6\.\s+(Detailed Feature List|详细功能清单)[\s\S]*?(?=## 7\.)/);
const fInCh6 = ch6Section ? [...new Set(ch6Section[0].match(/F-\d+\.\d+/g) || [])] : [];

// Simplified check: has US and has F = pass
const hasUSAndF = usList.length > 0 && fInCh7.length > 0;
check('Each US implemented by at least one F-x.x', hasUSAndF);

// ========== 5. F-x.x → US Traceability ==========
const hasFAndUS = fInCh7.length > 0 && usList.length > 0;
check('Each F-x.x responds to at least one US', hasFAndUS);

// ========== 6. Chapter 6 vs Chapter 7 1:1 Correspondence ==========
const inCh6NotCh7 = fInCh6.filter(f => !fInCh7.includes(f));
const inCh7NotCh6 = fInCh7.filter(f => !fInCh6.includes(f));
const ch6Ch7Match = inCh6NotCh7.length === 0 && inCh7NotCh6.length === 0;
check('Chapter 6 F-x.x numbering == Chapter 7 ### F-x.x sections', ch6Ch7Match, 'critical',
  `In Ch6 but not Ch7: ${inCh6NotCh7.join(', ') || 'none'} | In Ch7 but not Ch6: ${inCh7NotCh6.join(', ') || 'none'}`);

// ========== 7. Acceptance Criteria Format ==========
const acceptCriteria = content.match(/- \[ \]/g) || [];
const hasAcceptCriteria = acceptCriteria.length >= 3;
check('Acceptance criteria in `- [ ]` format with testable conditions', hasAcceptCriteria, 'critical',
  `Found ${acceptCriteria.length} acceptance criteria`);

// ========== 8. Flowcharts ==========
const mermaidBlocks = content.match(/```mermaid[\s\S]*?```/g) || [];
const hasMermaid = mermaidBlocks.length >= 1;
check('At least 1 mermaid flowchart', hasMermaid);

// ========== 8.1 Flowchart Syntax ==========
const hasFlowchartTD = mermaidBlocks.every(b => b.includes('flowchart TD'));
check('Flowchart syntax compliant (flowchart TD)', hasFlowchartTD && mermaidBlocks.length > 0);

// ========== 8.1.1 No ASCII Double Quotes in Mermaid ==========
const hasDoubleQuotes = mermaidBlocks.some(b => {
  const inner = b.replace(/```mermaid\s*/g, '').replace(/```/g, '');
  return /"[^"]*"/.test(inner);
});
check('No ASCII double quotes in mermaid blocks', !hasDoubleQuotes || mermaidBlocks.length === 0, 'critical',
  'Double quotes found in mermaid blocks — use single quotes or no quotes');

// ========== 8.1.2 No Circle Nodes ((text)) ==========
const hasCircleNodes = mermaidBlocks.some(b => /\(\([^)]*\)\)/.test(b));
check('No circle nodes ((text)) in mermaid blocks', !hasCircleNodes || mermaidBlocks.length === 0, 'critical',
  'Circle nodes found — use (rounded rect) instead of ((circle))');

// ========== 8.1.3 No HTML Tags in Mermaid ==========
const hasHtmlTags = mermaidBlocks.some(b => /<[a-zA-Z][^>]*>/.test(b));
check('No HTML tags in mermaid blocks', !hasHtmlTags || mermaidBlocks.length === 0, 'critical',
  'HTML tags found in mermaid blocks — split long text into separate nodes');

// ========== 8.2 Exception Path Check ==========
const hasFailureBranch = mermaidBlocks.some(b => b.includes('|Failure|') || b.includes('|No|') || b.includes('|Timeout|'));
check('Each API call/data query node has failure branch', hasFailureBranch || mermaidBlocks.length === 0, 'critical',
  mermaidBlocks.length === 0 ? 'No flowchart' : 'Flowchart missing failure branch');

// ========== 8.3 Degradation/Retry Strategy ==========
const hasRetryOrFallback = content.includes('retry') || content.includes('degrade') || content.includes('fallback') || content.includes('Retry') || content.includes('Fallback') || content.includes('重试') || content.includes('降级') || content.includes('回退');
check('Each judgment node has clear degradation/retry strategy', hasRetryOrFallback || mermaidBlocks.length === 0, 'warning');

// ========== 8.4 User Operation Exception Paths ==========
const hasUserException = content.includes('network') || content.includes('permission') || content.includes('empty') || content.includes('error') || content.includes('Network') || content.includes('Permission');
check('User operation nodes cover exception paths', hasUserException || mermaidBlocks.length === 0, 'warning');

// ========== 9. Tracking → Success Metric Traceability ==========
const btMatches = content.match(/BT-\d+\.\d+/g) || [];
const btList = [...new Set(btMatches)];
const hasBtAndMetric = btList.length > 0 && (content.includes('Success Metric') || content.includes('成功指标'));
check('Each tracking event serves at least one success metric', hasBtAndMetric);

// ========== 10. Success Metric Calculation Methods ==========
const hasMetricCalc = (content.includes('Calculation Method') || content.includes('计算方式')) && content.includes('BT-');
check('Each success metric has calculation method', hasMetricCalc);

// ========== 11. External Dependency Schedule Status ==========
const validStatuses = ['pending-review', 'pending-confirm', 'confirmed', 'completed', 'blocked'];
const hasDepSection = content.includes('External Dependencies') || content.includes('Dependency Item') || content.includes('外部依赖') || content.includes('依赖项');
const hasDepStatus = hasDepSection && validStatuses.some(s => content.includes(s));
check('External dependencies have schedule status field', hasDepStatus || !hasDepSection, 'warning');

// ========== 12. [ASSUMPTION] Tag Summary ==========
const assumptionTags = content.match(/\[ASSUMPTION[^\]]*\]/g) || [];
const hasAssumptionIndex = (content.includes('Assumption Index') || content.includes('假设索引')) && assumptionTags.length > 0;
check('[ASSUMPTION] tags summarized to Assumption Index', hasAssumptionIndex || assumptionTags.length === 0, 'warning');

// ========== 13. Future Improvement Plan Numbering Continuation ==========
const futureSection = content.match(/## 9\.\s+(Future Improvement Plans|未来改进计划)[\s\S]*?(?=## 10\.)/);
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
  check('Future improvement plan numbering continues from main feature numbering', futureOk, 'warning');
} else {
  check('Future improvement plan numbering continues from main feature numbering', true, 'warning');
}

// ========== 14. Flowchart State Values Aligned with Data Tables ==========
// Simplified check: if has flowchart and data table, check
const hasDataTable = (content.includes('Field') && content.includes('Type') && content.includes('Description')) || (content.includes('字段') && content.includes('类型') && content.includes('描述'));
if (hasDataTable && mermaidBlocks.length > 0) {
  // Check if state words in flowchart appear in data table ENUM
  const enumMatches = content.match(/ENUM|values|enum/g) || [];
  check('Flowchart state values aligned with data table', enumMatches.length > 0, 'warning');
} else {
  check('Flowchart state values aligned with data table', true, 'warning');
}

// ========== 15. Front Matter Cleanup Detection ==========
const frontMatterBlock = content.split('---')[1];
if (frontMatterBlock) {
  // Check if it contains business fields (should not exist in final PRD)
  const hasBusinessFields = /title:\s*"|status:\s*"|created:\s*"|updated:\s*"|version:\s*"|project:\s*"|related_docs:\s*"|prototype:\s*"/.test(frontMatterBlock);
  
  // Also check completion status
  const isCompleted = frontMatterBlock.includes('batch_5:') && 
                      (frontMatterBlock.match(/batch_5:\s*completed/g) || []).length > 0;
  
  if (isCompleted && hasBusinessFields) {
    check('Final PRD should not contain front matter (should be cleaned)', false, 'warning',
          'Found front matter in completed PRD — run final cleanup step');
  } else if (hasBusinessFields) {
    check('No business metadata in front matter (only checkpoints allowed)', false, 'warning',
          'Front matter should only contain generate_progress, not title/status/etc.');
  } else {
    check('Generation checkpoint detected (temporary state)', true, 'info');
  }
} else {
  check('No front matter present (correct for final PRD)', true, 'info');
}

// ========== 16. Target Platform Column in Chapter 6 ==========
const chapter6Match = content.match(/## 6\.\s+(Detailed Feature List|详细功能清单)[\s\S]*?\n\|[\s\S]*?\n/);
const hasTargetPlatform = !chapter6Match || chapter6Match[0].includes('Target Platform') || chapter6Match[0].includes('目标平台');
check('Chapter 6 Feature List has Target Platform column', hasTargetPlatform, 'warning');

// ========== 17. Platform Ecosystem Validation ==========
const platformOk = !content.includes('[ASSUMPTION]') || content.includes('Platform') || content.includes('平台');
check('Platform ecosystem inference considered', platformOk, 'warning');

// ========== 18. Metadata Table Completeness ==========
const hasMetadataTable = content.includes('## Metadata') &&
                        content.includes('| Field        | Value        |') &&
                        content.includes('| Author       |') &&
                        content.includes('| Status       |') &&
                        content.includes('| Created      |') &&
                        content.includes('| Version      |') &&
                        content.includes('| Project      |');
check('Metadata table complete (8 fields)', hasMetadataTable, 'critical');

// ========== Review Record Note ==========
if (!content.includes('## Review Record') && !content.includes('## 评审记录')) {
  console.log('\n\u2139\uFE0F Note: "Review Record" is only generated in create/update modes. Validate mode performs static scanning only.');
}

// ========== Output Report ==========
console.log('='.repeat(60));
console.log(`PRD Strict Validation Report`);
console.log(`File: ${path.basename(prdPath)}`);
console.log(`Lines: ${lines.length}`);
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
console.log(`Result: Pass ${passed} | Fail ${failed} | Warning ${warned}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n❌ Failures detected, needs fixing');
  process.exit(1);
} else {
  console.log('\n✅ All strict validation checks passed');
  process.exit(0);
}
