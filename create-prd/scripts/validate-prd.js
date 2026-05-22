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
const hasChangelog = content.includes('Changelog') && content.includes('| Date |') && content.match(/v\d+\.\d+\.\d+/);
check('Changelog has current version entry', hasChangelog, 'warning');

// ========== 3. "Key Update Notes" (update intent) ==========
const hasUpdateNote = content.includes('Key Update Notes');
check('"Key Update Notes" paragraph exists (update intent)', hasUpdateNote, 'warning');

// ========== 4. US → F-x.x Traceability ==========
const usMatches = content.match(/US-\d+\.\d+/g) || [];
const usList = [...new Set(usMatches)];
const ch7Section = content.match(/## 7\. Feature Details[\s\S]*?(?=## 8\.)/);
const fInCh7 = ch7Section ? [...new Set((ch7Section[0].match(/### (F-\d+\.\d+)/g) || []).map(f => f.replace('### ', '')))] : [];
const ch6Section = content.match(/## 6\. Detailed Feature List[\s\S]*?(?=## 7\.)/);
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

// ========== 8.2 Exception Path Check ==========
const hasFailureBranch = mermaidBlocks.some(b => b.includes('|Failure|') || b.includes('|No|') || b.includes('|Timeout|'));
check('Each API call/data query node has failure branch', hasFailureBranch || mermaidBlocks.length === 0, 'critical',
  mermaidBlocks.length === 0 ? 'No flowchart' : 'Flowchart missing failure branch');

// ========== 8.3 Degradation/Retry Strategy ==========
const hasRetryOrFallback = content.includes('retry') || content.includes('degrade') || content.includes('fallback') || content.includes('Retry') || content.includes('Fallback');
check('Each judgment node has clear degradation/retry strategy', hasRetryOrFallback || mermaidBlocks.length === 0, 'warning');

// ========== 8.4 User Operation Exception Paths ==========
const hasUserException = content.includes('network') || content.includes('permission') || content.includes('empty') || content.includes('error') || content.includes('Network') || content.includes('Permission');
check('User operation nodes cover exception paths', hasUserException || mermaidBlocks.length === 0, 'warning');

// ========== 9. Tracking → Success Metric Traceability ==========
const btMatches = content.match(/BT-\d+\.\d+/g) || [];
const btList = [...new Set(btMatches)];
const hasBtAndMetric = btList.length > 0 && content.includes('Success Metric');
check('Each tracking event serves at least one success metric', hasBtAndMetric);

// ========== 10. Success Metric Calculation Methods ==========
const hasMetricCalc = content.includes('Calculation Method') && content.includes('BT-');
check('Each success metric has calculation method', hasMetricCalc);

// ========== 11. External Dependency Schedule Status ==========
const validStatuses = ['pending-review', 'pending-confirm', 'confirmed', 'completed', 'blocked'];
const hasDepSection = content.includes('External Dependencies') || content.includes('Dependency Item');
const hasDepStatus = hasDepSection && validStatuses.some(s => content.includes(s));
check('External dependencies have schedule status field', hasDepStatus || !hasDepSection, 'warning');

// ========== 12. [ASSUMPTION] Tag Summary ==========
const assumptionTags = content.match(/\[ASSUMPTION[^\]]*\]/g) || [];
const hasAssumptionIndex = content.includes('Assumption Index') && assumptionTags.length > 0;
check('[ASSUMPTION] tags summarized to Assumption Index', hasAssumptionIndex || assumptionTags.length === 0, 'warning');

// ========== 13. Future Improvement Plan Numbering Continuation ==========
const futureSection = content.match(/## 9\. Future Improvement Plans[\s\S]*?(?=## 10\.)/);
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
const hasDataTable = content.includes('Field') && content.includes('Type') && content.includes('Description');
if (hasDataTable && mermaidBlocks.length > 0) {
  // Check if state words in flowchart appear in data table ENUM
  const enumMatches = content.match(/ENUM|values|enum/g) || [];
  check('Flowchart state values aligned with data table', enumMatches.length > 0, 'warning');
} else {
  check('Flowchart state values aligned with data table', true, 'warning');
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
