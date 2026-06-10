# GitHub Actions CI Auto-Trigger Configuration Plan

## Goal
Update `.github/workflows/prd-validation.yml` to add automatic trigger for PRD validation when test files are modified.

## Scope
- Add `push` and `pull_request` triggers for automated PRD validation
- Maintain existing manual `workflow_dispatch` trigger for on-demand testing
- Do NOT include `docs/specs/` (already gitignored)
- Decide whether to include `create-prd/tests/baseline-prd-en.md` in triggers

---

## Current State Analysis

### ✅ Confirmed File Existence
```bash
create-prd/tests/baseline-prd-en.md  # EXISTS, last commit: 6a0d97b
tests/samples/prd-sample-en.md       # EXISTS, tracked
tests/samples/prd-sample-zh.md       # EXISTS, tracked
```

### ✅ Eval Config Status
```json
{
  "id": 4, "name": "update-with-review",
  "files": ["../tests/baseline-prd-en.md"],
  // ... assertions
},
{
  "id": 5, "name": "validate-existing", 
  "files": ["../tests/baseline-prd-en.md"],
  // ... assertions
}
```

### ⚠️ Current CI Limitation
```yaml
on:
  workflow_dispatch:  # ❌ Only manual trigger!
    inputs:
      prd_path:       # Requires manual input every time
```

---

## Proposed Changes

### Change 1: Add Automatic Triggers

#### Option A: Minimal - Test Samples Only (RECOMMENDED)
```yaml
on:
  push:
    branches: [ main ]
    paths:
      - 'tests/samples/*.md'
      - 'create-prd/tests/baseline-prd-en.md'  # Optional: include if you want baseline changes to trigger
  pull_request:
    branches: [ main ]
    paths:
      - 'tests/samples/*.md'
      - 'create-prd/tests/baseline-prd-en.md'  # Optional
  
  # Keep manual trigger for flexibility
  workflow_dispatch:
    inputs:
      prd_path:
        description: 'Path to the PRD markdown file to validate'
        required: true
        type: string
      fail_on_warning:
        description: 'Treat warnings as failures'
        required: false
        type: boolean
        default: false
```

**Rationale**:
- ✅ `tests/samples/*.md` — Core CI test fixtures (required)
- ✅ `create-prd/tests/baseline-prd-en.md` — Baseline sample used in eval tests (optional but recommended)
- ❌ `docs/specs/*.md` — Already gitignored, local workspace only
- ✅ Manual trigger retained for ad-hoc validation

---

### Change 2: Add Batch Validation Mode (Enhanced)

When triggered by PR or Push, automatically validate **all** test samples:

```yaml
jobs:
  validate-all-samples:
    name: Validate All Test Samples
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Find and validate all test PRDs
        run: |
          echo "Running batch validation on all test PRDs..."
          
          # Validate English sample
          echo "=== Validating tests/samples/prd-sample-en.md ==="
          node create-prd/scripts/validate-prd.js tests/samples/prd-sample-en.md
          
          # Validate Chinese sample
          echo "=== Validating tests/samples/prd-sample-zh.md ==="
          node create-prd/scripts/validate-prd.js tests/samples/prd-sample-zh.md
          
          # Optional: Validate baseline sample
          echo "=== Validating create-prd/tests/baseline-prd-en.md ==="
          node create-prd/scripts/validate-prd.js create-prd/tests/baseline-prd-en.md
          
          echo "✅ All test PRDs validated successfully!"
  
  # Keep manual single-file validation for on-demand use
  validate-single-prd:
    name: Validate Single PRD (Manual Trigger)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    
    needs: []  # No dependency
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Validate PRD file exists
        run: |
          if [ ! -f "${{ inputs.prd_path }}" ]; then
            echo "::error::PRD file not found: ${{ inputs.prd_path }}"
            exit 1
          fi
          echo "Validating: ${{ inputs.prd_path }}"
      
      - name: Run PRD strict validation
        run: |
          node create-prd/scripts/validate-prd.js "${{ inputs.prd_path }}"
      
      - name: Check for warnings (optional strict mode)
        if: inputs.fail_on_warning == true
        run: |
          OUTPUT=$(node create-prd/scripts/validate-prd.js "${{ inputs.prd_path }}" 2>&1)
          if echo "$OUTPUT" | grep -q "Warning"; then
            echo "::warning::PRD validation completed with warnings"
            echo "$OUTPUT"
          fi
```

**Benefits**:
- ✅ Faster CI feedback (all samples validated at once)
- ✅ Clear job separation (batch vs single-file)
- ✅ Maintains backward compatibility

---

### Change 3: Add Pre-commit Hook (Optional Enhancement)

Add local pre-commit hook for developers to catch issues before pushing:

```bash
# .git/hooks/pre-commit (manual installation)
#!/bin/bash
set -e

echo "🔍 Running PRD validation on staged files..."

# Get list of modified/added .md files in tests/samples/
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^tests/samples/.*\.md$' || true)

if [ -n "$FILES" ]; then
  echo "Found ${FILES}"
  
  for FILE in $FILES; do
    echo "Validating: $FILE"
    node create-prd/scripts/validate-prd.js "$FILE" || {
      echo "::error::Validation failed for $FILE"
      exit 1
    }
  done
  
  echo "✅ All staged PRD files passed validation"
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Detailed Comparison Table

| Aspect                    | Current Config         | Proposed Config (Option A + Batch) | Benefits                               |
| ------------------------- | ---------------------- | ---------------------------------- | -------------------------------------- |
| **Trigger Type**             | Manual only            | Auto + Manual                      | Prevent bad commits from being pushed  |
| **Scope**                   | Single file (input)    | All test samples + Custom file     | Comprehensive coverage                 |
| **Docs Specs Monitoring**   | N/A                    | Excluded                           | Correctly respects .gitignore          |
| **Baseline Sample Monitoring** | N/A                    | Included (optional)                | Catch baseline corruption              |
| **CI Feedback Speed**       | On-demand              | Immediate on push/PR               | Earlier bug detection                  |
| **Developer Experience**    | Good (flexible)        | Better (local + auto checks)       | Pre-commit catches issues locally      |

---

## Implementation Steps

### Step 1: Update `.github/workflows/prd-validation.yml`

Replace current content with:
```yaml
name: PRD Validation

on:
  push:
    branches: [main]
    paths:
      - 'tests/samples/*.md'
      - 'create-prd/tests/baseline-prd-en.md'
  pull_request:
    branches: [main]
    paths:
      - 'tests/samples/*.md'
      - 'create-prd/tests/baseline-prd-en.md'
  
  workflow_dispatch:
    inputs:
      prd_path:
        description: 'Path to the PRD markdown file to validate'
        required: true
        type: string
      fail_on_warning:
        description: 'Treat warnings as failures'
        required: false
        type: boolean
        default: false

jobs:
  validate-all-samples:
    name: Validate All Test Samples
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Validate test PRDs
        run: |
          for file in tests/samples/*.md create-prd/tests/baseline-prd-en.md; do
            if [ -f "$file" ]; then
              echo "=== Validating $file ==="
              node create-prd/scripts/validate-prd.js "$file" || exit 1
            fi
          done
          echo "✅ All test PRDs passed validation"
  
  validate-single-prd:
    name: Validate Single PRD (Manual)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Validate PRD file exists
        run: |
          if [ ! -f "${{ inputs.prd_path }}" ]; then
            echo "::error::PRD file not found: ${{ inputs.prd_path }}"
            exit 1
          fi
          echo "Validating: ${{ inputs.prd_path }}"
      
      - name: Run PRD strict validation
        run: |
          node create-prd/scripts/validate-prd.js "${{ inputs.prd_path }}"
      
      - name: Check for warnings (strict mode)
        if: inputs.fail_on_warning == true
        run: |
          OUTPUT=$(node create-prd/scripts/validate-prd.js "${{ inputs.prd_path }}" 2>&1)
          if echo "$OUTPUT" | grep -q "Warning"; then
            echo "::warning::PRD validation completed with warnings"
            echo "$OUTPUT"
          fi
```

### Step 2: Commit and Push
```bash
git add .github/workflows/prd-validation.yml
git commit -m "ci(prd-validation): add automatic trigger for test sample validation

- Add push/pull_request triggers for tests/samples/*.md
- Include create-prd/tests/baseline-prd-en.md in trigger paths
- Add batch validation job for all test samples
- Retain manual workflow_dispatch for on-demand validation
- Exclude docs/specs/ (already .gitignored)"
git push origin main
```

---

## Additional Recommendations

### Recommendation 1: Add CI Workflow Badge to README

```markdown
[![PRD Validation](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml/badge.svg)](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml)
```

### Recommendation 2: Add Status Dashboard

Create a simple Markdown file `CI-STATUS.md` showing recent validation results:

```markdown
# CI Validation Status

## Latest Results
| Date       | Job Status | Samples Validated | Failures |
|------------|-----------|------------------|----------|
| 2026-06-10 | ✅ Pass   | 3                | 0        |
| 2026-06-09 | ✅ Pass   | 3                | 0        |

## How to View Logs
See [GitHub Actions → PRD Validation](https://github.com/sacrtap/Opc_Kit/actions/workflows/prd-validation.yml)
```

### Recommendation 3: Add Environment Variable for Strict Mode

Allow users to set default strict mode in repository settings:

```yaml
env:
  FAIL_ON_WARNING: ${{ secrets.FAIL_ON_WARNING }}  # Set in repo Settings > Secrets
```

Then in step:
```yaml
if: env.FAIL_ON_WARNING == 'true' && inputs.fail_on_warning == ''
```

---

## Risk Assessment

| Risk                          | Probability | Impact | Mitigation                             |
| ----------------------------- | ----------- | ------ | -------------------------------------- |
| False positives from script bugs | Low         | Medium | Script is stable (validated 2026-06-08)|
| Slow CI due to batch validation | Low         | Low    | Only 3 small files, ~5s total        |
| Docs/Specs interference       | None        | None   | Properly excluded via path filter     |
| Baseline drift                | Low         | Medium | Monitoring included in trigger paths  |

---

## Success Criteria

- ✅ PRs containing invalid PRDs are rejected by CI
- ✅ All 3 test samples pass validation on every commit
- ✅ Manual trigger still works for arbitrary file validation
- ✅ No breaking changes to existing workflow functionality

---

## Next Actions

1. Confirm approval of this configuration plan
2. I will implement the actual file changes
3. Test in PR environment before merging
4. Monitor first few runs for any issues
