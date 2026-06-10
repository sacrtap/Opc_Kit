# Update README.md with npx skills update command

## TL;DR

> **Quick Summary**: Add `npx skills update` command to README.md Option 1: Via skills.sh section to help users update installed skills to latest version.
>
> **Deliverables**:
> - README.md: Add update command between install and list commands
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — single file edit

---

## Context

### Original Request
用户要求在 README.md 中增加 npx skills 更新当前技能的命令。

### Problem Analysis
Current README.md Option 1 section only has install commands, missing the update command that users need to refresh skills to latest version.

---

## Work Objectives

### Core Objective
Add `npx skills update` command to README.md in the skills.sh installation section.

### Concrete Deliverables
- README.md lines 74-83: Add update command with descriptive comment

### Definition of Done
- [ ] `npx skills update` command added with comment "# Update installed skills to latest version"
- [ ] Positioned between install commands and list command
- [ ] Format matches existing command style

### Must Have
- Clear, descriptive comment for the update command
- Proper formatting with existing code block style

### Must NOT Have (Guardrails)
- Do NOT modify other sections of README.md
- Do NOT change existing install commands or comments
- Do NOT modify Option 2: Manual Clone section

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: Manual file review

### QA Policy
- Read modified section to verify correct content
- Verify formatting matches existing style

---

## Execution Strategy

### Single Task

```
Wave 1 (Start Immediately):
└── Task 1: Edit README.md — Add npx skills update command
```

---

## TODOs

- [x] 1. Edit README.md — Add npx skills update command

  **What to do**:
  - Locate Option 1: Via skills.sh section (lines 74-83)
  - Add `npx skills update` command with comment "# Update installed skills to latest version"
  - Insert between install commands and list command

  **Must NOT do**:
  - Do NOT modify other sections
  - Do NOT change existing commands

  **Recommended Agent Profile**:
  - **Category**: `quick` — single file edit with clear pattern
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**
  - **Blocked By**: None

  **References**:
  - `README.md:74-83` — Current Option 1 code block to modify

  **Acceptance Criteria**:
  - [x] npx skills update command present
  - [x] Comment reads "# Update installed skills to latest version"
  - [x] Formatting matches existing code block style

  **Commit**: YES
  - Message: `docs(README): add npx skills update command to installation guide`
  - Files: `README.md`
  - Pre-commit: None

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `unspecified-high`
  Verify single file modified, correct command added, no unintended changes.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Read modified section, verify formatting consistency.

---

## Commit Strategy

- **1**: `docs(README): add npx skills update command to installation guide` — README.md

## Success Criteria

### Verification Commands
```bash
# Install all skills
npx skills add sacrtap/Opc_Kit

# Install specific skill
npx skills add sacrtap/Opc_Kit --skill create-prd

# Update specific skill to latest version
npx skills update create-prd

# List available skills before installing
npx skills add sacrtap/Opc_Kit --list
```

### Final Checklist
- [ ] npx skills update command present with correct comment
- [ ] No other sections modified
- [ ] Formatting consistent with existing style
