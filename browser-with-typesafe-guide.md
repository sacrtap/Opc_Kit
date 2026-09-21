# Browser with TypeSafe — Usage Guide

> **Fast, low-cost browser automation with TypeSafe Jev** — Host-agnostic mechanical action delegation for browser workflows

📚 [Back to Opc_Kit](README.md) | 🎭 [Party Mode Guide](party-mode-guide.md)

---

## Overview

**browser-with-typesafe** is a host-agnostic browser skill that splits repetitive UI workflows between two actors: the host model and TypeSafe Jev.

| Actor | Responsibilities |
|-------|------------------|
| **Host model** | Planning, visual recognition, semantic judgment, sensitive actions, final verification |
| **Jev (TypeSafe)** | Mechanical action selection: navigate, click, toggle, scroll, page — chosen in a tight decision loop |

Without this split, every mechanical click costs a full host-model turn; with it, the host model is spent only where judgment is actually required. The skill works across omp, Codex, Cursor, Claude Code, Workbuddy, Zcode, or any host exposing a computer-use tab, Playwright page, or CDP.

---

## How It Works

### Responsibility Split

The host model owns the high-value work:
- Task planning and goal formulation
- Keystroke entry and form filling
- Visual recognition and semantic understanding
- Judgment on consequential actions (publish, delete, purchase)
- Final verification against fresh state

Jev owns the mechanical loop:
- Accessibility tree analysis
- Single next action selection (click, scroll, key press, reload)
- Confidence-scored decisions
- History-aware progression

### Decision Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Host Model                                  │
│  Plans task → Judges visual → Enters text → Verifies result             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        bridge/core.mjs                                   │
│  Session bounds ──► Decision request ──► Action execution              │
│  (origin, policy,  │  to Jev endpoint   │  via adapter                   │
│   max steps, etc) │                  │                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TypeSafe / OpenRouter (Jev)                         │
│  Analyzes IR state → Returns next mechanical action                      │
│  (click, scroll, key press, or DONE)                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Adapter Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Host Runtimes                                    │
│  omp browser prelude │ Codex cua_repl │ Playwright / CDP page            │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      bridge/adapters/                                    │
│  omp.mjs ───┐                                                          │
│  codex.mjs ─┼──► bridge/ir.mjs (unified Intermediate Representation)   │
│  playwright.mjs                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        bridge/core.mjs                                   │
│  Decision engine: zero dependencies, host-agnostic                        │
└─────────────────────────────────────────────────────────────────────────┘
```

Each adapter converts its host's accessibility tree into a shared IR (Intermediate Representation). The decision engine (`bridge/core.mjs`) never imports a browser API — it only calls the five-method adapter contract.

---

## Core Features

| Feature | Description |
|---------|-------------|
| **3 Built-in Adapters** | omp (browser prelude), codex (Computer Use tab), playwright (Playwright/CDP page) |
| **Unified IR** | Single accessibility representation across all hosts; role normalization, unique refs, origin extraction |
| **Runtime Detection** | `detectAdapter({ tab })` / `detectAdapter({ page })` picks the correct adapter from real capabilities |
| **Safety Boundaries** | Origin allowlist, stale state detection, `denyNames`/`requireHostNames` for sensitive controls |
| **Zero Core Dependencies** | `bridge/core.mjs` and `bridge/ir.mjs` have no third-party dependencies |

### Adapter Contract (5 Methods)

Each adapter implements:

```js
{
  name: 'omp' | 'codex' | 'playwright',
  async getState() -> IR,           // fresh accessibility snapshot
  async click(ref),                  // click node by ref
  async scroll({ direction, amount, target }),
  async pressKey(key),               // safe keys only
  async reload(),                    // reload and await ready state
}
```

### Safety Model Highlights

- `allowedOrigins` re-checked before every model call and every action
- Stale decisions (taken on outdated state) are discarded, never executed
- No text-entry action exists by construction
- Ambiguous controls cause handback rather than auto-guess
- `needs_verification` is never a pass — host must verify independently

---

## Requirements & Setup

### Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js** | Version 22+ (or any runtime with ES modules, `fetch`, and filesystem access) |
| **Browser Host** | An existing browser handle: computer-use tab (omp, Codex) or Playwright page (CDP hosts). The skill supplies none of these. |
| **API Key** | TypeSafe or OpenRouter key — see provider selection below |

### Step 1: Install the Skill

Two installation channels:

**Option A: npx skills**
```sh
npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe
```

**Option B: omp marketplace**
```sh
omp plugin marketplace add sacrtap/Opc_Kit
omp plugin install browser-with-typesafe@opc-kit
```

### Step 2: Choose a Provider

Two providers are supported. Pick one:

| Provider | Description | Default Model | Get a Key |
|----------|-------------|---------------|-----------|
| `typesafe` | TypeSafe official endpoint | `jev-latest` | https://console.typesafe.ai/keys |
| `openrouter` | OpenRouter Decisions endpoint | `~typesafe/jev-latest` | https://openrouter.ai/settings/keys |

Pick `typesafe` unless you already route model traffic through OpenRouter.

### Step 3: Configure

**Important: The installation tool never receives, prompts for, or stores an API key.**

Run the installer to write a template configuration:

```sh
node install.mjs --provider typesafe --model jev-latest
```

This creates `~/.config/browser-with-typesafe/config.json` with an **empty** `apiKey` field. You must fill it in yourself:

```json
{
  "provider": "typesafe",
  "model": "jev-latest",
  "apiKey": "YOUR_KEY_HERE"
}
```

**File permissions (enforced):**
```sh
chmod 700 ~/.config/browser-with-typesafe
chmod 600 ~/.config/browser-with-typesafe/config.json
```

### Step 4: Verify with Doctor

```sh
node scripts/doctor.mjs
```

Expected output when ready:

```
  ok    config file           /Users/you/.config/browser-with-typesafe/config.json
  ok    file permissions      0600 (not readable by group or other)
  ok    directory permissions 0700 (not accessible by group or other)
  ok    json                  parsed
  ok    provider / model      typesafe / jev-latest
  ok    apiKey                set (96 characters, not shown)
  ok    endpoint              https://api.typesafe.ai/v1/systemone -> HTTP 200 (model jev-1.13.0)

result  READY
```

Doctor exits `0` only when everything passes. It never prints the credential — only its presence and length.

### Key Security Guarantees

- `loadConfig()` returns `{ provider, model, configPath, hasApiKey }` — **never the key itself**
- Only `decide()` reads the key; it refuses to send a request whose body contains it
- `install.mjs` rejects `--key`, `--api-key`, and `--token` arguments outright
- Credentials are never logged or transmitted outside the decision endpoint

---

## Quick Start

### Installation

```sh
# Via npx skills
npx skills add sacrtap/Opc_Kit --skill browser-with-typesafe

# Or via omp marketplace
omp plugin marketplace add sacrtap/Opc_Kit
omp plugin install browser-with-typesafe@opc-kit
```

### Minimal Runnable Example

```js
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

// Step 0: Configuration
const config = await loadConfig();
// { provider, model, configPath, hasApiKey } — never the key

// Step 1: Detect adapter from host runtime
const { adapter } = detectAdapter({ tab: myTab });  // or { page } for Playwright

// Step 2: Create bounded session
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://example.com'],
  maxSteps: 12,
  maxMs: 45000,
  minConfidence: 0.55,
});

// Step 3: Run the loop
const outcome = await session.run({
  goal: 'Expand the report, scroll down through it, then collapse it.',
  controls: [
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: { scrollDirections: ['down'], scrollAmount: 2, scrollTargetName: 'Evaluation report' },
});

// Step 4: Verify independently
console.log('Status:', outcome.status);  // needs_verification, blocked, etc.
const fresh = await adapter.getState();    // host verifies fresh state
```

### Expected Output

A successful run produces:

```
[session] Starting: Expand the report, scroll down through it, then collapse it.
[step 1] decision: click "Expand section" (confidence: 0.97)
[step 2] decision: scroll down 2 pages within "Evaluation report" (confidence: 0.94)
[step 3] decision: click "Collapse section" (confidence: 0.96)
[step 4] decision: DONE (confidence: 0.98)
[session] Completed with status: needs_verification
```

---

## Workflow

### Step 0 — Confirm Configuration is Ready

Run before touching the browser:

```js
import { loadConfig } from 'skill://browser-with-typesafe/bridge/index.mjs';

const config = await loadConfig();  // throws if not configured
```

| Result | Action |
|--------|--------|
| Throws "No configuration" | Run `node install.mjs` |
| `hasApiKey: false` | User must set `apiKey` in config file |
| `hasApiKey: true` | Run `node scripts/doctor.mjs` to verify |

### Step 1 — Find the Browser Handle

| Host Runtime | Handle | Notes |
|--------------|--------|-------|
| omp | Tab from `browser.open()` / `browser.tab()` | `browser` prelude in Eval |
| Codex Computer Use | Tab from `cua_repl` | `cua.createBrowserTab()` |
| Playwright / CDP | Playwright `page` | `chromium.connectOverCDP()` |

```js
import { detectAdapter } from 'skill://browser-with-typesafe/bridge/index.mjs';

const { kind, adapter } = detectAdapter({ tab: myTab });  // or { page }
// Fails loudly if nothing matches
```

### Step 2 — Prepare a Bounded Task

One task per run. Keep it small.

```js
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://example.com'],  // re-checked before every action
  maxSteps: 12,
  maxMs: 45000,
  minConfidence: 0.55,
});
```

Policy options:

```js
policy: {
  click: true,                          // discoverable low-risk controls
  scrollDirections: ['down', 'up'],
  scrollAmount: 2,                     // bounded to 5 pages by engine
  scrollTargetName: 'Evaluation report', // scroll inside this container
  denyNames: [/delete/i, /purchase/i], // never auto-click these
  requireHostNames: [/publish/i],    // always hand back to host
  keys: ['Escape'],
  reload: false,
}
```

### Step 3 — Run the Loop

```js
const outcome = await session.run({
  goal: 'Expand the report, scroll down, then collapse it.',
  controls: [                          // explicitly permitted controls
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: { scrollDirections: ['down'], scrollAmount: 2 },
});
```

Enter text with host tools **before** the step that needs it, then call `session.run()` again — history carries over.

### Step 4 — Handle Result and Verify

| Status | Meaning | Host Action |
|--------|---------|-------------|
| `needs_verification` | Jev believes goal is met | Verify independently against fresh state |
| `low_confidence` | Handed back on purpose | Inspect state; re-scope or handle manually |
| `blocked` | No permitted action can progress | Do unsupported step, then resume |
| `no_progress` / `loading_timeout` / `action_error` / `decision_error` | Step failed | Inspect state and handoff, then resume or stop |
| `step_limit` / `budget` | Bounds reached | Resume only if task still valid |

**Verification is mandatory:**

```js
const fresh = await adapter.getState();  // independent read
// Assert on fresh.nodes, fresh.url; use screenshots for visual checks
```

---

## Safety Model

### Origin WhiteList

- `allowedOrigins` is re-checked before every model call and every action
- Navigation outside the allowlist stops the run

### Stale State Detection

- A fresh snapshot is taken before executing any decided action
- If the page changed since the decision, the decision is discarded
- Adapters must fail loudly on unknown refs (never click something else)

### No Text Entry by Construction

There is no `type` or `fill` action. Text entry is the host's responsibility.

### Control Classification

- `denyNames`: Patterns for controls never auto-clicked (deletions, purchases)
- `requireHostNames`: Patterns for controls always handed back (publishing, sending)
- Duplicate labels and text-entry roles are never auto-discovered

### Snapshot Sanitization

Snapshot text is escaped so page content cannot forge snapshot structure (injection protection).

### `needs_verification` is Not a Pass

The host must verify independently. Never report success from action history alone.

---

## What it costs: measured on a 15-action flow

The premise of this skill is that a mechanical flow stops costing one host-model turn per click. We
measured it on a 15-action flow, three samples per arm, both arms driven by the same host model with
the same goal, and correctness read from the page's own report rather than either agent's claim:

- **Arm A** — the host agent drives the browser itself; the skill is not discoverable from its cwd
- **Arm B** — the host agent uses this skill

| | Arm A (no skill) | Arm B (with skill) |
| --- | ---: | ---: |
| Host turns | 14.3 | 29.0 |
| Uncached input tokens | 47,206 | 65,029 |
| Cache-read tokens | 481,237 | 1,339,520 |
| Output tokens | 6,727 | 10,301 |
| **Billed host cost** | **$0.025122** | **$0.039907** |
| Wall time | 96.7 s | 163.5 s |
| **Time per mechanical action** | **6.45 s** | **10.90 s** |
| Task completed correctly | 3/3 | 3/3 |

**On this flow the skill cost 58.9% more and took 69% longer per action, at equal accuracy.**

Per-run spread, so you can judge the variance rather than trust a mean:

| Run | Turns | Uncached | Cache-read | Output | Cost | Wall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 12 | 38,279 | 421,504 | 11,468 | $0.027774 | 107.2 s |
| A2 | 22 | 42,888 | 769,536 | 5,514 | $0.024100 | 100.5 s |
| A3 | 9 | 60,451 | 252,672 | 3,200 | $0.023491 | 82.4 s |
| B1 | 27 | 51,026 | 1,204,224 | 9,354 | $0.033758 | 137.7 s |
| B2 | 22 | 86,577 | 997,248 | 10,446 | $0.044492 | 173.5 s |
| B3 | 38 | 57,483 | 1,817,088 | 11,104 | $0.041472 | 179.3 s |

Three samples per arm on one fixture: treat the percentages as indicative, not precise.

### Jev is not the bottleneck

Across the three arm-B runs the skill made **55 decisions**. Jev's own latency was **p50 373 ms**
(spread 363–385 ms across runs), worst case 1,890 ms. The model answers in sub-second time; the cost
is everything around it.

### Why the premise did not hold here

Arm A needed only **14.3 host turns for 15 actions** — about one turn per action, not one turn per
click. A host that batches a few mechanical actions into one call never paid the per-click cost this
skill removes. Arm B then paid on top: reading this document, writing the wiring code, and carrying a
context **2.8× larger** in cache reads (1,339,520 vs 481,237).

### What the request-payload fix did achieve

The skill used to send its whole decision history on every request, so the payload grew with the
number of steps taken. It is now capped and projected:

| Step | History entries sent | Input tokens |
| ---: | ---: | ---: |
| 1 | 1 | 1,730 |
| 10 | 10 | 1,919 |
| 40 | 10 | 1,929 |
| 80 | 10 | 1,929 |

Before the fix, step 80 sent **10,314** input tokens for the same decision — **5.3× more**, growing
without bound. That was a real defect and it is fixed, but it is not enough to outweigh the
integration cost on a flow this size.

### What is not measured

- **The break-even flow length.** Nothing here shows a length at which the skill wins; we did not
  find one.
- Any flow whose next step genuinely depends on freshly observed state — the case the skill is
  designed for and this fixture does not exercise, because all 15 actions are known up front.
- Flows needing text entry are now supported (`policy.fill` + a small helper model), but the search+filter+form measurement shows the skill still does not beat driving directly on a short flow.

If you are choosing between driving a browser directly and using this skill for a scripted flow, the
measurement says drive it directly.

## Text entry: Jev selects, a small LLM fills

Jev is a selector; it cannot generate text. Every build on `madewithjev.com` pairs it with a small
fast LLM for exactly that reason. This skill does the same:

- `policy.fill: true` offers every text field (textbox / textarea / combobox / searchbox) as a
  candidate; Jev picks **which** field.
- A free helper model (`bifrost/deepseek-v4-flash`) generates the **value** from the goal and the
  field's label. The response is strict-parsed; a blank, non-string, or over-long value fails the
  action and the run hands back rather than guessing.
- `fill` **never** presses Enter and never submits. Any consequential submit/send/publish step stays
  with the host.

Measured on a search + filter + form flow (3 samples/arm, free host model both arms, correctness from
the page's own report): arm A 29,299 tokens / 52.68 s per action / 3-of-3; arm B 49,180 tokens /
89.52 s per action / 2-of-3. The skill cost **1.68x** the tokens and **1.70x** the time per action —
the ≤0.8x criterion is not met. Jev is not the bottleneck (10 decisions, p50 **379 ms**).

## Verification Matrix

| Backend | Verification Method | Result |
|---------|---------------------|--------|
| **omp** (`browser` prelude) | **Real end-to-end** — Jev decision loop against headless omp Chromium; host verified fresh state | **Pass** — 5/5 checks, exit clean, 3 executed actions / 4 decisions, ~1.9 s wall, ~1.7 s Jev API |
| **Playwright 1.59** (headless Chrome) | **Real end-to-end** — same task fixture; process exits non-zero on failure | **Pass** — 5/5 checks, exit 0, 3 executed actions / 4 decisions, ~2.3 s wall, ~2.0 s Jev API |
| **Codex** (`cua_repl`) | **Contract tests only** — mock tab handle + full decision-loop regression | **Not covered on real host** — no Codex Computer Use runtime in this environment |
| **Configuration + doctor** | **Real** — `doctor.mjs` against live credential, plus fresh-user install | **Pass** — `READY`, exit 0, endpoint HTTP 200; empty key reports `NOT READY (apiKey)`, wrong key reports `NOT READY (endpoint)` with HTTP 401 |

### Coverage Notes

| Item | Status | Note |
|------|--------|------|
| Codex Computer Use on real host | **Not covered** | No Codex CUA runtime; adapter covered by contract tests and decision-loop regression only |
| omp skill discovery from `.agents/skills/` | **Confirmed** | `skill://browser-with-typesafe` resolves in fresh omp session; discovery is startup-scoped |

### Test Commands

```sh
npm test                     # 69 unit, contract, installer, doctor, and architecture tests
npm run test:e2e:playwright  # Real end-to-end, exits 0 on success
npm run doctor               # Configuration check, exits 0 only when usable
```

Both live runs (omp and Playwright) produced identical action sequences:

1. Click "Expand section"
2. Scroll down 2 pages within "Evaluation report"
3. Click "Collapse section"
4. DONE

---

## Cross-Platform Compatibility

### Verified Hosts

| Host | Adapter | Verification Status |
|------|---------|---------------------|
| **omp** | `omp` | ✅ Real end-to-end verified |
| **Codex** (Computer Use) | `codex` | ⚠️ Contract tests only; real host not available |
| **Cursor** | `playwright` | ✅ Contract coverage |
| **Claude Code** | `playwright` | ✅ Contract coverage |
| **Workbuddy** | `playwright` | ✅ Contract coverage |
| **Zcode** | `playwright` | ✅ Contract coverage |
| **Any Playwright/CDP host** | `playwright` | ✅ Real end-to-end verified |

### Capability Detection

`detectAdapter()` inspects the passed handle and picks the correct adapter:

```js
detectAdapter({ tab })      // Returns omp or codex adapter
detectAdapter({ page })     // Returns playwright adapter
detectAdapter({ tab, page }) // Picks best match; fails if ambiguous
```

Fails loudly when no adapter matches — never silently degrades.

---

## Troubleshooting

| Message | Meaning | Fix |
|---------|---------|-----|
| `No configuration at <path>. Create one with node install.mjs...` | Config file missing | Run installer, then set `apiKey` |
| `Configuration at <path> is not valid JSON` | File corrupted | Fix or delete and re-run installer |
| `Unsupported provider "x"` | Provider typo | Use `typesafe` or `openrouter` |
| `Invalid model "x" for provider typesafe` | Wrong model ID | Use `jev-latest` |
| `"apiKey" is empty in <path>` | Template not filled | Set key from provider URL |
| `HTTP 401` / `HTTP 403` | Credential or access problem | Check key validity at provider console |
| `transport failure or timeout` | Network or timeout | Check connectivity; verify `decisionTimeoutMs` |
| `Invalid <provider> decision schema` | Endpoint answered but malformed | Report to provider |
| `Snapshot too large` | Page exposes too many nodes | Scope the task or region |
| `Browser left authorized origins` | Navigation outside allowlist | Expand `allowedOrigins` if legitimate |

### Doctor Output Interpretation

| Output | Meaning |
|--------|---------|
| `result READY` | Configuration valid, endpoint reachable, ready to use |
| `NOT READY (apiKey)` | Config exists but `apiKey` is empty |
| `NOT READY (endpoint)` with HTTP 401 | Key is set but rejected by endpoint (wrong key or no access) |
| Exit code 0 | Doctor passed |
| Exit code 1 | Doctor failed — see specific check |

### Endpoint Verification (Manual)

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"jev-latest","state":{"goal":"ping","browser":"none","history":[]},"questions":{"next":{"type":"choice","instructions":"pick","criteria":{"a":"first","b":"second"}}}}'
```

Expected: `200`

---

## Limitations / Not Covered

| Limitation | Details |
|------------|---------|
| **Fill is delegated** | Jev picks *which* field; a small free LLM generates the value. `fill` never presses Enter and never submits — the host owns any consequential step. |
| **No native select handling** | Native `<select>` dropdowns need host handling |
| **No canvas/iframe support** | Canvas apps and cross-origin frames are unsupported |
| **No drag-and-drop** | Drag operations require host-level automation |
| **No file uploads** | Upload flows need host-side file selection |
| **No CAPTCHA solving** | CAPTCHA challenges stay with the host |
| **Codex real-host unverified** | Adapter exists and passes contract tests, but not validated on real Codex Computer Use runtime |

---

## Usage Examples

### Example 1: Browser Verification Flow

Verify a settings page works end-to-end:

```js
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

const config = await loadConfig();
const { adapter } = detectAdapter({ tab: settingsTab });

const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://app.example.com'],
  maxSteps: 8,
});

const outcome = await session.run({
  goal: 'Open notification settings, enable email alerts, save changes',
  controls: [
    { op: 'click', name: 'Notification settings' },
    { op: 'click', name: 'Email alerts' },
    { op: 'click', name: 'Save changes' },
  ],
});

// Host verification: check toggle state
const fresh = await adapter.getState();
const emailToggle = fresh.nodes.find(n => n.name.includes('Email alerts'));
console.assert(emailToggle?.state?.checked === true, 'Email alerts should be enabled');
```

### Example 2: Dashboard Report Inspection

Scroll through a large evaluation report:

```js
const session = createSession(adapter, {
  ...config,
  allowedOrigins: ['https://dashboard.example.com'],
  maxSteps: 15,
  maxMs: 60000,
});

const outcome = await session.run({
  goal: 'Expand the Q3 evaluation report, scroll through all sections, confirm status shows "Reviewed"',
  controls: [
    { op: 'click', name: 'Expand section' },
    { op: 'click', name: 'Collapse section' },
  ],
  policy: {
    scrollDirections: ['down'],
    scrollAmount: 3,
    scrollTargetName: 'Q3 evaluation report',
  },
});

// Verify status text visible after scrolling
const fresh = await adapter.getState();
const statusVisible = fresh.nodes.some(n => n.name.includes('Reviewed'));
console.assert(statusVisible, 'Status should show Reviewed');
```

### Example 3: Cross-Host Reusable Task Script

Same task script works on any supported host:

```js
// task.mjs — reusable across hosts
import { loadConfig, detectAdapter, createSession } from 'skill://browser-with-typesafe/bridge/index.mjs';

export async function runInspectionTask(browserHandle) {
  const config = await loadConfig();
  const { adapter } = detectAdapter(browserHandle);  // auto-detects from tab or page
  
  const session = createSession(adapter, {
    ...config,
    allowedOrigins: ['https://admin.example.com'],
    maxSteps: 10,
  });
  
  return await session.run({
    goal: 'Navigate to audit log, filter to last 7 days, verify at least one entry exists',
    controls: [
      { op: 'click', name: 'Audit log' },
      { op: 'click', name: 'Last 7 days' },
    ],
    policy: { scrollDirections: ['down'], scrollAmount: 1 },
  });
}

// Usage on omp:
// const result = await runInspectionTask({ tab: ompTab });

// Usage on Playwright:
// const result = await runInspectionTask({ page: pwPage });
```

---

## References

- [TypeSafe Introduction](https://docs.typesafe.ai/introduction)
- [OpenRouter Jev Latest](https://openrouter.ai/~typesafe/jev-latest)
- [SKILL.md](skills/browser-with-typesafe/SKILL.md) — Host-agnostic instructions
- [references/configuration.md](skills/browser-with-typesafe/references/configuration.md) — Provider setup and troubleshooting
- [references/adapter-contract.md](skills/browser-with-typesafe/references/adapter-contract.md) — Adding new hosts
