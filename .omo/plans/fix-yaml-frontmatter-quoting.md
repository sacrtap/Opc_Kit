# Fix: YAML Frontmatter Quoting for create-prd PRD

## TL;DR

> **Quick Summary**: Wrap all YAML frontmatter values in double quotes to prevent YAML parsing errors when values contain colons or other special characters.
>
> **Deliverables**:
> - `assets/prd-template.md`: All frontmatter values quoted
> - `SKILL.md`: Metadata inference section updated with quoted values
> - `references/intent-create.md`: Metadata auto-inference section updated
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — sequential (dependent edits)

---

## Work Objectives

### Core Objective
Prevent YAML parsing errors by wrapping all frontmatter values in double quotes in PRD templates and generation instructions.

### Concrete Deliverables
- `assets/prd-template.md` lines 1-10: All values quoted
- `SKILL.md` Step 2: Metadata instruction updated
- `references/intent-create.md` Step 2: Metadata table updated

### Definition of Done
- [ ] All PRD frontmatter values wrapped in double quotes
- [ ] Generation instructions specify quoted format
- [ ] Template renders correctly when validated as YAML

### Must Have
- Double quotes around all frontmatter values (title, status, created, updated, version, project, related_docs, prototype)
- Examples use quoted format

### Must NOT Have (Guardrails)
- Do NOT change field names
- Do NOT change frontmatter structure or order
- Do NOT modify content outside frontmatter

---

## Execution Strategy

### Sequential Tasks

```
Wave 1:
├── Task 1: Edit prd-template.md — Quote all frontmatter values
├── Task 2: Edit SKILL.md — Update Metadata generation instructions
└── Task 3: Edit intent-create.md — Update Metadata auto-inference table

Wave FINAL:
├── Task F1: Plan compliance audit
└── Task F2: Code quality review
```

---

## TODOs

- [x] 1. Edit prd-template.md — Quote All Frontmatter Values

  **What to do**:
  - Edit `assets/prd-template.md` lines 1-10
  - Wrap all values in double quotes:
    ```yaml
    ---
    title: "PRD: {Product Name} - {Feature Name}"
    status: "Draft"
    created: "{YYYY-MM-DD}"
    updated: "{YYYY-MM-DD}"
    version: "v1.0.0"
    project: "{Project Name}"
    related_docs: "None"
    prototype: "None"
    ---
    ```

  **Must NOT do**:
  - Do NOT change field names
  - Do NOT change frontmatter order or structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:
  - `assets/prd-template.md:1-10` — Current unquoted frontmatter

  **Acceptance Criteria**:
  - [ ] All 8 frontmatter values wrapped in double quotes
  - [ ] Front matter structure (---, field names, order) unchanged

  **Commit**: YES
  - Message: `fix(create-prd): quote all YAML frontmatter values to prevent parsing errors`
  - Files: `create-prd/assets/prd-template.md`

- [x] 2. Edit SKILL.md — Update Metadata Generation Instructions

  **What to do**:
  - Locate "Step 2: Metadata Auto-Inference" section
  - Update the Metadata table examples to show quoted values
  - Ensure any examples of frontmatter output use quoted format

  **Must NOT do**:
  - Do NOT change field names or structure
  - Do NOT modify other sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None needed
  - **Blocked By**: Task 1

  **References**:
  - `SKILL.md` — Search for "Metadata" / "frontmatter" / "yaml" sections
  - `assets/prd-template.md` (after Task 1) — New quoted template format

  **Acceptance Criteria**:
  - [ ] Metadata generation examples show quoted values
  - [ ] Instructions reference quoted format

  **Commit**: YES
  - Message: `fix(create-prd): update SKILL.md metadata instructions to use quoted YAML values`
  - Files: `create-prd/SKILL.md`

- [x] 3. Edit intent-create.md — Update Metadata Auto-Inference Table

  **What to do**:
  - Locate Step 2: Metadata Auto-Inference section
  - Update the inference strategy table to show quoted values
  - Ensure examples use double quotes around values

  **Must NOT do**:
  - Do NOT change inference logic
  - Do NOT modify other steps

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `references/intent-create.md` — Step 2 Metadata Auto-Inference section
  - `SKILL.md` (after Task 2) — Updated format

  **Acceptance Criteria**:
  - [ ] Metadata table shows quoted value examples
  - [ ] Consistent with prd-template.md and SKILL.md

  **Commit**: YES
  - Message: `fix(create-prd): update intent-create.md metadata examples to use quoted YAML values`
  - Files: `create-prd/references/intent-create.md`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Verify all 3 files modified correctly, all values quoted, no structure changes.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Read all 3 modified files. Verify quoting consistency across all frontmatter examples.

---

## Commit Strategy

- **1**: `fix(create-prd): quote all YAML frontmatter values to prevent parsing errors` — prd-template.md
- **2**: `fix(create-prd): update SKILL.md metadata instructions to use quoted YAML values` — SKILL.md
- **3**: `fix(create-prd): update intent-create.md metadata examples to use quoted YAML values` — intent-create.md

## Success Criteria

### Verification Commands
```bash
grep -n '"Draft"' create-prd/assets/prd-template.md   # Should find quoted status
grep -n '"v1.0.0"' create-prd/assets/prd-template.md  # Should find quoted version
grep -rn 'title.*:.*PRD' create-prd/SKILL.md           # Should NOT find unquoted title
```

### Final Checklist
- [ ] All 3 files modified with consistent quoting
- [ ] No frontmatter structure changes
- [ ] All examples show quoted format
