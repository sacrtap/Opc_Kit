# Model Selection

When running in `subagent` or `agent-team` mode, each persona needs a model. The skill uses a tier-based system to match personas to the best available model in the current environment.

## Model Tiers

Each persona has a `model_tier` field in `party.toml`:

| Tier | Use Case | Example Roles | Model Characteristics |
|------|----------|---------------|----------------------|
| **strong** | Deep reasoning, complex analysis, strategic thinking | Forge, Cai, Vex, Wei, Noa | Most capable, slower, more expensive |
| **balanced** | Moderate complexity, needs precision, evidence-based | Boundary, Yui, Level, Splinter, Ren, Tao | Mid-tier, good balance of speed and quality |
| **fast** | Quick reactions, banter, simple takes, meta-commentary | Grumbal, Dana, Wildcard, Killjoy, Mirror | Fastest, cheapest, good for lightweight turns |

## Detection Flow

Before spawning subagents, detect available models:

### 1. Check for explicit model override

If the user specified a model (e.g., "use claude-3-opus for everyone"), use that for all personas. This wins over everything.

### 2. Check for per-persona model

If a persona has an explicit `model` field in `party.toml`, use that model. This wins over tier mapping.

### 3. Detect available models from environment

Check the host environment for available models:

**OpenCode:**
- Read `.opencode/config.json` or `.opencode.json` for model configuration
- Look for `model`, `models`, or `available_models` fields
- Common keys: `anthropic/claude-3-opus`, `anthropic/claude-3-sonnet`, `anthropic/claude-3-haiku`, `openai/gpt-4`, `openai/gpt-3.5-turbo`

**Claude Code:**
- Models are available via the `claude` CLI
- Check `claude --list-models` or environment variables
- Common: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`

**Generic:**
- Check environment variables: `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `DEFAULT_MODEL`
- Fall back to the current model (the one running the orchestrator)

### 4. Map tiers to detected models

Use this priority order for mapping:

**If multiple models available:**
```
strong  → most capable model (opus/gpt-4/o1)
balanced → mid-tier model (sonnet/gpt-4-turbo)
fast    → fastest model (haiku/gpt-3.5)
```

**If only one model available:**
```
All tiers → use the single available model
```

**If no models detected:**
```
All tiers → use the current orchestrator model
```

## Mapping Examples

### Example 1: OpenCode with multiple models

Detected models:
- `anthropic/claude-3-opus-20240229`
- `anthropic/claude-3-sonnet-20240229`
- `anthropic/claude-3-haiku-20240307`

Mapping:
```
strong  → anthropic/claude-3-opus-20240229
balanced → anthropic/claude-3-sonnet-20240229
fast    → anthropic/claude-3-haiku-20240307
```

### Example 2: Claude Code with limited models

Detected models:
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

Mapping:
```
strong  → claude-3-sonnet-20240229  (best available)
balanced → claude-3-sonnet-20240229
fast    → claude-3-haiku-20240307
```

### Example 3: Single model available

Detected models:
- `openai/gpt-4`

Mapping:
```
strong  → openai/gpt-4
balanced → openai/gpt-4
fast    → openai/gpt-4
```

## Implementation

The orchestrator should:

1. **Before first subagent spawn**, detect available models and build the tier mapping
2. **Announce the mapping** to the user: "Using claude-3-opus for strong roles, claude-3-sonnet for balanced, claude-3-haiku for fast"
3. **Pass the correct model** when spawning each subagent
4. **Respect overrides**: user-specified model > per-persona model > tier mapping

## Cost Optimization

When cost is a concern, the user can:
- Specify a single model for all personas: "use claude-3-haiku for everyone"
- Override specific roles: "use opus for Forge, haiku for everyone else"
- Use `session` mode instead of `subagent` (no model selection needed)

## Fallback Behavior

If model detection fails or a mapped model is unavailable:
1. Try the next tier down (strong → balanced → fast)
2. If all fail, use the orchestrator's current model
3. Never block the discussion due to model selection issues
