# create Intent Detailed Flow

## Step 1: Intent Recognition + Mode Selection

1. Scan user's first message, detect if mode switch commands are present (fast/coaching keywords)
2. If explicit command present → adopt specified mode directly
3. If not explicitly specified → **default coaching mode**
4. User can switch modes at any time

## Step 2: Metadata Auto-Inference

Auto-infer and fill all Metadata fields from conversation context, only ask uniformly when completely unable to infer.

| Field | Inference Source | Inference Strategy |
| ----- | ---------------- | ------------------ |
| Author | Mentioned in conversation / git config user.name / history session memory | Prioritize author name explicitly mentioned in conversation |
| Status | Fixed | `Draft` |
| Created | System date | Today |
| Last Updated | System date | Today |
| Version | Fixed for new | `v1.0.0` |
| Project | Requirement name / mentioned in conversation | Extract from requirement name in user's first message |
| Related Docs | Default | "None" |
| Prototype | Default | "None" |

**Uniform Ask Rule**: Only when author and project fields are completely unable to be inferred, ask once uniformly:
> "Please fill in the Metadata info: who is the author? what is the project name? (fill 'None' for related docs and prototype if not applicable)"

## Step 3a: fast Mode Flow

1. User pastes large background/requirements → generate full PRD directly
2. Tag inferred content with `[ASSUMPTION: xxx]`
3. After generation, go through chapter by chapter, ask about missing items:
   - Success metric quantified values
   - Acceptance criteria testable conditions
   - Flowchart branch details
   - External dependency schedule status
4. After user confirmation, proceed to Step 4

## Step 3b: coaching Mode Flow (Refactored)

**New flow: First autonomous inference → Conditional interaction → Reverse questions for completion**

### Step 1: Autonomous Inference Draft

Based on user's first message and all visible context, infer content for all chapters from a senior PM perspective:

1. **Deep Reasoning Analysis** (must do before generation):
   - User motivation analysis: What problem does the user really want to solve? What is the underlying business value?
   - Why Now validation: Why build this feature now? Is there a time window?
   - User segmentation: Is the target user profile clear? Are there secondary user groups?
   - Technical feasibility: Is the solution technically viable? What is the biggest risk?
   - Risk matrix: List the top 3 possible risks and mitigation plans

2. **Autonomously infer all chapter content**: Do not ask chapter by chapter, instead complete the draft inference for all 12 chapters at once based on available information

3. **Self-review**: Run the strict validation checklist, checking US↔FR traceability, tracking↔metric traceability, metric→calculation method traceability, etc.

### Step 2: Conditional Interaction

After self-review, decide whether to interact with the user based on the type of issues found:

| Issue Type Found | Handling |
| ------------- | --------- |
| **Key Assumption Missing** (user roles, success metric quantified values, technical constraints, permission scope, data volume) | Must confirm with user, attach 1-3 recommendation options |
| **Uncertainty affects subsequent chapter accuracy** (e.g., trigger mechanism uncertain leading to flowchart design issues) | Complete before proceeding |
| **Non-key Inference** (interaction details, UI style preferences, default parameter values, exception flow handling) | Tag `[ASSUMPTION: xxx]`, don't interrupt, summarize in reverse questions |

**Recommendation Options Rule** (must follow every time a question is asked):
- Attach 1-3 carefully considered recommendation options (no more than 3)
- Each with recommendation reasoning, helping users understand why it's recommended
- Clearly mark "Recommended", guiding users to make choices rather than fill-in-the-blanks
- Example: "For the configuration update trigger method, which do you prefer?
  - **A. Polling (Recommended)**: App periodically (e.g., every 5 minutes) checks for latest config version → Reasoning: Simple to implement, doesn't rely on push infrastructure, suitable for infrequent update scenarios
  - **B. Push method**: Server notifies App via push/WebSocket after config update → Requires additional push service support
  - **C. Hybrid method**: Polling as primary, push as supplement → Suitable for high-frequency update scenarios with high real-time requirements"

### Step 3: Generate PRD Draft + Reverse Questions

After all key assumptions are confirmed, generate the complete PRD draft. Append a "Reverse Questions" section at the end:

```markdown
## Reverse Questions

The following are inferred or pending non-key confirmations that need your review:

1. **[ASSUMPTION]** {Inference 1} — {Follow-up question}
2. **[ASSUMPTION]** {Inference 2} — {Follow-up question}
...

You can say "rewrite chapter X" or "add Y details" for specific chapters.
```

**Rules:**
- Only list unconfirmed [ASSUMPTION] tags (key assumptions already confirmed in interaction, not listed)
- Each question attaches a specific follow-up question, guiding user to confirm
- List content inferred from conversation but not explicitly confirmed by user
- Output PRD quality score (execute per `references/scoring-rules.md`)

## Step 4: Flowchart Generation

1. Identify business scenarios from interaction logic
2. Propose split plan (by scenario/data flow, 8-20 nodes per chart)
3. Generate mermaid code one chart at a time, require user confirmation for each
4. Validate: node count, syntax, state value alignment with data tables

Rules detailed in `references/mermaid-rules.md`

## Step 5: Strict Validation

After generation, automatically run:

1. US ↔ F-x.x bidirectional traceability (list orphaned items)
2. Chapter 6 vs Chapter 7 1:1 correspondence (list missing items)
3. Acceptance criteria testability validation (mark untestable items)
4. Tracking ↔ success metric bidirectional traceability
5. Number of success metrics in Chapter 2 vs calculation methods in section 8.3 1:1 correspondence
6. Flowchart state values aligned with data table fields
7. External dependency schedule status field compliance
8. PRD quality score (7 dimensions)

## Step 6: Requirements Review (Mandatory)

After PRD draft output, must execute requirements review process:

1. **First Principles Validation** (5+ questions): validate user, needs, urgency, differentiation, success metrics one by one
2. **Logical Completeness Review**: full-chain traceability (problem→goal→US→FR→flowchart→tracking→metric→calculation method)
3. **Boundary & Risk Scan**: exception flows, boundary conditions, external dependencies, uncontrollable factors
4. **Over 10 questions**: after completing 10 rounds, ask user if another deep review round is needed

Review results appended at end of PRD in fixed format (not inserted into main document).

Rules detailed in `references/review-rules.md`

## Step 7: Glossary + Assumption Index Auto-Generation

1. Scan document, extract domain nouns appearing ≥2 times across chapters → candidate glossary
2. Scan `[ASSUMPTION]` tags → summarize to Chapter 12
3. Show candidate glossary to user, confirm entries

## Step 8: Save

1. Ask save path (default `docs/{product}_prd/PRD-{product}-{feature}.md`)
2. Write file, return path
3. Prompt user can continue with update or validate
