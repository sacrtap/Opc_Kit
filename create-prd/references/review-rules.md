# Requirements Review Rules

## Trigger Timing

Regardless of fast or coaching mode, after PRD draft output, **must** execute the requirements review process.

## Incremental Review Mode (Deduplication)

Review questions are adjusted based on what was already confirmed in Phase 0:

| Phase 0 Status | Review Behavior |
| -------------- | --------------- |
| ✅ Confirmed in Phase 0 | Mark ✅ in review output, skip asking user again |
| ⚠️ [ASSUMPTION] tagged | Prioritize in review, ask user to confirm explicitly |
| ❌ Not covered in Phase 0 | Ask normally as new question |

**Why**: Re-asking already-confirmed questions wastes user time and creates frustration. Review should focus on gaps and assumptions, not re-verify confirmed facts.

## Review Process

### Step 1: First Principles Validation (5+ Questions)

Return to essentials, ask the following core questions one by one. **Skip questions for items already confirmed in Phase 0.**

| # | Question | Validation Standard | Failure Handling | Phase 0 Cross-ref |
| - | -------- | ------------------- | ---------------- | ----------------- |
| 1 | **Who is the user?** | Target user is clear, describable, with specific persona | Mark [ASSUMPTION], ask for confirmation | Target User field |
| 2 | **What do they want?** | User stories cover real scenarios, not imagined needs | List missing user stories | Core Problem field |
| 3 | **Why now?** | Problem urgency is valid (Why Now), is there a time window | Mark [ASSUMPTION], ask for confirmation | Not in Phase 0 — always ask |
| 4 | **Why your solution?** | Differentiated value is clear, difference from existing solutions | List competitive comparison or differentiation | Current Baseline field |
| 5 | **How do you know you got it right?** | Success metrics are quantifiable, actionable, with baseline and target | Supplement quantified metrics or mark [ASSUMPTION] | Success Metric field |

**Extended Questions (6-10+, supplement based on product complexity, at least 5):**

6. **What is the leverage effect of this feature?** — Does a small change bring large returns (LNO framework)
7. **If you cut 50% of features, what remains?** — Validate if MoSCoW priority is reasonable
8. **What if users don't use it as expected?** — Is there a degradation plan or alternative path
9. **What is the biggest technical risk?** — Is there technical feasibility validation
10. **If the project fails in 3 months, what went wrong?** — Pre-mortem

### Step 2: Logical Completeness Review

Walk through the full-chain traceability:

```
Problem Description → Goal Definition → User Stories → Feature List → Flowchart → Tracking → Success Metrics
```

**Traceability Rules:**

| Trace Direction | Rule | Pass Rate Required |
| --------------- | ---- | ------------------ |
| US→FR | Each user story implemented by at least one feature | 100% |
| FR→US | Each feature responds to at least one user story | 100% |
| Tracking→Metric | Each tracking event serves at least one success metric | 100% |
| Metric→Calculation Method | Each success metric has corresponding calculation method in section 8.3 | 100% |
| Metric→Problem | Each success metric can answer "did we solve the pain point" | 100% |

**Break Point Detection:**
- Check if each step connects to the previous one
- Any features without corresponding user stories (over-design)
- Any user stories without corresponding features (requirements gap)
- Any tracking events without corresponding success metrics (invalid tracking)
- Any success metrics without corresponding tracking events (unverifiable)
- Any success metrics without corresponding calculation methods (unmeasurable)

### Step 3: Boundary & Risk Scan

Proactively ask user about these 4 categories of boundary conditions:

| Category | Probe Question | Example |
| -------- | -------------- | ------- |
| Exception Flows | "What happens if user's X operation fails?" | Network disconnect during favorite, storage full |
| Boundary Conditions | "How many favorites max? What about concurrent calls?" | Favorite limit, concurrent call limit, data volume |
| External Dependencies | "Which external interface isn't connected yet? Is there a backup plan?" | Maps API, user permission system, sharing service |
| Uncontrollable Factors | "What if users don't use it as expected?" | Users favorite 1000+ floor plans, sharing permission abuse |

### Handling Over 10 Questions

When the number of questions exceeds 10, after completing 10 rounds ask the user:

> "Completed 10 rounds of review questions. Do you need another deep review round? (yes/no)"

User selects yes → continue next round of questions (max 20)
User selects no → end review, output review record

## Output Format

Review results are appended at the end of the PRD in fixed format (not inserted into main document):

```markdown
## Review Record

### First Principles Validation
- Who is the user: ✅ Clear / ❓ To confirm (with [ASSUMPTION] list)
- What do they want: ✅ Covered / ❓ Missing (list missing user stories)
- Why now: ✅ Valid / ❓ In doubt
- Why your solution: ✅ Clear / ❓ Vague
- How do you know you got it right: ✅ Quantifiable / ❓ Subjective
- (Extended questions 6-10+ supplement as needed)

### Logical Completeness
- Break points: (none / list specific broken links)
- US→FR traceability pass rate: X/Y (XX%)
- FR→US traceability pass rate: X/Y (XX%)
- Tracking→Metric traceability pass rate: X/Y (XX%)
- Metric→Calculation method traceability pass rate: X/Y (XX%)
- Metric→Problem traceability pass rate: X/Y (XX%)

### Boundary & Risk
- Exception flows: (list scenarios to supplement)
- Boundary conditions: (list parameters to confirm)
- External dependencies: (list unconfirmed dependencies)
- Uncontrollable factors: (list scenarios to discuss)
```

## Methodology References

| Methodology | Source | Core Idea | Application Scenario |
| ----------- | ------ | --------- | -------------------- |
| First Principles | Elon Musk / Aristotle | Strip away surface appearances, return to irreducible basic facts | Validate if requirement essence is valid |
| Working Backwards | Amazon/PRFAQ | Reverse from user pain points | Ensure requirements start from user perspective |
| YAGNI Principle | XP Extreme Programming | You Ain't Gonna Need It, don't do unnecessary things | Cut over-designed features |
| MoSCoW Priority | DSDM | Must/Should/Could/Won't classification | Ensure v1 only does must-haves |
| Pre-mortem | Shreyas Doshi | Assume project fails in 3 months, reverse-engineer causes | Identify fatal risks in advance |
| LNO Framework | Shreyas Doshi | Leverage/Neutral/Overhead evaluate feature leverage | Judge if feature has enough leverage effect |
| Double Diamond | Design Council | Diverge then converge, ensure multiple solutions explored | Validate if alternative solutions were explored |

## Question Bank (Call as Needed)

### User-Related Questions
- What is the target user's usage scenario? In what environment do they use it?
- What is the user's technical level? Does the usage threshold need to be lowered?
- How large is the user base? Is it an internal tool or accessible to all customers?
- What is the user's current alternative solution? Why not use it?

### Value-Related Questions
- What is the business value brought by this feature?
- If this feature is not built, what will be lost?
- What is the leverage effect of this feature? (small change brings large returns)
- If you cut 50% of features, what remains?

### Technical-Related Questions
- What is the biggest technical risk?
- Is there technical feasibility validation?
- What is the schedule status of external dependencies?
- Is there a backup plan?

### Risk-Related Questions
- What if users don't use it as expected?
- What happens after data volume grows?
- What about concurrent scenarios?
- If the project fails in 3 months, what went wrong?
