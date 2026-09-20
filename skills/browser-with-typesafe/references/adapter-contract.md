# Adapter contract

Every host reaches the decision engine through one small interface. Core logic
(`bridge/core.mjs`) never imports a host API — it only calls the five methods
below.

## Interface

```js
{
  name: 'omp' | 'codex' | 'playwright',       // informational
  async getState() -> IR,                     // fresh accessibility snapshot
  async click(ref),                           // click the node addressed by ref
  async scroll({ direction, amount, target }),// direction: 'up' | 'down'
  async pressKey(key),                        // one of the safe keys
  async reload(),
}
```

`core.mjs` rejects a handle missing any of these at session creation, so a bad
adapter fails before spending a decision call.

## IR (the only shape core understands)

```jsonc
{
  "version": 1,
  "url": "https://example.com/settings",
  "origin": "https://example.com",
  "nodes": [
    { "ref": "e12", "role": "button", "name": "Settings" },
    { "ref": null,  "role": "heading", "name": "Preferences" }
  ]
}
```

Guarantees provided by `createIR()`:

- `role` is canonical (`normalizeRole()` maps "text field", "textField", and
  "textbox" onto one value).
- `ref` is unique inside a snapshot, or `null` for context-only nodes.
- `origin` is derived from `url`; an unparseable URL throws rather than
  silently disabling the origin allowlist.

## What `ref` must satisfy

`ref` is adapter-opaque. It only has to be:

1. **unique** within the snapshot it came from,
2. **executable** by that same adapter via `click`/`scroll`,

The engine protects against stale refs: it takes a fresh snapshot before
executing a decided action and discards the decision if the page changed. An
adapter therefore never has to detect staleness itself — but it must **fail
loudly** when handed an unknown ref rather than clicking something else.

Current implementations:

| Adapter | `ref` | Resolution |
| --- | --- | --- |
| omp | the `eN` from `ariaSnapshot()` | `tab.ref(ref)` returns a live element handle |
| codex | the AX node index as a string | `tab.click(Number(ref))` |
| playwright | an ordinal `n<i>` minted per snapshot | `getByRole(role, { name, exact: true }).nth(nth)` |

## Action semantics

- `click(ref)` — one mechanical click on one control. Never a text entry.
- `scroll({ direction, amount, target })` — `amount` is bounded to 5 pages by the
  engine. `target` is either a `ref`, a `[x, y]` point the host supplied after
  visual recognition, or `undefined` for the page itself. A named container must
  scroll **itself**, not the page.
- `pressKey(key)` — only keys in `SAFE_KEYS` (Enter, Escape, Tab, Shift+Tab,
  PageUp, PageDown, Home, End). The engine validates this before calling.
- `reload()` — reload the current page and return only once state is readable.

## Adding a host

1. Convert that host's accessibility tree to IR nodes. Reuse
   `parseAriaSnapshot()` from `bridge/aria-snapshot.mjs` when the host exposes
   Playwright-style ARIA snapshot text.
2. Bind `ref` to something the host can execute.
3. Implement the five methods and reject handles that cannot satisfy them.
4. Add a contract test with a fake handle — see `tests/omp-adapter.test.mjs`,
   `tests/codex-adapter.test.mjs`, `tests/playwright-adapter.test.mjs`.

Do not add a host branch inside `core.mjs`; a new host is a new adapter file.

## Contract tests

```
node --test tests/omp-adapter.test.mjs
node --test tests/codex-adapter.test.mjs
node --test tests/playwright-adapter.test.mjs
```

Each adapter must additionally pass the shared end-to-end task
(`tests/e2e/task.mjs`) on a real runtime. See `README.md` for the verification
matrix.
