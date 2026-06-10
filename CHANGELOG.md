# Changelog

All notable changes to the create-prd skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.2] - 2026-06-10

### Changes
- **Final Cleanup Policy**: PRD YAML front matter is now temporary generation state, not part of final document
- **validate-prd.js**: Check #15 updated to detect cleanup status; added check #18 for Metadata table completeness
- **Backward Compatibility**: Old PRDs with front matter still pass validation (warning only)

### Migration Guide
- **Existing PRDs**: No action required, but recommended to cleanup front matter manually
- **New PRDs**: Front matter automatically removed after generation completes
- **Checkpoint Recovery**: Still works during generation; checkpoint preserved until all batches complete

### Technical Details
- Front matter during generation: Contains `generate_progress` for checkpoint tracking
- Front matter after completion: Removed entirely
- Business metadata: Lives only in `## Metadata` section (8 fields)

## [2.2.1] - 2026-06-10

### Release Documentation
- Updated all public version references to v2.2.1
- Added consolidated technical release notes
- Added CHANGELOG.md for version history
- Added PRD Validation CI badge

### Verified Benchmark Results (v2.2.0 vs v2.1.0 baseline)
- **Coaching mode time reduction**: ~42s → ~11s (**-77%**)
- **Update-with-review mode time reduction**: ~50s → ~10s (**-81%**)
- **validate-existing score improvement**: 16/100 → 78/100 (**+387%**)
- **Quality score average**: 93-97 → 96-98 (**+3 points**)

### New Features Verified
- **Progress notifications**: Real-time feedback during incremental writes (Batch X/5 format)
- **Breakpoint recovery**: Session can resume from checkpoint after interruption
- **Cross-engine Mermaid compatibility**: Consistent rendering across Zed/VS Code/GitHub
- **Language consistency**: Chinese prompt generates pure Chinese PRD (only technical identifiers allowed in English)
- **Platform ecosystem inference**: Zero-interaction auto-inference for iOS/Android/Web platforms
- **Post-update quality re-scoring**: Mandatory 7-dimension quality scoring after each PRD update

### Quality Assurance
- **13-chapter structural completeness**: 92% → 99%
- **Test coverage**: 10 typical scenarios, 30 PRD samples, 97 automated assertions
- **Assertion pass rate**: 100% (97/97)

### Documentation
- Updated README.md and README-CN.md with v2.2.1 version references
- Added PRD Validation CI badge to README.md

## [2.2.0] - 2026-06-09

### Major Features
- **Cross-engine Mermaid rules**: Prohibited ASCII double quotes, circle nodes `((text))`, and HTML `<br/>` tags
- **Progress Notification Rules**: 5-batch incremental write with real-time progress tracking
- **Checkpoint & Recovery**: `generate_progress` YAML checkpoint tracking for session interruption recovery
- **Post-Update Quality Re-scoring**: Mandatory quality rescoring after every PRD update
- **Model failure automatic retry**: Automatic fallback to kimi-k2.5 when qwen3.6-plus quota exhausted
- **Language detection and title translation mapping**: Auto-detect user language and adapt PRD output
- **Platform ecosystem inference**: Zero-interaction platform inference from user input

### Testing
- **iteration-3 benchmark**: 10 test cases, 30 PRD files, 97 assertions all passed
- **Three-way comparison**: with_skill (v2.2.0) vs baseline (v2.1.0) vs without_skill
- **Quality validation**: All 6 new features verified through comprehensive test suite

### Known Issues
- Coaching mode may hang when waiting for user response without timeout mechanism

## [2.1.0] - 2026-06-04

### Features
- Baseline version with 13-chapter PRD template
- Coaching and Fast mode workflows
- US↔FR bidirectional traceability
- 7-dimension quality scoring system
- Cross-platform agent compatibility (OpenCode, Claude Code, Cursor, Codex)

### Testing
- **iteration-1 benchmark**: 10/10 test cases passed
- **Quality score average**: 96.25/100 (4 create-type tests)
- **PRD volume increase**: 111% larger than without-skill baseline

---

## Version History Summary

| Version | Release Date | Key Improvements |
|---------|--------------|------------------|
| 2.2.1   | 2026-06-10 | Documented v2.2.0 benchmark results, release notes, CI validation |
| 2.2.0   | 2026-06-09 | Cross-engine Mermaid, Progress notifications, Checkpoint recovery |
| 2.1.0   | 2026-06-04 | Initial release with coaching/fast modes |
