import hashlib
import json
import pathlib
import shutil

REPO_ROOT = pathlib.Path.home() / "pa_health_repos" / "PA_Health_Folded_2026"
SOURCES_DIR = REPO_ROOT / "sources"
SOURCES_DIR.mkdir(parents=True, exist_ok=True)

CANDIDATES = [
    pathlib.Path.home() / "pa_health_repos" / "Pennsylvania_Health_Insurance_November_2026",
    pathlib.Path.home() / "pa_health_repos" / "Pennsylvania_Health_Insurance_October_2026",
    pathlib.Path.home() / "pa_health_repos" / "Pennsylvania_Healthcare_September_2026",
    pathlib.Path.home() / "pa_health_repos" / "_extracted_sept2026",
    pathlib.Path.home() / "pa_audit",
    pathlib.Path.home() / "pa_audit_bundle",
    pathlib.Path.home() / "Keystone_Health",
    pathlib.Path.home() / "keystone-health-advocate-pa-medical-rights-wiki-forensic-tool",
    pathlib.Path.home() / "pa_ra_onepagers" / "pa_ra_onepagers",
    pathlib.Path.home() / "projects" / "keystone_health",
]

IGNORE_NAMES = {".git", "__pycache__", ".pytest_cache", "node_modules", ".venv", "venv"}

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def fold_all() -> None:
    copied = []
    for src in CANDIDATES:
        if not src.exists():
            continue
        dest = SOURCES_DIR / src.name
        shutil.copytree(
            src,
            dest,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(*IGNORE_NAMES),
        )
        copied.append(dest.relative_to(REPO_ROOT).as_posix())

    entries = []
    for file_path in sorted(SOURCES_DIR.rglob("*")):
        if file_path.is_file():
            rel = file_path.relative_to(REPO_ROOT).as_posix()
            entries.append({
                "path": rel,
                "size": file_path.stat().st_size,
                "sha256": sha256_file(file_path),
            })

    manifest_path = REPO_ROOT / "FOLD_MANIFEST.json"
    manifest_bytes = json.dumps({
        "folded_targets": copied,
        "file_count": len(entries),
        "files": entries,
    }, indent=2).encode("utf-8")
    manifest_path.write_bytes(manifest_bytes)

    digest_path = REPO_ROOT / "FOLD_MANIFEST.sha256"
    digest_path.write_text(f"{hashlib.sha256(manifest_bytes).hexdigest()}  FOLD_MANIFEST.json\n", encoding="utf-8")
    print(f"Folded {len(copied)} sources; manifest files: {len(entries)}")

if __name__ == "__main__":
    fold_all()
