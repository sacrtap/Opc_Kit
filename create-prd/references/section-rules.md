# Chapter Internal Rules Summary

## user-story Rules

### Sentence Structure Mandatory

Each user story must use the format: "As a {user type}, I want {action} so that {benefit}"

**Why**: Standard format ensures each story has clear actor, action, and value. Non-standard stories are hard to trace and test.

**Example**:
```
✅ As a broker, I want to add frequently-used floor plans to favorites so that I can quickly call them next time without repeated searching
❌ "Broker can favorite floor plans" (missing value statement)
```

### Acceptance Criteria

Each user story must have at least one acceptance criterion:
- Format: `- [ ] {testable condition}`
- Must contain quantifiable/executable judgment conditions
- Cannot use vague descriptions: "normal", "friendly", "obvious"

### Bidirectional Traceability

| Direction | Rule | Validation Method |
| --------- | ---- | ----------------- |
| US→FR | Each US must be implemented by at least one F-x.x | Check if each US-ID appears in at least one feature's "Corresponding User Story" column |
| FR→US | Each F-x.x must respond to at least one US | Check if each feature's "Corresponding User Story" references an existing US-ID |

**Why**: Bidirectional traceability ensures no requirements are missed and no features are over-designed.

## feature-detail Rules

### Required Fields for Each F-x.x

Each feature detail section must contain:

| Field | Description | Example |
| ----- | ----------- | ------- |
| Feature Description | What this feature does | "Add floor plan to favorites from search results" |
| Trigger Condition | When this feature is triggered | "User clicks favorite button on search results page" |
| Interaction Description | Step-by-step interaction logic | Bullet list or numbered steps |
| Acceptance Criteria | Testable conditions | `- [ ] Click favorite button, icon changes within 1 second` |

### Acceptance Criteria Testability

Each acceptance criterion must pass the "stranger test": a person unfamiliar with the feature can execute the criterion and judge pass/fail.

**Examples**:
```
✅ [ ] Click favorite button, icon changes from hollow to solid star within 1 second
✅ [ ] After favorite success, Toast shows "Favorited", auto-dismisses after 2 seconds
❌ [ ] Favorite button displays normally (what is "normal"?)
❌ [ ] User experience is friendly (how to measure "friendly"?)
```

### Scenario Behavior Table

For complex features, include a scenario behavior table:

| Scenario | Pre-condition | Operation | Expected Result |
| -------- | ------------- | --------- | --------------- |
| First favorite | No favorites | Click favorite button | Icon changes, Toast shows, data saved |
| Duplicate favorite | Already favorited | Click favorite button again | Toast shows "Already favorited", no duplicate data |
| Cancel favorite | Already favorited | Click cancel button | Confirmation dialog, removes from list |

## risk-dependency Rules

### Technical Risks (10.1)

| Field | Description | Example |
| ----- | ----------- | ------- |
| Risk ID | R-{N} sequential numbering | R-1, R-2 |
| Risk Description | Specific risk description, not vague | "Floor plan search API response time > 2s under high concurrency" |
| Impact Level | High/Medium/Low | High |
| Mitigation Measure | Specific, actionable plan | "Load test before launch, confirm API response < 500ms" |

### External Dependencies (10.2)

| Field | Description | Valid Values |
| ----- | ----------- | ------------ |
| Dependency ID | D-{N} sequential numbering | D-1, D-2 |
| Dependency Item | What is depended on | "Sensors Analytics tracking integration" |
| Dependent Party | Who/what provides it | "Data Team" |
| Impact | What happens if delayed | "Tracking events cannot be collected" |
| Schedule Status | Current status | pending-review / pending-confirm / confirmed / completed / blocked |

**Why**: Schedule status field is mandatory so reviewers can quickly identify blocking dependencies.

### Known Limitations (10.3)

| Field | Description | Example |
| ----- | ----------- | ------- |
| Limitation ID | L-{N} sequential numbering | L-1, L-2 |
| Limitation Description | What is not supported | "Favorites categorization not supported in this release" |
| Impact Scope | Who is affected | "Users with many favorites" |
| Resolution Plan | When/how to resolve | "Listed as F-1.5, added in v1.1" |

## Problem Table Rules (Chapter 1)

### Specific Problems Table

| Field | Description | Example |
| ----- | ----------- | ------- |
| # | Sequential numbering | 1, 2, 3 |
| Problem | Specific problem description | "High-frequency floor plans cannot be quickly reused, re-searched each time" |
| User Feedback | Direct user quote or observation | "I have to search for the same communities every day" |
| Severity | P0/P1/P2 | **P0** |

**Why**: Problem table with user feedback makes the problem real, not imagined.

## Goal Definition Rules (Chapter 2)

### Success Metrics Table

| Field | Description | Example |
| ----- | ----------- | ------- |
| Metric | Specific metric name | "Average floor plan search time" |
| Current Baseline | Current measured value | "1-2 minutes" |
| Target | Quantifiable target | "< 1 minute" |
| Measurement Method | How to measure | "Tracking statistics" |

**Why**: Metrics without baselines and targets are slogans, not goals.

### Counter-metrics Suggestion

When success metrics are defined, suggest counter-metrics to prevent optimization side effects:

| Success Metric | Suggested Counter-metric |
| -------------- | ------------------------ |
| Search time < 1 minute | Search result accuracy (don't sacrifice accuracy for speed) |
| Favorites usage rate > 60% | Favorites removal rate (are users removing bad favorites?) |

## Future Improvement Plan Rules (Chapter 9)

| Field | Description | Example |
| ----- | ----------- | ------- |
| ID | Must continue from main feature numbering (greater than max F-x.x in Chapter 7) | If max is F-1.4, start from F-1.5 or F-2.1 |
| Improvement Item | Feature name | "Favorites folder/tag categorization" |
| Reason | Why not in current release | "Hard to find when many favorites" |
| Priority | P0/P1/P2 — see Feature Priority Definition below | P1 |
| Planned Iteration | Target version | v1.1 |

**Why**: Numbering continuation ensures clear traceability from current features to future plans.

## Feature Priority Definition

All feature priorities must use P0/P1/P2 three-tier system:

| Level | Definition | Meaning |
| ----- | ---------- | ------- |
| **P0** | Critical/Blocking | Feature is unusable without it, must deliver in v1 |
| **P1** | Important | User experience significantly impacted, should deliver in v1 |
| **P2** | Nice-to-have | Better to have, but doesn't block core flow |

**Rules:**
- Do not use Must/Should/Could/Won't as priority labels
- P0 features should be limited (recommend ≤5 per release)
- P2 features can be deferred to future iterations if time is tight

## Decision Log Rules (Auto-generated)

During PRD generation, automatically record every explicit decision made between AI and user:

| Field | Description | Example |
| ----- | ----------- | ------- |
| Decision ID | D-{N} sequential numbering | D-1, D-2 |
| Decision | What was decided | "v1 will not support folder/tag categorization for favorites" |
| Rationale | Why this decision was made | "Low usage frequency in v1, complexity outweighs benefit" |
| Alternatives Considered | What other options were discussed | "Simple tag system, auto-categorization by usage frequency" |
| Status | Decision status | Accepted / Revisited / Deferred |

**Why**: Decision logs provide traceability for why certain design choices were made, prevent re-litigation of settled questions in future updates, and help new team members understand the product's design rationale.

**Placement**: Append as a section after Risks & Dependencies (before Glossary). Numbering continues from main document structure.
