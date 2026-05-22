# PRD Quality Scoring System

## Scoring Rules

After PRD generation and strict validation execution, must output 7-dimension quality score, max 100 points.

### Dimension Definitions

| Dimension                | Weight | Max | Evaluation Content                                       | Scoring Method                                                                 |
| ------------------- | ---- | ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **A. Content Completeness**       | 30%  | 30   | 10-chapter coverage, Metadata field completeness, changelog completeness | Deduct 5 points per missing chapter; Metadata deduct 2 points per missing field; no changelog deduct 3 points |
| **B. Traceability Pass**          | 25%  | 25   | US↔FR bidirectional traceability, Tracking↔Metric↔Calculation method three-way traceability       | Each traceability pass rate × corresponding weight proportion (US→FR 8pts, FR→US 8pts, Tracking↔Metric 5pts, Metric→Calculation Method 4pts) |
| **C. Acceptance Criteria Testability**    | 15%  | 15   | Whether each acceptance criterion contains quantifiable/executable conditions, no fuzzy words      | Testable acceptance criteria count / total acceptance criteria count × 15                                     |
| **D. Flowchart Compliance**        | 15%  | 15   | Whether mermaid exists, syntax correctness, whether exception/failure branches exist | Has chart and syntax correct gets 5 points; each API/dependency node has failure branch gets 5 points; each judgment node has degradation strategy gets 5 points |
| **E. [ASSUMPTION] Coverage** | 10%  | 10   | Whether all inferences are tagged and summarized to assumption index                | Tagged count / actual inference count (≥2 times) × 5; index table summarized gets 5 points                      |
| **F. Review Record Completeness**      | 10%  | 10   | Whether three review steps are executed and fixed format output (First Principles + Logical Completeness + Boundary Risk) | Each completed step gets 3 points, fixed format output gets 1 point                                    |
| **G. Product Thinking Depth**     | 10%  | 10   | Whether Why Now is clear, differentiated value is explicit, user segmentation is reasonable, business value is articulated, risk prediction is comprehensive | Why Now explicit gets 2 points; differentiation clear gets 2 points; user segmentation explicit gets 2 points; business value articulated gets 2 points; risk prediction comprehensive gets 2 points |

**Composite Score = Σ (Dimension Score × Weight)**

### Grade Classification

| Composite Score    | Grade   | Description                                     |
| ----------- | ------ | ---------------------------------------- |
| **90-100**  | Excellent   | Complete content, no traceability breaks, review process executed properly, can directly enter review |
| **75-89**   | Good   | Basically complete,少量 non-critical items pending, recommend quick correction |
| **60-74**   | Pass   | Key chain complete, but multiple items pending confirmation/supplement, needs iteration |
| **<60**     | Pending   | Missing较多 critical content, recommend re-organize before regeneration     |

### Score Output Format

Output score result at end of PRD or separately:

```markdown
## PRD Quality Score

| Dimension                | Weight | Score | Deduction Reason                               |
| ------------------- | ---- | ---- | -------------------------------------- |
| A. Content Completeness       | 30%  | X/30 | {specific deduction reason}                         |
| B. Traceability Pass         | 25%  | X/25 | {specific traceability break point}                       |
| C. Acceptance Criteria Testability | 15%  | X/15 | {untestable entry count}                       |
| D. Flowchart Compliance     | 15%  | X/15 | {missing branch/node count}                      |
| E. [ASSUMPTION] Coverage | 10% | X/10 | {un-tagged inference count / un-summarized count}               |
| F. Review Record Completeness   | 10%  | X/10 | {un-executed review step}                     |
| G. Product Thinking Depth     | 10%  | X/10 | {Why Now / differentiation / user segmentation / business value / risk} |
|                     |      |      |                                        |
| **Composite Score**        | 100% | **XX/100** | **Grade: Excellent/Good/Pass/Pending**      |
```

### Dimension Detailed Scoring Standards

#### A. Content Completeness (30 points)

| Check Item                       | Points | Deduction Rule                          |
| ---------------------------- | ---- | --------------------------------- |
| Chapters 1-10 all present           | 20   | Deduct 5 points per missing chapter                 |
| Metadata 8 fields complete          | 5    | Deduct 2 points per missing field, until depleted      |
| Changelog exists and has content         | 5    | No changelog deduct 3 points; empty record deduct 1 point   |

#### B. Traceability Pass (25 points)

| Trace Item           | Points | Calculation Method                                       |
| ---------------- | ---- | ---------------------------------------------- |
| US→FR pass rate | 8    | Pass rate × 8                                     |
| FR→US pass rate | 8    | Pass rate × 5                                     |
| Tracking↔Metric      | 5  | Average of both directional pass rates × 5                             |
| Metric→Calculation Method  | 4    | Pass rate × 4                                     |

#### C. Acceptance Criteria Testability (15 points)

| Check Item                         | Points | Scoring Method                                   |
| ------------------------------ | ---- | ------------------------------------------ |
| Fuzzy word blacklist detection               | -    | Each acceptance criterion hitting blacklist words marked as untestable |
| Testable judgment conditions                 | 15   | Testable count / total acceptance criteria count × 15               |

**Fuzzy Word Blacklist**: `works normally`, `user-friendly`, `runs stably`, `friendly`, `displays normally`, `smooth operation`, `user satisfied`, `aesthetic`, `intuitive`

#### D. Flowchart Compliance (15 points)

| Check Item                              | Points | Scoring Method                               |
| ----------------------------------- | ---- | ------------------------------------------ |
| At least 1 mermaid chart, syntax compliant      | 5    | Has chart and syntax correct gets 5 points, otherwise 0 points           |
| Each API/dependency node has failure/timeout branch      | 5    | Deduct 2 points per missing failure branch, until depleted       |
| Each judgment node has degradation/retry strategy         | 5    | Deduct 2 points per missing degradation strategy, until depleted       |

#### E. [ASSUMPTION] Coverage (10 points)

| Check Item                                 | Points | Scoring Method                               |
| -------------------------------------- | ---- | ------------------------------------------ |
| Whether inferred content is tagged with `[ASSUMPTION]`     | 5    | Tagged count / actual inference count × 5                |
| Whether assumption index table summarizes all `[ASSUMPTION]`  | 5    | Complete summary gets 5 points, deduct 2 points per missed entry       |

#### F. Review Record Completeness (10 points)

| Check Item                               | Points | Scoring Method                           |
| ------------------------------------ | ---- | -------------------------------------- |
| First Principles Validation executed               | 3    | Fixed format output gets 3 points                     |
| Logical Completeness Review executed               | 3    | Fixed format output gets 3 points                     |
| Boundary & Risk Scan executed               | 3    | Fixed format output gets 3 points                     |
| Review record fixed format complete             | 1    | Format correct (includes traceability pass rates, etc.) gets 1 point        |

#### G. Product Thinking Depth (10 points)

| Check Item                     | Points | Scoring Standard                               |
| -------------------------- | ---- | -------------------------------------- |
| Why Now is clear           | 2    | Clear articulation of problem urgency and time window gets 2 points   |
| Differentiated value is explicit         | 2    | Clear explanation of differences from existing solutions or competitors gets 2 points |
| User segmentation is reasonable           | 2    | Target users and secondary users have priority distinction gets 2 points   |
| Business value is articulated           | 2    | Explains business收益 or efficiency improvement gets 2 points |
| Risk prediction is comprehensive           | 2    | Identifies ≥2 types of technical risks with mitigation plans gets 2 points |
