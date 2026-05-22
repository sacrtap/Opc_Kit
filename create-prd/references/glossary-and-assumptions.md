# Glossary and [ASSUMPTION] Tag Rules

## Glossary Rules

### Definition Standard

A term should be included in the glossary if:
- It is a **domain-specific noun** (not a common word)
- It appears **≥2 times** across chapters
- It may have **ambiguous understanding** among team members

**Why**: Glossary ensures all stakeholders share the same vocabulary, reducing communication costs.

### Definition Format

Each glossary entry must contain:

| Field | Description | Example |
| ----- | ----------- | ------- |
| Term | The term being defined | "Floor Plan" |
| Definition | Clear, concise definition (1-2 sentences) | "A 2D layout diagram of a property, including room dimensions, orientation, and structural elements" |
| First Appeared Chapter | Where the term first appears | Chapter 1 |

### Term Consistency

- Once a term is defined, use the **exact same term** throughout the document
- Do not use synonyms or abbreviations that differ from the glossary entry
- If a new term is introduced later, add it to the glossary

### Candidate Noun Extraction

When auto-generating glossary:
1. Scan all chapters for nouns appearing ≥2 times
2. Filter out common words (user, feature, system, data, etc.)
3. Present candidate list to user for confirmation
4. User confirms which entries to include

## [ASSUMPTION] Tag Rules

### When to Use

Mark content with `[ASSUMPTION: xxx]` when:
- The information was **inferred** rather than explicitly stated by the user
- The information is **not yet confirmed** and needs user validation
- The information is based on **industry norms or best guesses** rather than data

**Examples**:
```
✅ [ASSUMPTION: Brokers search the same floor plan 3+ times per day on average]
✅ [ASSUMPTION: Favorites usage rate target > 60% is reasonable]
❌ [User confirmed: Brokers search 5+ times per day] (no tag needed)
```

### Format

```
[ASSUMPTION: {specific assumption description}]
```

**Why**: Tags make uncertainty visible, so reviewers know what needs validation.

### Assumption Index (Chapter 12)

All [ASSUMPTION] tags must be summarized in Chapter 12:

| Field | Description | Example |
| ----- | ----------- | ------- |
| ID | A-{N} sequential numbering | A-1, A-2 |
| Assumption Description | Full text of the assumption | "Brokers search same floor plan 3+ times per day" |
| Source Chapter | Where the tag appears | Chapter 1 |
| Confirmation Status | To Confirm / Confirmed / Negated | To Confirm |

### Assumption Lifecycle

| Stage | Behavior |
| ----- | -------- |
| Creation | Tagged with `[ASSUMPTION: xxx]` during PRD drafting |
| Tracking | Auto-summarized to Chapter 12 Assumption Index |
| Confirmation | When user confirms, remove tag and update status to "Confirmed" |
| Negation | When user negates, remove tag and update status to "Negated", adjust PRD content accordingly |
| Review | During validate intent, check all assumptions have confirmation status |
