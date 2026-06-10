#!/bin/bash
# Pre-commit hook for PRD validation
# Automatically validates test samples before each commit
#
# Installation:
#   cp scripts/pre-commit-prd-validation.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or run manually:
#   ./scripts/pre-commit-prd-validation.sh

set -e

echo "🔍 Running PRD validation on staged files..."

# Get list of modified/added .md files in tests/samples/
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^tests/samples/.*\.md$' || true)

if [ -n "$FILES" ]; then
  echo "Found PRD files to validate:"
  echo "$FILES"
  echo ""
  
  FAILED=0
  
  for FILE in $FILES; do
    if [ -f "$FILE" ]; then
      echo "=== Validating $FILE ==="
      if ! node create-prd/scripts/validate-prd.js "$FILE"; then
        echo "❌ Validation failed for $FILE"
        FAILED=1
      fi
      echo ""
    fi
  done
  
  if [ $FAILED -eq 0 ]; then
    echo "✅ All staged PRD files passed validation"
    exit 0
  else
    echo "❌ Some PRD validations failed. Please fix before committing."
    exit 1
  fi
else
  echo "No PRD files in tests/samples/ staged for commit. Skipping validation."
  exit 0
fi
