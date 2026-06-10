# Fix: Unified [ASSUMPTION] Confirmation Gate

## TL;DR

> **Quick Summary**: Fix the scattered [ASSUMPTION] confirmation flow — consolidate ALL unconfirmed items (key assumptions + non-key inferences + self-review gaps) into a single structured list presented AFTER all 5 batches are written, before final validation and save.
>
> **Deliverables**:
> - `references/intent-create.md`: Step 3b rewritten as unified confirmation gate
> - `SKILL.md`: Core Principle 17 updated to match unified list behavior
> - Verify consistency across intent-update.md (if applicable)
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO — sequential (3 tasks)

---

## Context

### Original Request
用户反馈："假设索引中的未完成确认项没有在PRD完成的环节全部向进行提问"

### Problem Analysis
Current flow in `intent-create.md`:
1. **Step 1**: Autonomous inference draft + 5-batch write (no user interaction)
2. **Step 2**: Conditional interaction — only asks about **key assumptions** missing during generation
3. **Step 3b**: "Reverse Questions" — lists remaining `[ASSUMPTION]` tags (non-key inferences only)

**Bug**: Step 3b says "After all key assumptions are confirmed" and only lists non-key items. Key assumptions confirmed in Step 2 are NOT re-presented in the final list. This means:
- User might miss reconfirming key assumptions in context of the full PRD
- The confirmation is scattered across Step 2 and Step 3b instead of being a single gate
- No unified view of ALL pending items before save

### User's Intent (from memory)
- All `[ASSUMPTION]` items must be confirmed by user before PRD marked as Confirmed
- Unconfirmed items → status stays `Draft (Pending Confirmation)`
- Support batch "Accept All" confirmation
- PRD cannot be saved as "Approved" or "In Development" with unconfirmed items

---

## Work Objectives

### Core Objective
Consolidate all unconfirmed items into a single structured confirmation gate presented AFTER all 5 batches are written, ensuring no assumption slips through unreviewed.

### Concrete Deliverables
- `references/intent-create.md` Step 3b: Unified confirmation gate with table format
- `SKILL.md` Core Principle 17: Updated description to match unified list behavior
- Consistency check: `references/intent-update.md` (if it has similar confirmation flow)

### Definition of Done
- [ ] `intent-create.md` Step 3b presents ALL unconfirmed items in single table
- [ ] Table columns: #, Content, Chapter, Impact if Wrong, Status, Correction/Reason
- [ ] "Accept All" batch option included
- [ ] Status management rules explicit (Pending Confirmation → Confirmed)
- [ ] `SKILL.md` Core Principle 17 references unified list (not "reverse questions")
- [ ] No scattered confirmation logic in other steps

### Must Have
- All unconfirmed items (key + non-key + self-review gaps) in ONE list
- Table format with Impact if Wrong column
- Accept/Reject/Defer options per item
- "Accept All" batch option
- Status management rules

### Must NOT Have (Guardrails)
- Do NOT change the 5-batch write logic
- Do NOT change Step 1 autonomous inference
- Do NOT change Step 2 conditional interaction (still useful for real-time clarification)
- Do NOT modify mermaid-rules.md, scoring-rules.md, section-rules.md (out of scope)
- Do NOT change the PRD template structure

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test framework for skill logic)
- **Automated tests**: None (skill logic changes)
- **Agent-Executed QA**: Manual review of modified files

### QA Policy
- Read modified files to verify correct content
- Cross-check consistency between intent-create.md and SKILL.md
- Verify no other files reference "Reverse Questions" with old logic

---

## Execution Strategy

### Sequential Tasks (dependencies: each builds on previous)

```
Wave 1 (Start Immediately):
├── Task 1: Edit intent-create.md Step 3b → unified confirmation gate
├── Task 2: Edit SKILL.md Core Principle 17 → match unified list behavior
└── Task 3: Consistency check across intent-update.md + other references

Wave FINAL:
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Manual review of confirmation flow logic
└── Task F4: Scope fidelity check
```

---

## TODOs

- [x] 1. Edit intent-create.md Step 3b — Unified Confirmation Gate

  **What to do**:
  - Replace current "Reverse Questions" section (lines 84-110) with unified confirmation gate
  - New section title: `### Step 3b: 强制确认关卡 — 统一提问所有未完成确认项`
  - Include unified table format with columns: #, Content, Chapter, Impact if Wrong, Status, Correction/Reason
  - Include "Accept All" batch option with usage examples
  - Include status management rules (Pending Confirmation → Confirmed)
  - Add explanation: "Why unified list matters"

  **Must NOT do**:
  - Do NOT modify Step 1 or Step 2
  - Do NOT change 5-batch write logic
  - Do NOT modify other sections

  **Recommended Agent Profile**:
  - **Category**: `quick` — single file edit with clear pattern
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete before SKILL.md update)
  - **Sequential**
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:
  - `references/intent-create.md:84-110` — Current Step 3b "Reverse Questions" section (REPLACE this)
  - `viking://user/opencode/memories/events/2026/06/04/prd技能规则优化.md` — Original optimization intent (确认关卡要求)
  - `viking://user/opencode/memories/entities/skill/create-prd.md` — 强制反馈循环规则详情

  **Acceptance Criteria**:
  - [x] Step 3b title changed to unified confirmation gate
  - [x] Table format with 6 columns present
  - [x] "Accept All" option with example syntax
  - [x] Status management rules included
  - [x] "Why unified list matters" explanation present

  **QA Scenarios**:

  ```
  Scenario: Verify unified table format
    Tool: Read
    Steps:
      1. Read intent-create.md lines 84-150
      2. Check Step 3b contains table with columns: #, 内容, 对应章节, 错误影响, 确认状态, 修正/原因
    Expected Result: Table format matches specification
    Evidence: File content screenshot or excerpt

  Scenario: Verify Accept All batch syntax
    Tool: Read
    Steps:
      1. Search for "Accept All" or "快捷操作" in Step 3b
    Expected Result: Batch confirmation syntax example present (e.g., "Accept 1,2; Modify 3: ...")
    Evidence: Line excerpt
  ```

  **Commit**: YES
  - Message: `fix(create-prd): unify all [ASSUMPTION] confirmation into single gate in Step 3b`
  - Files: `create-prd/references/intent-create.md`
  - Pre-commit: None

- [x] 2. Edit SKILL.md Core Principle 17 — Match Unified List Behavior

  **What to do**:
  - Locate Core Principle 17 (currently "Mandatory Feedback Loop")
  - Update to reference "unified confirmation list" instead of "structured list" or "reverse questions"
  - Ensure language matches intent-create.md Step 3b
  - Verify Core Principle 17 mentions: table format, Accept/Reject/Defer options, status management

  **Must NOT do**:
  - Do NOT change other Core Principles
  - Do NOT modify Initial Task List (already correct on item 8)
  - Do NOT modify other sections

  **Recommended Agent Profile**:
  - **Category**: `quick` — targeted single principle update
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Sequential**
  - **Blocked By**: Task 1

  **References**:
  - `SKILL.md:320` — Core Principle 17 current text
  - `references/intent-create.md:84-150` (after Task 1 edit) — New Step 3b content to align with

  **Acceptance Criteria**:
  - [x] Core Principle 17 references "unified confirmation list/table"
  - [x] Mentions Accept/Reject/Defer options
  - [x] Mentions status management (Pending Confirmation → Confirmed)
  - [x] Language consistent with intent-create.md Step 3b

  **QA Scenarios**:

  ```
  Scenario: Verify Core Principle 17 alignment
    Tool: Read
    Steps:
      1. Read SKILL.md lines 315-325
      2. Compare wording with intent-create.md Step 3b
    Expected Result: Both files use consistent terminology for unified confirmation gate
    Evidence: Side-by-side comparison excerpt
  ```

  **Commit**: YES
  - Message: `fix(create-prd): align SKILL.md Core Principle 17 with unified confirmation gate`
  - Files: `create-prd/SKILL.md`
  - Pre-commit: None

- [x] 3. Consistency Check — intent-update.md + Cross-Reference Verification

  **What to do**:
  - Read `references/intent-update.md` for any similar confirmation flow
  - If it references "Reverse Questions" or scattered confirmation, align with unified gate pattern
  - Search all `.md` files in `create-prd/` for "Reverse Questions" references
  - Update any outdated references to point to unified confirmation gate

  **Must NOT do**:
  - Do NOT change intent-update.md update-specific logic (only confirmation section if present)
  - Do NOT modify other reference files

  **Recommended Agent Profile**:
  - **Category**: `quick` — search + targeted edit
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 and 2)
  - **Sequential**
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `references/intent-update.md` — Check for confirmation flow sections
  - All `create-prd/references/*.md` files — search for "Reverse Questions" mentions

  **Acceptance Criteria**:
  - [x] intent-update.md confirmation section aligned (if present)
  - [x] All "Reverse Questions" references updated or confirmed correct
  - [x] No outdated scattered confirmation logic remains

  **QA Scenarios**:

  ```
  Scenario: grep for "Reverse Questions" across all files
    Tool: Bash (grep)
    Steps:
      1. grep -rn "Reverse Questions" create-prd/
      2. Verify no outdated references remain (should only appear in historical context if at all)
    Expected Result: No outdated "Reverse Questions" as primary confirmation mechanism references
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `fix(create-prd): align intent-update.md and clean up outdated references`
  - Files: `create-prd/references/intent-update.md` (if modified)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify all "Must Have" items addressed in TODOs. Check "Must NOT Have" items excluded. Verify acceptance criteria match deliverables.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Read all modified files. Verify edits are clean, no leftover artifacts, consistent terminology. Check no unintended changes to Step 1/Step 2/5-batch logic.

- [x] F3. **Manual Review of Confirmation Flow** — `unspecified-high`
  Trace the full PRD creation flow: Step 1 (inference) → Step 2 (conditional interaction) → Step 3b (unified gate) → Save. Verify all unconfirmed items naturally flow into the unified list.

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify only 3 files modified at most: intent-create.md, SKILL.md, intent-update.md (optional). No changes to mermaid-rules.md, scoring-rules.md, section-rules.md, validate-prd.js, prd-template.md.

---

## Commit Strategy

- **1**: `fix(create-prd): unify all [ASSUMPTION] confirmation into single gate in Step 3b` — intent-create.md
- **2**: `fix(create-prd): align SKILL.md Core Principle 17 with unified confirmation gate` — SKILL.md
- **3**: `fix(create-prd): align intent-update.md and clean up outdated references` — intent-update.md (if applicable)

## Success Criteria

### Verification Commands
```bash
grep -n "统一提问所有未完成确认项" create-prd/references/intent-create.md  # Should find new Step 3b title
grep -n "unified confirmation" create-prd/SKILL.md  # Should find updated Core Principle 17
grep -rn "Reverse Questions" create-prd/  # Should have no primary references (only historical if any)
```

### Final Checklist
- [ ] All "Must Have" present: unified table, Accept All, status management, Accept/Reject/Defer
- [ ] All "Must NOT Have" absent: no changes to Step 1/Step 2/5-batch logic, no scope creep
- [ ] Core Principle 17 aligned with intent-create.md Step 3b
- [ ] No outdated scattered confirmation references remain
