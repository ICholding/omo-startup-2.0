#!/usr/bin/env python3
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def hr(title: str):
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)

def run(cmd, cwd=ROOT, check=True):
    print(f"\n$ {' '.join(cmd)}  (cwd={cwd})")
    p = subprocess.run(
        cmd,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=os.environ.copy(),
    )
    print(p.stdout)
    if check and p.returncode != 0:
        print(f"\n!! Command failed (exit={p.returncode}): {' '.join(cmd)}")
        sys.exit(p.returncode)
    return p.returncode, p.stdout

def safe_env_dump():
    keys = sorted([k for k in os.environ.keys()])
    print("ENV KEYS:", ", ".join(keys))

def ls_tree(path: Path, max_entries=250):
    entries = []
    for p in sorted(path.rglob("*")):
        rel = p.relative_to(path)
        if rel.parts and rel.parts[0] in ("node_modules", ".git", ".cache", "dist", "build", ".next"):
            continue
        if p.is_dir():
            continue
        entries.append(str(rel))
        if len(entries) >= max_entries:
            entries.append("... (truncated)")
            break
    print("\n".join(entries) if entries else "(no files found)")

def main():
    hr("RENDER FRONTEND BUILD DIAGNOSTICS")
    print("PWD:", os.getcwd())
    print("ROOT:", ROOT)
    print("Python:", sys.version.replace("\n", " "))
    print("Platform:", platform.platform())
    print("CI:", os.environ.get("CI"))
    safe_env_dump()

    hr("CHECK TOOLING AVAILABILITY")
    for tool in ["node", "npm", "pnpm", "yarn"]:
        print(f"{tool}: ", shutil.which(tool))

    if shutil.which("node"):
        run(["node", "-v"], check=False)
    if shutil.which("npm"):
        run(["npm", "-v"], check=False)
    if shutil.which("pnpm"):
        run(["pnpm", "-v"], check=False)
    if shutil.which("yarn"):
        run(["yarn", "-v"], check=False)

    hr("FRONTEND DIRECTORY CONTENTS (SANITY)")
    if not ROOT.exists():
        print("ERROR: frontend directory not found.")
        sys.exit(2)
    print("Top-level files:", [p.name for p in sorted(ROOT.iterdir())][:80])
    print("\nFile listing (trimmed):")
    ls_tree(ROOT)

    pkg_path = ROOT / "package.json"
    if not pkg_path.exists():
        hr("ERROR")
        print("package.json not found inside frontend/. Render Root Directory is likely wrong.")
        sys.exit(3)

    hr("PACKAGE.JSON SUMMARY")
    try:
        pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    except Exception as e:
        print("Failed to parse package.json:", e)
        sys.exit(4)

    print("name:", pkg.get("name"))
    print("type:", pkg.get("type"))
    print("engines:", pkg.get("engines"))
    scripts = pkg.get("scripts", {})
    print("scripts:", json.dumps(scripts, indent=2))

    hr("DETERMINE INSTALL STRATEGY")
    has_pnpm = (ROOT / "pnpm-lock.yaml").exists()
    has_npm  = (ROOT / "package-lock.json").exists()
    has_yarn = (ROOT / "yarn.lock").exists()

    print("Lockfiles:", {
        "pnpm-lock.yaml": has_pnpm,
        "package-lock.json": has_npm,
        "yarn.lock": has_yarn,
    })

    if has_pnpm and shutil.which("pnpm"):
        installer = ["pnpm", "install", "--frozen-lockfile"]
        runner_build = ["pnpm", "run", "build"]
    elif has_yarn and shutil.which("yarn"):
        installer = ["yarn", "install", "--frozen-lockfile"]
        runner_build = ["yarn", "build"]
    else:
        if has_npm:
            installer = ["npm", "ci"]
        else:
            installer = ["npm", "install"]
        runner_build = ["npm", "run", "build"]

    print("Installer command:", installer)
    print("Build command:", runner_build)

    hr("INSTALL DEPENDENCIES")
    run(installer, check=True)

    hr("RUN BUILD")
    run(runner_build, check=True)

    hr("LOCATE BUILD OUTPUT")
    candidates = ["dist", "build", ".next"]
    found = []
    for c in candidates:
        p = ROOT / c
        if p.exists() and p.is_dir():
            found.append(c)
    print("Build output candidates found:", found)

    if "dist" in found:
        publish_dir = ROOT / "dist"
    elif "build" in found:
        publish_dir = ROOT / "build"
    else:
        if ".next" in found:
            print("\nNOTE: Detected .next. This is likely Next.js.")
            print("If you want Static Site: ensure `next export` is used and output is `out/`.")
        print("\nERROR: No dist/ or build/ directory produced. Build succeeded but output folder missing.")
        sys.exit(5)

    print("Publish directory:", publish_dir)
    hr("PUBLISH DIRECTORY LISTING (TOP)")
    out_files = []
    for p in sorted(publish_dir.rglob("*")):
        if p.is_file():
            out_files.append(str(p.relative_to(publish_dir)))
        if len(out_files) >= 120:
            out_files.append("... (truncated)")
            break
    print("\n".join(out_files) if out_files else "(empty output dir)")

    hr("SUCCESS")
    print("Frontend build diagnostics completed successfully.")

if __name__ == "__main__":
    main()
