#!/Users/gabi/.hermes/hermes-agent/venv/bin/python
"""Warung OS — TickTick Warung OS board collector.

Reads the 'Warung OS' TickTick project via the Hermes MCP TickTick server.
Writes a sanitized kanban state cache to a local file consumed by the snapshot
generator. This script is run separately from the snapshot generator so the
generator never needs to handle credentials directly.

SAFETY CONTRACT:
- Read-only: no tasks, boards, or comments are created, updated, or deleted.
- Sanitized: captures task title, column, priority, status, updated_at only.
  Task descriptions and comments are deliberately excluded.
- Credentials: loaded from Hermes profile .env by Hermes internals; never
  written to the cache output or stdout.
- Cache file: ~/.hermes/profiles/tech-director/cache/warung-os-ticktick-cache.json
  This file is never committed to git.

Usage:
  npm run ticktick:collect
  # or directly:
  HERMES_HOME=/Users/gabi/.hermes/profiles/tech-director \\
  HOME=/Users/gabi \\
  /Users/gabi/.hermes/hermes-agent/venv/bin/python scripts/collect-ticktick.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROFILE_HOME = Path("/Users/gabi/.hermes/profiles/tech-director")
HERMES_REPO = Path("/Users/gabi/.hermes/hermes-agent")
CACHE_FILE = PROFILE_HOME / "cache" / "warung-os-ticktick-cache.json"

WARUNG_OS_BOARD_NAME = "Warung OS"
PRIORITY_LABELS: dict[int, str] = {0: "none", 1: "low", 3: "medium", 5: "high"}


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value)


def parse_json_stream(value: Any) -> Any:
    if isinstance(value, (dict, list)) or value is None:
        return value
    text = str(value).strip()
    if not text:
        return []
    decoder = json.JSONDecoder()
    out: list[Any] = []
    idx = 0
    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break
        val, end = decoder.raw_decode(text, idx)
        out.append(val)
        idx = end
    return out[0] if len(out) == 1 else out


def unwrap(value: Any) -> Any:
    while isinstance(value, dict) and set(value.keys()) == {"result"}:
        value = value["result"]
    value = parse_json_stream(value)
    while isinstance(value, dict) and set(value.keys()) == {"result"}:
        value = parse_json_stream(value["result"])
    return value


class TickTick:
    def __init__(self) -> None:
        sys.path.insert(0, str(HERMES_REPO))
        load_dotenv(PROFILE_HOME / ".env")
        os.environ.setdefault("HOME", "/Users/gabi")
        os.environ.setdefault("HERMES_HOME", str(PROFILE_HOME))
        from tools.mcp_tool import _load_mcp_config, register_mcp_servers, _make_tool_handler  # type: ignore

        servers = _load_mcp_config()
        if "ticktick" not in servers:
            raise RuntimeError("TickTick MCP server not configured in Hermes profile — check config.yaml")
        register_mcp_servers({"ticktick": servers["ticktick"]})
        self._make_tool_handler = _make_tool_handler

    def call(self, tool: str, args: dict[str, Any] | None = None) -> Any:
        args = args or {}
        raw = self._make_tool_handler("ticktick", tool, 120)(args)
        obj = json.loads(raw)
        if "error" in obj:
            raise RuntimeError(f"{tool}: {obj['error']}")
        return unwrap(obj.get("result"))

    def close(self) -> None:
        try:
            from tools.mcp_tool import _stop_mcp_loop  # type: ignore
            _stop_mcp_loop()
        except Exception:
            pass


def priority_label(value: Any) -> str:
    try:
        return PRIORITY_LABELS.get(int(value or 0), f"unknown-{value}")
    except (TypeError, ValueError):
        return "none"


def collect() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    tt = TickTick()
    try:
        projects_raw = tt.call("list_projects", {})
        if isinstance(projects_raw, dict):
            projects_raw = [projects_raw]

        board = next(
            (p for p in (projects_raw or []) if isinstance(p, dict) and p.get("name") == WARUNG_OS_BOARD_NAME),
            None,
        )
        if not board:
            available = [p.get("name", "?") for p in (projects_raw or []) if isinstance(p, dict)]
            return {
                "ok": False,
                "error": f"Board '{WARUNG_OS_BOARD_NAME}' not found in TickTick. Available boards: {available}",
                "boards": [],
                "collected_at": now.isoformat(),
            }

        detail = tt.call("get_project_with_undone_tasks", {"project_id": board["id"]})
        if isinstance(detail, list) and len(detail) == 1:
            detail = detail[0]
        if not isinstance(detail, dict):
            return {
                "ok": False,
                "error": "Unexpected board detail payload from TickTick MCP",
                "boards": [],
                "collected_at": now.isoformat(),
            }

        columns: list[dict[str, Any]] = detail.get("columns") or []
        tasks: list[dict[str, Any]] = detail.get("tasks") or []

        col_by_id = {c["id"]: c.get("name", "Unknown") for c in columns if isinstance(c, dict) and c.get("id")}

        # Sanitize: capture only metadata fields — no description, no comments
        sanitized_tasks: list[dict[str, Any]] = []
        for task in tasks:
            if not isinstance(task, dict):
                continue
            col_id = task.get("columnId") or task.get("column_id") or None
            sanitized_tasks.append({
                "id": task.get("id", ""),
                "title": (task.get("title") or "").strip(),
                "column": col_by_id.get(col_id) if col_id else None,
                "column_id": col_id,
                "priority": priority_label(task.get("priority")),
                "status": task.get("status"),
                "updated_at": task.get("modifiedTime") or task.get("modified_time") or None,
            })

        col_counts: dict[str, int] = {}
        for task in sanitized_tasks:
            col = task.get("column") or "(no column)"
            col_counts[col] = col_counts.get(col, 0) + 1

        return {
            "ok": True,
            "error": None,
            "boards": [
                {
                    "board_id": board["id"],
                    "board_name": board.get("name", WARUNG_OS_BOARD_NAME),
                    "task_count": len(sanitized_tasks),
                    "column_counts": [
                        {"column": k, "count": v}
                        for k, v in sorted(col_counts.items(), key=lambda x: -x[1])
                    ],
                    "tasks": sanitized_tasks,
                    "collected_at": now.isoformat(),
                    "cache_age_hours": None,
                }
            ],
            "collected_at": now.isoformat(),
        }
    finally:
        tt.close()


def main() -> None:
    try:
        result = collect()
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if result["ok"]:
            for b in result.get("boards", []):
                print(f"[warung-os:ticktick] OK — {b['board_name']}: {b['task_count']} task(s)")
                for col in b.get("column_counts", []):
                    print(f"  {col['column']}: {col['count']}")
        else:
            print(f"[warung-os:ticktick] WARN — {result.get('error', 'unknown error')}")
            print("[warung-os:ticktick] Cache written with error state.")
        print(f"[warung-os:ticktick] Cache → {CACHE_FILE}")
        sys.exit(0)
    except Exception as e:
        error_result: dict[str, Any] = {
            "ok": False,
            "error": str(e),
            "boards": [],
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            CACHE_FILE.write_text(
                json.dumps(error_result, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        except Exception:
            pass
        print(f"[warung-os:ticktick] ERROR — {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
