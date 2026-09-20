#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Unit tests for resolve_party.py — merge, override, group resolution."""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import resolve_party as rp  # noqa: E402

MEMBERS = [
    {"code": "analyst", "name": "Mary", "icon": "📊", "title": "Analyst"},
    {"code": "pm", "name": "John", "icon": "📋", "title": "PM"},
]


class TestDeepMerge(unittest.TestCase):
    def test_scalar_override_wins(self):
        self.assertEqual(rp.deep_merge({"a": 1, "b": 2}, {"b": 3}), {"a": 1, "b": 3})

    def test_tables_deep_merge(self):
        merged = rp.deep_merge({"party": {"a": 1}}, {"party": {"b": 2}})
        self.assertEqual(merged["party"], {"a": 1, "b": 2})

    def test_keyed_arrays_merge_by_code(self):
        base = [{"code": "x", "name": "Old"}]
        over = [{"code": "x", "name": "New"}, {"code": "y", "name": "Append"}]
        merged = rp.deep_merge(base, over)
        self.assertEqual([m["name"] for m in merged], ["New", "Append"])

    def test_unkeyed_arrays_append(self):
        merged = rp.deep_merge([1, 2], [3])
        self.assertEqual(merged, [1, 2, 3])


class TestLoadParty(unittest.TestCase):
    def test_merges_user_override(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td) / "party.toml"
            user = Path(td) / "party.user.toml"
            base.write_text('[party]\nuser_name = "base"\nparty_memory = true\n')
            user.write_text('[party]\nuser_name = "user"\n')
            merged = rp.load_party(base, user)
            self.assertEqual(merged["user_name"], "user")
            self.assertTrue(merged["party_memory"])  # base field survives

    def test_missing_user_config_is_empty(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td) / "party.toml"
            base.write_text('[party]\nuser_name = "base"\n')
            merged = rp.load_party(base, Path(td) / "nope.toml")
            self.assertEqual(merged["user_name"], "base")

    def test_skill_root_placeholder_resolved(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td) / "party.toml"
            base.write_text('[party]\noutput_dir = "{skill-root}/outputs"\n')
            merged = rp.load_party(base, Path(td) / "nope.toml")
            self.assertEqual(merged["output_dir"], str(Path(td)) + "/outputs")


class TestBuildCollective(unittest.TestCase):
    def test_members_indexed_by_code_and_name(self):
        col, idx = rp.build_collective(MEMBERS)
        self.assertEqual(set(col), {"analyst", "pm"})
        self.assertEqual(idx["analyst"], "analyst")   # code
        self.assertEqual(idx["mary"], "analyst")      # name (ci)
        self.assertEqual(col["analyst"]["source"], "custom")

    def test_override_replaces_in_place(self):
        col, _ = rp.build_collective([*MEMBERS, {"code": "analyst", "name": "Mary-Custom", "persona": "p"}])
        # Override lands on the canonical code, not a new entry.
        self.assertEqual(col["analyst"]["name"], "Mary-Custom")
        self.assertEqual(col["analyst"]["persona"], "p")

    def test_member_without_code_skipped(self):
        col, _ = rp.build_collective([{"name": "Nameless"}])
        self.assertEqual(col, {})


class TestResolveMembers(unittest.TestCase):
    def setUp(self):
        self.col, self.idx = rp.build_collective([*MEMBERS, {"code": "morpheus", "name": "Morpheus"}])

    def test_resolves_in_listed_order_and_flags_unknowns(self):
        resolved, unresolved = rp.resolve_members(["morpheus", "analyst", "ghost"], self.col, self.idx)
        self.assertEqual([m["code"] for m in resolved], ["morpheus", "analyst"])
        self.assertEqual(unresolved, ["ghost"])

    def test_empty(self):
        self.assertEqual(rp.resolve_members([], self.col, self.idx), ([], []))


class TestGroups(unittest.TestCase):
    GROUPS = [
        {"id": "wr", "name": "Writers", "members": ["analyst", "morpheus"]},
        {"id": "bad"},  # no name -> falls back to id; no members -> count 0
        {"name": "no-id"},  # dropped from menu
    ]

    def test_menu_is_names_only_with_counts_and_open_cast_flag(self):
        menu = rp.group_menu(self.GROUPS)
        self.assertEqual(menu, [
            {"id": "wr", "name": "Writers", "member_count": 2},
            {"id": "bad", "name": "bad", "member_count": 0, "open_cast": True},
        ])

    def test_find_group(self):
        self.assertEqual(rp.find_group(self.GROUPS, "wr")["name"], "Writers")
        self.assertIsNone(rp.find_group(self.GROUPS, "missing"))


class TestGroupDetail(unittest.TestCase):
    def setUp(self):
        self.col, self.idx = rp.build_collective([*MEMBERS, {"code": "morpheus", "name": "Morpheus"}])

    def test_scene_passes_through_when_present(self):
        g = {"id": "tos-10-forward", "name": "Ten Forward", "members": ["morpheus"],
             "scene": "Late evening, a few rounds in."}
        d = rp.group_detail(g, self.col, self.idx)
        self.assertEqual(d["scene"], "Late evening, a few rounds in.")
        self.assertEqual([m["code"] for m in d["members"]], ["morpheus"])

    def test_scene_omitted_when_absent_or_empty(self):
        for g in ({"id": "g", "members": ["morpheus"]},
                  {"id": "g", "members": ["morpheus"], "scene": ""}):
            self.assertNotIn("scene", rp.group_detail(g, self.col, self.idx))

    def test_anchored_group_is_not_open_cast(self):
        g = {"id": "g", "members": ["morpheus"]}
        self.assertNotIn("open_cast", rp.group_detail(g, self.col, self.idx))

    def test_open_cast_group_flagged_with_empty_members(self):
        g = {"id": "rebels", "name": "Star Wars Rebels",
             "scene": "Figures from the Rebels universe drop in as the topic calls for them."}
        d = rp.group_detail(g, self.col, self.idx)
        self.assertTrue(d["open_cast"])
        self.assertEqual(d["members"], [])
        self.assertEqual(d["scene"][:7], "Figures")

    def test_memory_enabled_follows_group_flag_and_defaults_off(self):
        on = rp.group_detail({"id": "g", "members": ["morpheus"], "memory": True}, self.col, self.idx)
        self.assertTrue(on["memory_enabled"])
        off = rp.group_detail({"id": "g", "members": ["morpheus"], "memory": False}, self.col, self.idx)
        self.assertFalse(off["memory_enabled"])
        absent = rp.group_detail({"id": "g", "members": ["morpheus"]}, self.col, self.idx)
        self.assertFalse(absent["memory_enabled"])  # opt-in per named group


if __name__ == "__main__":
    unittest.main()
