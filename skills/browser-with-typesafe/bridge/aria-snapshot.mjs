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
 *   - text: "Status:"
 */

const REF_PATTERN = /\[ref=([^\]]+)\]/g;

/** Parse ARIA-snapshot text into `{ ref, role, name }` nodes. */
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

    nodes.push({ ref, role: roleMatch[0], name: extractName(header, value) });
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
