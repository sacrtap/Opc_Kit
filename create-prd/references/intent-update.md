# update Intent Detailed Flow

## Step 1: Read Target PRD File

1. User provides PRD file path
2. Read file, parse the following information:
   - Current metadata (version number, last updated date, status)
   - Existing changelog history (last entry)
   - Existing F-x.x feature list (from Chapter 6 and Chapter 7)
   - Data table field definitions and state enums (from Chapter 7, for later validation)
   - Existing success metrics list (Chapter 2)
   - Existing tracking events list (Chapter 8)

## Step 2: Understand Change Intent

1. Ask/identify scope of this round of changes:
   - New features? Modified interactions? Adjusted metrics? Deleted features?
2. Assess change level:
   - Minor (text/format) → version +0.0.1
   - Medium (feature description/interaction logic/acceptance criteria) → +0.1.0
   - Major (add/remove F-x.x/table structure/core flow) → +1.0.0
3. Confirm change scope and version strategy with user

## Step 3: Execute Changes

1. Modify corresponding chapters per user requirements
2. Auto-sync related chapters:
   - New F-x.x → sync Chapter 6 list, Chapter 7 details
   - Modified data table fields → remind to check flowchart state values
   - Modified success metrics → remind to check tracking traceability
   - Modified user stories → check F-x.x traceability
3. If changes affect flow, proactively ask if flowcharts need updating

## Step 4: Mandatory Changelog Generation [Core Rule, Cannot Skip]

**This step must be completed before saving, otherwise saving is prohibited.**

1. **Draft version number**: auto-infer based on Step 2 change level
2. **Draft author**: infer from conversation context (git config or user self-reference), if none ask once
3. **Draft change content**: auto-summarize this round of changes
   - Verb-first, one sentence per item
   - Sorted by impact scope
   - Example: `Added F-2.13 favorites sharing feature, supports read/edit permission control`
4. **Draft "Key Update Notes" paragraph**:
   - Position: after changelog table, before Chapter 1
   - Content: design intent and impact scope for this update
   - Format reference `assets/changelog-entry-template.md`
5. Show draft to user, require confirmation/correction

## Step 5: Re-run All Strict Validation

Same as create Step 5:

1. US ↔ F-x.x bidirectional traceability
2. Chapter 6 vs Chapter 7 1:1 correspondence
3. Acceptance criteria testability
4. Tracking ↔ success metric traceability
5. Flowchart state values aligned with data tables
6. External dependency schedule status compliance

## Step 6b: Requirements Review (Mandatory)

After PRD update, must execute requirements review process:

1. **First Principles Validation** (5+ questions): validate whether changes solve real problems, have user value, are verifiable
2. **Change Impact Analysis**: trace impact of changes on US→FR→flowchart→tracking→metric full chain
3. **Boundary & Risk Scan**: new risks, new dependencies, new boundary conditions introduced by changes
4. **Over 10 questions**: after 10 rounds, ask user if another deep review round is needed

Review results appended at end of PRD in fixed format (not inserted into main document).

Rules detailed in `references/review-rules.md`

## Step 7: Update Assumption Index + Pending Confirmations

1. Scan newly added `[ASSUMPTION]` tags → append to Chapter 12
2. Check if old assumptions were confirmed/negated by this round of changes → remove confirmed items
3. Generate updated Pending Confirmations table for any new assumptions introduced by this change:

```markdown
## Pending Confirmations (Update)

| #   | Chapter | Assumption        | Impact if Wrong      | Status     |
| --- | ------- | ----------------- | -------------------- | ---------- |
| 1   | Ch.X    | {New assumption}  | {What breaks if wrong} | ⏳ Pending |
```

## Step 8: Save

1. Update Metadata "Last Updated" date and "Version" fields
2. Append changelog entry to end of table
3. Write file, return path
4. Display change summary:
   - Version number change
   - Added/modified/deleted features
   - Strict validation result (pass/warning/fail)

## Changelog Rules

### Mandatory Behavior

- On update launch, **first scan** PRD file to read current version number
- **Auto-draft** changelog entry based on this round of conversation content
- Show draft to user, require confirmation/correction
- **Saving PRD is prohibited before generating changelog entry**

### Version Auto-Increment Strategy

| Change Type | Criteria | Version Change |
| ----------- | -------- | -------------- |
| Minor | Text edits only, typos, format adjustments | v1.5.0 → v1.5.1 |
| Medium | New/modified feature descriptions, adjusted interactions, modified acceptance criteria | v1.5.0 → v1.6.0 |
| Major | Add/remove F-x.x, table structure changes, core flow refactoring | v1.5.0 → v2.0.0 |

### Change Content Auto-Generation Logic

Extract change operations from this round of conversation, format as:

1. Identify operation type: Added/Modified/Deleted/Adjusted
2. Identify target: feature ID (F-x.x), chapter, metric, etc.
3. Identify content: specific change description
4. Format: `{Operation Type} {Target}, {content description}`

Example output:
```
Added F-2.13 favorites sharing feature, supports read/edit permission control
Updated F-2.6 auto-fill logic, added race condition handling branch
Modified success metric: auto-fill adoption rate from >80% to >85%
```
