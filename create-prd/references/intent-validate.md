# validate Intent Detailed Flow

## On Activation

1. Load PRD file (user provides path or paste content)
2. Run the following 5-category validation
3. Output graded report (Critical/Warning/Info)

## A. Structural Completeness

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Chapter presence | All 12 chapters present (1-10 + 11 Glossary + 12 Assumption Index) | Critical |
| Metadata | 8 fields complete (author/status/created/updated/version/project/related-docs/prototype) | Critical |
| Changelog | Has changelog table with at least one version entry | Critical |
| Version format | Matches vX.Y.Z pattern | Warning |

## B. Reference Consistency

### B1: US ↔ F-x.x Bidirectional Traceability

| Check | Rule | Level |
| ----- | ---- | ----- |
| US→FR | Each user story implemented by at least one F-x.x | Critical |
| FR→US | Each F-x.x responds to at least one user story | Warning |

### B2: Chapter 6 vs Chapter 7 1:1 Correspondence

| Check | Rule | Level |
| ----- | ---- | ----- |
| Numbering match | Chapter 6 F-x.x numbering == Chapter 7 ### F-x.x sections | Critical |

### B3: Tracking ↔ Success Metric ↔ Calculation Method Three-Way Traceability

**Forward - Calculation Method Coverage** (Success Metric → Calculation Method):
1. Extract all success metrics from Chapter 2
2. Check if section 8.3 has calculation methods for each metric with the same name
3. Count mismatch → Critical (metric unmeasurable, Chapter 2 has N metrics but section 8.3 only has M calculation methods, N≠M)

**Forward - Tracking Coverage** (Success Metric → Tracking):
1. Extract all success metrics from Chapter 2
2. Check if each metric's calculation method in section 8.3 references at least one tracking event ID
3. Missing → Critical (metric has calculation method but no concrete tracking event support, cannot achieve automated measurement)

**Reverse** (Tracking → Success Metric):
1. Extract all tracking event IDs from section 8.2
2. Check if each tracking event's "Serves Which Success Metric" column is non-empty
3. Empty → Critical (tracking event has no serving target, violates 1:1 mandatory rule)

## C. Testability

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Acceptance criteria format | All in `- [ ]` format | Critical |
| Quantifiable conditions | Each criterion contains quantifiable/executable judgment (numbers, time thresholds, percentages, boolean states) | Critical |
| Vague word blacklist | Criteria must not contain: "normal", "friendly", "obvious", "reasonable", "good", "smooth" without quantifiable context | Warning |

**Fuzzy word blacklist:**
```
正常 / normal, 友好 / friendly, 明显 / obvious, 合理 / reasonable,
良好 / good, 流畅 / smooth, 及时 / timely, 准确 / accurate (without threshold)
```

## D.规范性 (Standards Compliance)

### D1: Flowchart Check

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Count | At least 1 mermaid flowchart | Critical |
| Syntax | Uses `flowchart TD` at start | Critical |
| Node count | 8-20 nodes per chart | Warning |
| Judgment branches | Judgment nodes have success/failure branches (when applicable) | Warning |
| API/data query exceptions | Each API call/data query node must have failure+timeout branches, success-only paths not allowed | Critical |
| State value alignment | State values/enums in flowcharts match Chapter 7 data table definitions | Critical |
| Multi-line text | Uses `[title<br/>description]` format | Info |

### D2: Glossary Coverage

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Presence | Glossary chapter exists | Warning |
| Coverage | Domain-specific nouns appearing ≥2 times are defined | Info |

### D3: [ASSUMPTION] Tag Check

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Tag presence | If [ASSUMPTION] tags exist, Chapter 12 Assumption Index must exist | Critical |
| Summary completeness | All [ASSUMPTION] tags are summarized in Chapter 12 | Warning |

### D4: External Dependency Schedule Status

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Status field | Each external dependency has "Schedule Status" field | Critical |
| Valid enum values | Must be one of: pending-review, pending-confirm, confirmed, completed, blocked | Critical |

### D5: Future Improvement Plan Numbering Continuation

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Numbering continuation | Future improvement plan F-x.x numbers must continue from main feature numbering (greater than max F-x.x in Chapter 7) | Warning |

### D6: Feature Priority Format

| Check Item | Rule | Level |
| ---------- | ---- | ----- |
| Priority format | All feature priorities must use P0/P1/P2, not Must/Should/Could/Won't | Critical |
| P0 count | P0 features should be ≤5 per release | Warning |
| Invalid values | Priority column must not contain: Must, Should, Could, Won't | Critical |

## E. Output Report Format

```markdown
# PRD Validation Report

**File**: {filename}
**Version**: {version}
**Date**: {YYYY-MM-DD}

## Overview
Critical: {count} | Warning: {count} | Info: {count}

## Critical (Blocking)

1. **Location**: {chapter/section}
   **Issue**: {description}
   **Fix**: {suggestion}

## Warning (Recommendations)

1. **Location**: {chapter/section}
   **Issue**: {description}
   **Fix**: {suggestion}

## Info (Informational)

1. **Location**: {chapter/section}
   **Issue**: {description}
   **Suggestion**: {recommendation}

## Overall Score: {X.X}/10
```

**Scoring formula**: `max(0, 10 - Critical×2 - Warning×0.5 - Info×0.2)`
