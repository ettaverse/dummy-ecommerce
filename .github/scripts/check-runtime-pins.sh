#!/usr/bin/env bash
# Fail if Node or Bun is floating, or older than the October 2026 security releases.
# Floors: Node 22.23.4, 24.22.1, 26.12.1. Bun 1.4.4.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 - "$ROOT" << 'PY'
import json, os, re, sys

root = sys.argv[1]
skip_dirs = {
    ".git", "node_modules", "dist", "build", ".next", "vendor", "Assets",
    "target", "coverage", "lib", "out",
}
node_floors = {22: (22, 23, 4), 24: (24, 22, 1), 26: (26, 12, 1)}
bun_floor = (1, 4, 4)
scan_names = {
    "Dockerfile", "dockerfile", ".nvmrc", ".node-version", "amplify.yml",
}
failures = []

node_img = re.compile(r"(?<![\w-])node:(\d+)(?:\.(\d+))?(?:\.(\d+))?")
bun_img = re.compile(r"oven/bun:(\d+)(?:\.(\d+))?(?:\.(\d+))?")
node_key = re.compile(r"node-version:\s*['\"]?v?([^\s'\"]+)")
bun_key = re.compile(r"bun-version:\s*['\"]?([^\s'\"]+)")
lambda_rt = re.compile(r"nodejs(\d+)\.x")
nodesource = re.compile(r"setup_(\d+)\.x")
floating = re.compile(r"node:(?:lts|latest|current)\b", re.I)

def add(path, line_no, text):
    rel = os.path.relpath(path, root)
    failures.append(f"{rel}:{line_no}: {text}")

def as_tuple(parts):
    nums = []
    for p in parts:
        if p is None:
            return None
        nums.append(int(p))
    return tuple(nums)

def check_node_version(path, line_no, raw):
    token = raw.strip().strip("'\"")
    token = token.split()[0]
    token = re.sub(r"^[><=~^]+", "", token)
    if token.lower() in {"lts", "lts/*", "latest", "current", "node"} or token.endswith(".x"):
        add(path, line_no, f"floating Node pin {token!r}; use 22.23.4, 24.22.1, or 26.12.1")
        return
    m = re.match(r"v?(\d+)(?:\.(\d+))?(?:\.(\d+))?", token)
    if not m:
        add(path, line_no, f"unreadable Node pin {token!r}")
        return
    parts = as_tuple(m.groups())
    if parts is None or len(parts) < 3:
        add(path, line_no, f"Node pin {token!r} is not a full major.minor.patch")
        return
    floor = node_floors.get(parts[0])
    if floor is None or parts < floor:
        add(path, line_no, f"Node {token} is below the October 2026 floor for its line")

def check_bun_version(path, line_no, raw):
    token = raw.strip().strip("'\"")
    if token in {"latest", "canary", "bun"}:
        add(path, line_no, f"floating Bun pin {token!r}; use 1.4.4 or newer")
        return
    m = re.match(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?", token)
    if not m:
        add(path, line_no, f"unreadable Bun pin {token!r}")
        return
    parts = as_tuple(m.groups())
    if parts is None or len(parts) < 3:
        add(path, line_no, f"Bun pin {token!r} is not a full major.minor.patch")
        return
    if parts < bun_floor:
        add(path, line_no, f"Bun {token} is older than 1.4.4")

def interesting(path):
    base = os.path.basename(path)
    rel = os.path.relpath(path, root)
    if base in scan_names or base.startswith("Dockerfile"):
        return True
    if rel.startswith(".github/workflows/") and base.endswith((".yml", ".yaml")):
        return True
    if rel.startswith(".circleci/") and base.endswith((".yml", ".yaml")):
        return True
    if base.startswith("docker-compose") and base.endswith((".yml", ".yaml")):
        return True
    if base.endswith(".tf"):
        return True
    if base == "package.json":
        return True
    return False

def scan_text(path, text):
    base = os.path.basename(path)
    if base == "package.json":
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return
        eng = (data.get("engines") or {}).get("node")
        if isinstance(eng, str):
            check_node_version(path, 1, eng)
        return
    if base in {".nvmrc", ".node-version"}:
        check_node_version(path, 1, text.strip())
        return
    for i, line in enumerate(text.splitlines(), 1):
        raw = line.split("#", 1)[0]
        if floating.search(raw):
            add(path, i, "floating node:lts/latest/current image")
        for m in node_img.finditer(raw):
            check_node_version(path, i, ".".join(p or "" for p in m.groups()).strip("."))
        for m in node_key.finditer(raw):
            check_node_version(path, i, m.group(1))
        for m in bun_img.finditer(raw):
            check_bun_version(path, i, ".".join(p or "" for p in m.groups()).strip("."))
        for m in bun_key.finditer(raw):
            check_bun_version(path, i, m.group(1))
        for m in lambda_rt.finditer(raw):
            major = int(m.group(1))
            if major not in node_floors:
                add(path, i, f"Lambda runtime nodejs{major}.x has no October 2026 fix; use nodejs22.x or newer")
        if nodesource.search(raw):
            add(path, i, "NodeSource setup_N.x floats; copy a patched node image instead")

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [
        d for d in dirnames
        if d not in skip_dirs and (not d.startswith(".") or d in {".github", ".circleci"})
    ]
    for name in filenames:
        path = os.path.join(dirpath, name)
        if not interesting(path):
            continue
        try:
            text = open(path, errors="ignore").read()
        except OSError:
            continue
        scan_text(path, text)

if failures:
    print("Unpatched or floating Node/Bun pins:")
    for item in failures:
        print(" ", item)
    sys.exit(1)
print("Node and Bun pins meet the October 2026 floors.")
PY
