/**
 * browser-with-typesafe — unified accessibility intermediate representation (IR).
 *
 * This module is host-agnostic by construction: it never references a browser
 * API, a tool namespace, or a host product name. Every host adapter converts its
 * own accessibility tree into this shape, and the decision engine only ever
 * reads this shape.
 *
 * IR shape:
 *   {
 *     version: 1,
 *     url:     "https://example.com/settings",
 *     origin:  "https://example.com",
 *     nodes:   [ { ref, role, name }, ... ]
 *   }
 *
 * `ref` is an opaque, snapshot-scoped handle the owning adapter can execute
 * against. It is unique inside one snapshot (enforced here) and meaningless
 * outside it. `ref === null` means the node is visible context only and cannot
 * be acted on.
 */

export const IR_VERSION = 1;

/** Serialized snapshots larger than this are rejected before any model call. */
export const MAX_SNAPSHOT_CHARS = 24000;

/** Bounded scroll: at most this many pages per scroll action. */
export const SCROLL_MAX_PAGES = 5;

/**
 * Canonical roles that represent a control this skill may click.
 * Adapters normalize their native role strings into these values.
 */
export const CLICK_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'menuitem',
  'tab',
  'switch',
]);

/** Canonical text-entry roles. Never auto-discovered; the host enters text. */
export const TEXT_ROLES = new Set(['textbox', 'textarea', 'combobox', 'searchbox']);

/**
 * Roles that can actually be scrolled *within*. Used to resolve a named scroll
 * target: a heading sharing the container's label must not make the target
 * ambiguous.
 */
export const SCROLL_CONTAINER_ROLES = new Set([
  'region',
  'group',
  'generic',
  'list',
  'listbox',
  'table',
  'grid',
  'row',
  'cell',
  'gridcell',
  'tree',
  'menu',
  'dialog',
  'form',
  'navigation',
  'main',
  'document',
  'tabpanel',
  'article',
  'complementary',
  'banner',
  'contentinfo',
  'iframe',
  'toolbar',
  'application',
  'textbox',
  'textarea',
  'searchbox',
]);

/** Keyboard keys this skill is ever allowed to press on its own. */
export const SAFE_KEYS = new Set([
  'Enter',
  'Escape',
  'Tab',
  'Shift+Tab',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/**
 * Native role spellings across hosts → canonical roles.
 * Covers Codex CUA ("text field", "radio button"), ARIA/Puppeteer
 * ("textbox", "menuitem"), and CDP AX ("textField", "menuItem").
 */
const ROLE_ALIASES = new Map([
  ['button', 'button'],
  ['push button', 'button'],
  ['link', 'link'],
  ['check box', 'checkbox'],
  ['checkbox', 'checkbox'],
  ['radio button', 'radio'],
  ['radiobutton', 'radio'],
  ['radio', 'radio'],
  ['menu item', 'menuitem'],
  ['menuitem', 'menuitem'],
  ['tab', 'tab'],
  ['switch', 'switch'],
  ['toggle button', 'switch'],
  ['text field', 'textbox'],
  ['textfield', 'textbox'],
  ['textbox', 'textbox'],
  ['text area', 'textarea'],
  ['textarea', 'textarea'],
  ['combo box', 'combobox'],
  ['combobox', 'combobox'],
  ['search box', 'searchbox'],
  ['searchbox', 'searchbox'],
  ['slider', 'slider'],
  ['spin button', 'spinbutton'],
  ['spinbutton', 'spinbutton'],
  ['image', 'image'],
  ['img', 'image'],
  ['heading', 'heading'],
  ['paragraph', 'paragraph'],
  ['static text', 'text'],
  ['text', 'text'],
  ['list', 'list'],
  ['list item', 'listitem'],
  ['listitem', 'listitem'],
  ['table', 'table'],
  ['row', 'row'],
  ['cell', 'cell'],
  ['grid', 'grid'],
  ['gridcell', 'gridcell'],
  ['columnheader', 'columnheader'],
  ['rowheader', 'rowheader'],
  ['tree', 'tree'],
  ['treeitem', 'treeitem'],
  ['menu', 'menu'],
  ['menubar', 'menubar'],
  ['toolbar', 'toolbar'],
  ['dialog', 'dialog'],
  ['alert', 'alert'],
  ['status', 'status'],
  ['progressbar', 'progressbar'],
  ['separator', 'separator'],
  ['group', 'group'],
  ['region', 'region'],
  ['form', 'form'],
  ['navigation', 'navigation'],
  ['main', 'main'],
  ['banner', 'banner'],
  ['contentinfo', 'contentinfo'],
  ['complementary', 'complementary'],
  ['article', 'article'],
  ['document', 'document'],
  ['web area', 'document'],
  ['webarea', 'document'],
  ['rootwebarea', 'document'],
  ['iframe', 'iframe'],
  ['figure', 'figure'],
  ['caption', 'caption'],
  ['application', 'application'],
  ['generic', 'generic'],
  ['none', 'generic'],
  ['presentation', 'generic'],
  ['tabpanel', 'tabpanel'],
  ['tablist', 'tablist'],
  ['listbox', 'listbox'],
  ['option', 'option'],
]);

/**
 * Normalize a native role string into its canonical form.
 * Unknown roles are lower-cased and hyphenated rather than dropped, so adapters
 * stay lossless and `CLICK_ROLES` membership stays explicit.
 */
export function normalizeRole(raw) {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return ROLE_ALIASES.get(key) ?? key.replace(/\s+/g, '-');
}

/**
 * Strip the value suffix some accessibility trees append to a control's name,
 * e.g. "Search, Value: hello" → "Search".
 */
export function semanticName(name) {
  return String(name ?? '').replace(/, Value:.*$/, '');
}

/** Exact-or-value-suffixed name match. */
export function matchesName(observed, expected) {
  return observed === expected || String(observed ?? '').startsWith(`${expected}, Value:`);
}

/** Match a node name against a string or RegExp policy entry. */
export function matchesPattern(name, pattern) {
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0;
    return pattern.test(name);
  }
  return typeof pattern === 'string' && matchesName(name, pattern);
}

/** Parse a URL's origin. Throws when the URL cannot be verified. */
export function originOf(url) {
  return new URL(String(url)).origin;
}

/**
 * Build and validate an IR snapshot.
 * Guarantees: every role is canonical, every non-null ref is unique.
 */
export function createIR({ url, nodes }) {
  if (typeof url !== 'string' || !url) throw new Error('IR requires a url');
  if (!Array.isArray(nodes)) throw new Error('IR requires a nodes array');

  const seen = new Set();
  const out = [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object') throw new Error('IR node must be an object');
    const role = normalizeRole(node.role);
    if (!role) throw new Error('IR node requires a role');
    const name = typeof node.name === 'string' ? node.name : '';
    const ref = node.ref == null || node.ref === '' ? null : String(node.ref);
    if (ref !== null) {
      if (seen.has(ref)) throw new Error(`Duplicate IR ref: ${ref}`);
      seen.add(ref);
    }
    out.push({ ref, role, name });
  }

  return { version: IR_VERSION, url, origin: originOf(url), nodes: out };
}

/**
 * Deterministic text handed to the decision model.
 * Stable for a given IR so `fingerprint` comparisons stay meaningful.
 *
 * Every name is escaped onto a single line: page text is untrusted data and
 * must never be able to forge an extra `[ref=...]` entry or end the snapshot.
 */
export function serializeForJev(ir) {
  const lines = [`Browser tab: URL: "${ir.url}".`];
  for (const node of ir.nodes) {
    const ref = node.ref === null ? '' : `[ref=${node.ref}] `;
    const name = node.name ? ` "${escapeName(node.name)}"` : '';
    lines.push(`${ref}${node.role}${name}`);
  }
  return lines.join('\n');
}

function escapeName(name) {
  return String(name)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/** Serialized length of a snapshot, used for the size guard. */
export function snapshotLength(ir) {
  return serializeForJev(ir).length;
}

/**
 * Change-detection key that deliberately excludes `ref`: a page whose content is
 * unchanged reports the same fingerprint even when the adapter mints fresh refs.
 */
export function fingerprint(ir) {
  const body = ir.nodes.map((node) => `${node.role}\u0000${node.name}`).join('\n');
  return `${ir.url}\n${body}`;
}

/** Clickable nodes whose name matches any of the supplied names. */
export function matchClickable(ir, names) {
  return ir.nodes.filter(
    (node) => CLICK_ROLES.has(node.role) && names.some((name) => matchesName(node.name, name)),
  );
}

/** Nodes (any role) whose name matches any of the supplied names. */
export function matchByName(ir, names) {
  return ir.nodes.filter((node) => names.some((name) => matchesName(node.name, name)));
}

/**
 * Scroll containers whose label matches any of the supplied names.
 * Filtering by role keeps a same-labelled heading from making the target
 * ambiguous.
 */
export function matchScrollContainer(ir, names) {
  return matchByName(ir, names).filter((node) => SCROLL_CONTAINER_ROLES.has(node.role));
}

/** True when the serialized snapshot exceeds the model-input budget. */
export function isTooLarge(ir) {
  return snapshotLength(ir) > MAX_SNAPSHOT_CHARS;
}
