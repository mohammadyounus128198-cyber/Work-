#!/usr/bin/env python3
"""Unit tests for tools/build-mirror.py (v0.1.0).

Tests cover load_latest_trace() and build() using temporary directories
so the real repository tree is never modified.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Load the module under test without executing its __main__ block.
# ---------------------------------------------------------------------------
_THIS_DIR = Path(__file__).resolve().parent
_MODULE_PATH = _THIS_DIR / "build-mirror.py"

spec = importlib.util.spec_from_file_location("build_mirror", _MODULE_PATH)
_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_mod)

load_latest_trace = _mod.load_latest_trace
build = _mod.build


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_trace(trace_dir: Path, name: str, payload: dict) -> Path:
    trace_dir.mkdir(parents=True, exist_ok=True)
    p = trace_dir / name
    p.write_text(json.dumps(payload))
    return p


# ---------------------------------------------------------------------------
# Tests for load_latest_trace()
# ---------------------------------------------------------------------------

class TestLoadLatestTrace(unittest.TestCase):
    """Tests for the load_latest_trace() function."""

    def test_returns_none_when_directory_missing(self):
        """load_latest_trace returns None when the classified dir does not exist."""
        with patch.object(_mod, "TLC_TRACE", Path("/nonexistent/path/classified")):
            result = load_latest_trace()
        self.assertIsNone(result)

    def test_returns_none_when_directory_empty(self, tmp_path=None):
        """load_latest_trace returns None when the directory exists but has no JSON files."""
        import tempfile, os
        with tempfile.TemporaryDirectory() as tmpdir:
            trace_dir = Path(tmpdir) / "classified"
            trace_dir.mkdir()
            with patch.object(_mod, "TLC_TRACE", trace_dir):
                result = load_latest_trace()
        self.assertIsNone(result)

    def test_returns_parsed_json_for_single_trace(self):
        """load_latest_trace parses and returns JSON when one trace file exists."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            trace_dir = Path(tmpdir) / "classified"
            payload = {"peaks": [1, 2, 3], "status": "ok"}
            _write_trace(trace_dir, "trace_001.json", payload)
            with patch.object(_mod, "TLC_TRACE", trace_dir):
                result = load_latest_trace()
        self.assertEqual(result, payload)

    def test_returns_alphabetically_last_trace_when_multiple_exist(self):
        """load_latest_trace picks the last file alphabetically (sorted reverse=True)."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            trace_dir = Path(tmpdir) / "classified"
            _write_trace(trace_dir, "trace_a.json", {"id": "a"})
            _write_trace(trace_dir, "trace_b.json", {"id": "b"})
            _write_trace(trace_dir, "trace_c.json", {"id": "c"})
            with patch.object(_mod, "TLC_TRACE", trace_dir):
                result = load_latest_trace()
        self.assertEqual(result["id"], "c")

    def test_ignores_non_json_files(self):
        """load_latest_trace only considers *.json files, not other extensions."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            trace_dir = Path(tmpdir) / "classified"
            trace_dir.mkdir(parents=True)
            (trace_dir / "notes.txt").write_text("not json")
            (trace_dir / "data.csv").write_text("a,b,c")
            with patch.object(_mod, "TLC_TRACE", trace_dir):
                result = load_latest_trace()
        self.assertIsNone(result)

    def test_returns_correct_json_content(self):
        """load_latest_trace returns the exact parsed content of the chosen file."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            trace_dir = Path(tmpdir) / "classified"
            payload = {
                "peaks": [{"x": 1.0, "y": 2.0}],
                "metadata": {"run": 42},
                "status": "classified",
            }
            _write_trace(trace_dir, "run_42.json", payload)
            with patch.object(_mod, "TLC_TRACE", trace_dir):
                result = load_latest_trace()
        self.assertEqual(result["peaks"], [{"x": 1.0, "y": 2.0}])
        self.assertEqual(result["metadata"]["run"], 42)


# ---------------------------------------------------------------------------
# Tests for build()
# ---------------------------------------------------------------------------

class TestBuild(unittest.TestCase):
    """Tests for the build() function."""

    def _run_build(self, tmpdir_path: Path, traces=None, invariants_content=None):
        """Helper: sets up a temp directory tree and runs build(), returning (mirror, log)."""
        trace_dir = tmpdir_path / "tlc" / "traces" / "classified"
        mirror_dir = tmpdir_path / "digital-mirror"
        mirror_dir.mkdir(parents=True)
        mirror_path = mirror_dir / "mirror.json"
        log_path = mirror_dir / "mirror-build-log.md"

        if traces:
            for name, payload in traces.items():
                _write_trace(trace_dir, name, payload)

        patches = [
            patch.object(_mod, "TLC_TRACE", trace_dir),
            patch.object(_mod, "MIRROR", mirror_path),
            patch.object(_mod, "LOG", log_path),
        ]
        if invariants_content is not None:
            spec_dir = tmpdir_path / "spec" / "modules"
            spec_dir.mkdir(parents=True)
            inv_file = spec_dir / "Invariants.tla"
            inv_file.write_text(invariants_content)
            patches.append(patch.object(_mod, "INVARIANTS", inv_file))

        for p in patches:
            p.start()
        try:
            build()
        finally:
            for p in patches:
                p.stop()

        mirror = json.loads(mirror_path.read_text())
        log = log_path.read_text()
        return mirror, log

    def test_build_creates_mirror_json(self):
        """build() creates digital-mirror/mirror.json with required top-level keys."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        required_keys = {"version", "invariants", "last_run", "oracle_state", "peaks"}
        self.assertTrue(required_keys.issubset(mirror.keys()), f"Missing keys: {required_keys - set(mirror.keys())}")

    def test_build_version_is_0_1_0(self):
        """build() writes version 0.1.0 to the mirror."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        self.assertEqual(mirror["version"], "0.1.0")

    def test_build_without_trace_produces_empty_last_run(self):
        """build() sets last_run to empty dict when no trace files exist."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        self.assertEqual(mirror["last_run"], {})

    def test_build_without_trace_produces_empty_peaks(self):
        """build() sets peaks to empty list when no trace files exist."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        self.assertEqual(mirror["peaks"], [])

    def test_build_with_trace_includes_trace_data_in_last_run(self):
        """build() includes trace data in last_run when a trace file exists."""
        import tempfile
        payload = {"status": "ok", "peaks": [10, 20]}
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir), traces={"run_1.json": payload})
        self.assertEqual(mirror["last_run"], payload)

    def test_build_with_trace_includes_peaks(self):
        """build() propagates trace peaks to the top-level peaks field."""
        import tempfile
        payload = {"peaks": [{"x": 1}, {"x": 2}], "status": "ok"}
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir), traces={"run_1.json": payload})
        self.assertEqual(mirror["peaks"], [{"x": 1}, {"x": 2}])

    def test_build_with_trace_missing_peaks_key(self):
        """build() uses empty list for peaks when trace has no 'peaks' key."""
        import tempfile
        payload = {"status": "ok", "count": 5}
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir), traces={"run_1.json": payload})
        self.assertEqual(mirror["peaks"], [])

    def test_build_oracle_state_structure(self):
        """build() always includes the expected oracle_state fields."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        oracle = mirror["oracle_state"]
        self.assertEqual(oracle["kernel"], "stable")
        self.assertEqual(oracle["spatial_layer"], "active")
        self.assertEqual(oracle["agents"], "idle")

    def test_build_invariants_are_hardcoded(self):
        """build() always writes the hardcoded invariant list."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(Path(tmpdir))
        self.assertIn("TypeOK", mirror["invariants"])
        self.assertIn("OutputWellFormed", mirror["invariants"])

    def test_build_creates_log_file(self):
        """build() creates the mirror-build-log.md file."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            _, log = self._run_build(Path(tmpdir))
        self.assertIn("Mirror Build Log", log)

    def test_build_log_contains_version(self):
        """build() log mentions v0.1.0."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            _, log = self._run_build(Path(tmpdir))
        self.assertIn("v0.1.0", log)

    def test_build_log_trace_included_false_when_no_trace(self):
        """build() log records 'Trace included: False' when no traces."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            _, log = self._run_build(Path(tmpdir))
        self.assertIn("Trace included: False", log)

    def test_build_log_trace_included_true_when_trace_exists(self):
        """build() log records 'Trace included: True' when a trace is loaded."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            _, log = self._run_build(
                Path(tmpdir), traces={"trace.json": {"peaks": []}}
            )
        self.assertIn("Trace included: True", log)

    def test_build_mirror_is_valid_json(self):
        """build() produces valid JSON in the mirror file (no parse errors)."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror_dir = Path(tmpdir) / "digital-mirror"
            mirror_dir.mkdir(parents=True)
            mirror_path = mirror_dir / "mirror.json"
            log_path = mirror_dir / "mirror-build-log.md"
            trace_dir = Path(tmpdir) / "tlc" / "traces" / "classified"
            with patch.object(_mod, "TLC_TRACE", trace_dir), \
                 patch.object(_mod, "MIRROR", mirror_path), \
                 patch.object(_mod, "LOG", log_path):
                build()
            # Must not raise
            parsed = json.loads(mirror_path.read_text())
        self.assertIsInstance(parsed, dict)

    def test_build_overwrites_existing_mirror(self):
        """build() overwrites a pre-existing mirror.json."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror_dir = Path(tmpdir) / "digital-mirror"
            mirror_dir.mkdir(parents=True)
            mirror_path = mirror_dir / "mirror.json"
            log_path = mirror_dir / "mirror-build-log.md"
            trace_dir = Path(tmpdir) / "tlc" / "traces" / "classified"
            # Write stale content
            mirror_path.write_text('{"version": "0.0.0", "stale": true}')
            with patch.object(_mod, "TLC_TRACE", trace_dir), \
                 patch.object(_mod, "MIRROR", mirror_path), \
                 patch.object(_mod, "LOG", log_path):
                build()
            mirror = json.loads(mirror_path.read_text())
        self.assertEqual(mirror["version"], "0.1.0")
        self.assertNotIn("stale", mirror)

    def test_build_picks_latest_of_multiple_traces(self):
        """build() uses the alphabetically last trace when multiple exist."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            mirror, _ = self._run_build(
                Path(tmpdir),
                traces={
                    "trace_a.json": {"peaks": [1], "id": "a"},
                    "trace_b.json": {"peaks": [2], "id": "b"},
                    "trace_z.json": {"peaks": [99], "id": "z"},
                },
            )
        self.assertEqual(mirror["peaks"], [99])
        self.assertEqual(mirror["last_run"]["id"], "z")

    def test_build_oracle_state_independent_of_trace(self):
        """oracle_state structure is the same regardless of whether a trace exists."""
        import tempfile
        with tempfile.TemporaryDirectory() as t1, tempfile.TemporaryDirectory() as t2:
            mirror_no_trace, _ = self._run_build(Path(t1))
            mirror_with_trace, _ = self._run_build(
                Path(t2), traces={"t.json": {"peaks": []}}
            )
        self.assertEqual(mirror_no_trace["oracle_state"], mirror_with_trace["oracle_state"])


if __name__ == "__main__":
    unittest.main()