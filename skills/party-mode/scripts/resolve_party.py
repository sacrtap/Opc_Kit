#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Resolve the party-mode roster, lazily.

Reads the skill's `party.toml` (base config) and merges an optional
`user/party.user.toml` override on top (two-layer, structural rules —
override wins, keyed arrays merge by code/id). The merged `[party]` table is
then projected into only what the moment needs:

  * default (no flag) — the active roster to load on entry: the
    `default_party` group if one is configured, else the whole collective
    (every party_member). Other groups come back as names only, so nothing
    you aren't using is loaded into the party.
  * --list-groups — just id + name + size for every configured group. The
    cheap menu for "which room?", with no member detail.
  * --party <id> — full member detail for one chosen group, on demand
    (e.g. when the user switches rooms). Unknown id returns the available
    names instead of an error wall.

The merge is deterministic (a keyed union; a custom member whose code
matches a base member overrides it), so the orchestrator consumes a
resolved roster instead of re-deriving it every session.

Stdlib only (Python 3.11+ for tomllib). Run with `python3` — no uv or
project scaffolding required.

  resolve_party.py --config party.toml [--user-config user/party.user.toml]
  resolve_party.py --config party.toml --list-groups
  resolve_party.py --config party.toml --party writers-room
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:  # pragma: no cover - guarded for <3.11
    sys.stderr.write("error: Python 3.11+ is required (stdlib `tomllib`).\n")
    sys.exit(3)


_MISSING = object()
_KEYED_MERGE_FIELDS = ("code", "id")


def load_toml(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    try:
        with file_path.open("rb") as f:
            parsed = tomllib.load(f)
        return parsed if isinstance(parsed, dict) else {}
    except (tomllib.TOMLDecodeError, OSError):
        return {}


def _detect_keyed_merge_field(items):
    """Return 'code' or 'id' if every table item carries that *same* field.

    Mixed arrays — some items `code`, others `id` — return None and fall
    through to append semantics.
    """
    if not items or not all(isinstance(item, dict) for item in items):
        return None
    for candidate in _KEYED_MERGE_FIELDS:
        if all(item.get(candidate) is not None for item in items):
            return candidate
    return None


def _merge_by_key(base, override, key_name):
    result = []
    index_by_key = {}
    for item in base:
        if not isinstance(item, dict):
            continue
        if item.get(key_name) is not None:
            index_by_key[item[key_name]] = len(result)
        result.append(dict(item))
    for item in override:
        if not isinstance(item, dict):
            result.append(item)
            continue
        key = item.get(key_name)
        if key is not None and key in index_by_key:
            result[index_by_key[key]] = dict(item)
        else:
            if key is not None:
                index_by_key[key] = len(result)
            result.append(dict(item))
    return result


def _merge_arrays(base, override):
    """Shape-aware array merge: keyed merge if all items have code/id, else append."""
    base_arr = base if isinstance(base, list) else []
    override_arr = override if isinstance(override, list) else []
    keyed_field = _detect_keyed_merge_field(base_arr + override_arr)
    if keyed_field:
        return _merge_by_key(base_arr, override_arr, keyed_field)
    return base_arr + override_arr


def deep_merge(base, override):
    """Structural merge: tables deep-merge, keyed arrays merge by code/id, else override wins."""
    if isinstance(base, dict) and isinstance(override, dict):
        result = dict(base)
        for key, over_val in override.items():
            if key in result:
                result[key] = deep_merge(result[key], over_val)
            else:
                result[key] = over_val
        return result
    if isinstance(base, list) and isinstance(override, list):
        return _merge_arrays(base, override)
    return override


def load_party(config_path: Path, user_config_path: Path) -> dict:
    """Merged [party] table: base party.toml + optional user override."""
    base = load_toml(config_path).get("party", {})
    user = load_toml(user_config_path).get("party", {})
    merged = deep_merge(base, user)
    _resolve_placeholders(merged, config_path.parent)
    return merged


def _resolve_placeholders(node, skill_root: Path):
    """Replace `{skill-root}` in string values with the actual skill folder.

    `output_dir` and `memory_dir` are commonly written relative to the skill
    so a default install just works; resolving here means the orchestrator
    receives absolute paths and never has to parse TOML itself.
    """
    if isinstance(node, dict):
        for key, value in list(node.items()):
            if isinstance(value, str):
                node[key] = value.replace("{skill-root}", str(skill_root))
            else:
                _resolve_placeholders(value, skill_root)
    elif isinstance(node, list):
        for i, value in enumerate(node):
            if isinstance(value, str):
                node[i] = value.replace("{skill-root}", str(skill_root))
            else:
                _resolve_placeholders(value, skill_root)


def _alias(code: str) -> str:
    """Short alias for a member code: strips nothing today, reserved for prefixed codes."""
    return code


def build_collective(party_members: list):
    """One pool keyed by code. An override with a matching code replaces in place.

    Returns (collective, index):
      * collective — every member, the pool groups draw from and the
        orchestrator can summon by name.
      * index — maps every resolvable token (code, prefix-stripped alias,
        lower-cased name) to a canonical code.
    """
    collective = {}
    index = {}

    def register(code, entry):
        collective[code] = entry
        index[code] = code
        index[code.lower()] = code
        index[_alias(code).lower()] = code
        name = entry.get("name")
        if name:
            index[name.lower()] = code

    for m in party_members or []:
        code = m.get("code")
        if not code:
            continue
        canonical = index.get(code) or index.get(code.lower()) or code
        entry = {"code": canonical, "source": "custom"}
        for field in ("name", "icon", "title", "persona", "capabilities", "model", "model_tier", "domains", "speaking_style"):
            if m.get(field) is not None:
                entry[field] = m[field]
        entry.setdefault("name", canonical)
        register(canonical, entry)

    return collective, index


def resolve_members(member_tokens, collective, index):
    """(resolved entries in listed order, unresolved tokens)."""
    resolved, unresolved = [], []
    for token in member_tokens or []:
        code = index.get(token) or index.get(str(token).lower())
        if code and code in collective:
            resolved.append(collective[code])
        else:
            unresolved.append(token)
    return resolved, unresolved


def group_menu(groups):
    """Names only — the cheap menu. Open-cast groups (no roster) are flagged."""
    out = []
    for g in groups or []:
        if not isinstance(g, dict) or not g.get("id"):
            continue
        members = g.get("members", []) or []
        entry = {"id": g["id"], "name": g.get("name", g["id"]),
                 "member_count": len(members)}
        if not members:
            entry["open_cast"] = True
        out.append(entry)
    return out


def find_group(groups, group_id):
    for g in groups or []:
        if isinstance(g, dict) and g.get("id") == group_id:
            return g
    return None


def group_detail(g, collective, index):
    """Full detail for one group: resolved members + the optional scene.

    `scene` is a freeform line the orchestrator plays — setting, what's
    happening, room dynamics, in-the-moment character notes. Surfaced only
    here (when a group is the active/chosen roster), never in the menu.

    `members` is optional. With none, the group is open-cast: `open_cast`
    is flagged and the scene describes the pool the orchestrator casts from
    on the fly. A few listed members anchor the room; the scene can still
    invite more.
    """
    raw_members = g.get("members", []) or []
    members, unresolved = resolve_members(raw_members, collective, index)
    detail = {"active": g["id"], "name": g.get("name", g["id"]),
              "members": members, "unresolved": unresolved,
              "memory_enabled": bool(g.get("memory", False))}
    if g.get("scene"):
        detail["scene"] = g["scene"]
    if not raw_members:
        detail["open_cast"] = True
    return detail


def main():
    ap = argparse.ArgumentParser(description="Resolve the party-mode roster, lazily.")
    ap.add_argument("--config", required=True, help="Path to the skill's party.toml")
    ap.add_argument("--user-config", default=None,
                    help="Optional user override party.user.toml (merged over --config)")
    ap.add_argument("--party", help="Resolve full detail for this group id")
    ap.add_argument("--list-groups", action="store_true", help="Group names only")
    args = ap.parse_args()

    config_path = Path(args.config).resolve()
    user_path = Path(args.user_config).resolve() if args.user_config else \
        config_path.parent / "user" / "party.user.toml"

    party = load_party(config_path, user_path)
    groups = party.get("party_groups", []) or []
    default_party = party.get("default_party", "") or ""
    party_mode = party.get("party_mode", "session") or "session"
    party_memory = bool(party.get("party_memory", True))
    memory_dir = party.get("memory_dir", "")
    output_dir = party.get("output_dir", "")

    if args.list_groups:
        _emit({
            "party_mode": party_mode,
            "default_party": default_party,
            "groups": group_menu(groups),
            "memory_dir": memory_dir,
            "output_dir": output_dir,
        })
        return

    collective, index = build_collective(party.get("party_members", []))

    if args.party:
        g = find_group(groups, args.party)
        if g is None:
            _emit({"error": "unknown_group", "requested": args.party,
                   "available": group_menu(groups)})
            return
        _emit({**group_detail(g, collective, index), "party_mode": party_mode,
               "memory_dir": memory_dir, "output_dir": output_dir})
        return

    # Default: the active roster to load on entry.
    result = {"party_mode": party_mode, "groups": group_menu(groups),
              "memory_dir": memory_dir, "output_dir": output_dir}
    g = find_group(groups, default_party) if default_party else None
    if g is not None:
        result.update(group_detail(g, collective, index))
    else:
        result.update({"active": "collective",
                       "members": list(collective.values()),
                       "memory_enabled": party_memory})
    _emit(result)


def _emit(obj):
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8")
    sys.stdout.write(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
