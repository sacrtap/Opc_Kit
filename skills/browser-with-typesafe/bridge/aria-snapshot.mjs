/**
 * Shared parser for ARIA-snapshot text.
 *
 * Both the omp and Playwright adapters consume this YAML-ish format, so the
 * parser lives here rather than inside either adapter.
 *
 * Handles every shape the snapshot emits:
 *   - button "Expand section"
 *   - button "Expand section" [ref=e7]
 *   - generic [active] [ref=e1]:
 *   - status [ref=e4]: idle
 *   - checkbox "Accept terms" [ref=e9]: checked
 *   - text: "Status:"
 */

const REF_PATTERN = /\[ref=([^\]]+)\]/g;

/**
 * Control-state words an ARIA snapshot may suffix after a colon. When the bare
 * value after `:` is one of these, it is captured as `state` rather than as the
 * node name, so the model can see whether a control is already in the wanted
 * state and avoid re-toggling it. Any other value keeps today's behaviour
 * (it becomes the name).
 */
const STATE_WORDS = new Set([
  'checked', 'unchecked', 'selected', 'expanded', 'collapsed',
  'disabled', 'pressed', 'invalid', 'required', 'readonly',
]);

/** Parse ARIA-snapshot text into `{ ref, role, name, state? }` nodes. */
export function parseAriaSnapshot(text) {
  const nodes = [];

  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    if (!/^\s*-\s/.test(rawLine)) continue;

    let rest = rawLine.trim().slice(1).trim();
    const refMatch = rest.match(REF_PATTERN);
    const ref = refMatch ? refMatch[refMatch.length - 1].slice(5, -1) : null;
    rest = rest.replace(REF_PATTERN, '').trim();

    const [left, value] = splitHeaderValue(rest);
    const header = left.trim();
    const roleMatch = header.match(/^[A-Za-z][\w-]*/);
    if (!roleMatch) continue;

    const node = { ref, role: roleMatch[0], name: extractName(header, value) };
    const state = extractState(value);
    if (state) node.state = state;
    nodes.push(node);
  }

  return nodes;
}

/** Split `role "name" [attrs]: value` at the first colon outside quotes. */
function splitHeaderValue(text) {
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i - 1] !== '\\') inQuotes = !inQuotes;
    else if (char === ':' && !inQuotes) return [text.slice(0, i), text.slice(i + 1)];
  }
  return [text, null];
}

/**
 * A bare value after `:` that is one of the known state words is the control's
 * state, not a name. A quoted value is always a name (`text: "Status:"`), and
 * an unknown bare value keeps today's behaviour (it becomes the name), so
 * `status [ref=e4]: idle` still parses exactly as before.
 */
function extractState(value) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) return null;
  return STATE_WORDS.has(trimmed) ? trimmed : null;
}

function extractName(header, value) {
  const quoted = header.match(/"((?:[^"\\]|\\.)*)"/);
  if (quoted) return unescapeName(quoted[1]);
  if (value === null) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return unescapeName(trimmed.slice(1, -1));
  return trimmed;
}

function unescapeName(value) {
  return String(value).replace(
    /\\(["\\ntr])/g,
    (_, char) => ({ '"': '"', '\\': '\\', n: '\n', t: '\t', r: '\r' })[char],
  );
}
