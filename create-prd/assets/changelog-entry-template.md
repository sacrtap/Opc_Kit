# Changelog Entry Template

## Entry Format

```markdown
| {YYYY-MM-DD} | v{X}.{Y}.{Z} | {Author} | {Change description} |
```

## Version Auto-Increment Rules

| Change Type | Criteria | Version Change |
| ----------- | -------- | -------------- |
| Minor | Text edits, typos, format adjustments only | v1.5.0 → v1.5.1 |
| Medium | New/modified feature descriptions, interaction changes, acceptance criteria updates | v1.5.0 → v1.6.0 |
| Major | Add/remove F-x.x, table structure changes, core flow refactoring | v1.5.0 → v2.0.0 |

## Change Content Format

Extract change operations from conversation, format as:

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

## Key Update Notes

Position: after changelog table, before Chapter 1

Content: design intent and impact scope for this update

Format:
```markdown
## Key Update Notes

This update aims to {design intent}. Main impact scope:

- {Impact 1}
- {Impact 2}
- {Impact 3}
```
