import hashlib
import json
import os
import pathlib
import shutil
import tempfile

os.umask(0o077)

REPO_ROOT = pathlib.Path.home() / "pa_health_repos" / "PA_Health_Folded_2026"
SOURCES_DIR = REPO_ROOT / "sources"
CHUNKS_DIR = REPO_ROOT / "split_chunks"
SPLIT_THRESHOLD = 500_000
CHUNK_SIZE = 400_000

TEXT_EXTS = {".md", ".txt", ".json", ".csv", ".tsv", ".py", ".sh", ".html", ".htm", ".yaml", ".yml", ".log"}

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
    pathlib.Path.home() / "ez_multi_repo",
    pathlib.Path.home() / "goldenfoss-staging",
    pathlib.Path.home() / "handover_session_20261106",
    pathlib.Path.home() / "October_2026" / "animated-umbrella-PY2027-audit-v1.1.1",
    pathlib.Path.home() / "animated-umbrella",
    pathlib.Path.home() / "duck-dev" / "keystone-sync",
    pathlib.Path.home() / "audit_tools",
]

IGNORE_NAMES = {
    ".git",
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    ".venv",
    "venv",
    "dispatch_work_orders.py new",
    "dispatch_work_orders.py new 2",
    "Pennsylvania Medical Bill Defense Toolkit (1).pdf",
    "Pennsylvania Medical Bill Defense Toolkit (2).pdf",
    "Pennsylvania Medical Bill Defense Toolkit (3).md",
    "Pennsylvania Medical Debt Defense Framework (Rev. 2 — 05 Nov 2026)",
    "Pennsylvania Medical Debt Defense Framework (Rev. 4.1 — 05 Nov 2026)",
}

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def atomic_write_bytes(target: pathlib.Path, data: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".tmp_", dir=str(target.parent))
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_name, 0o600)
        os.replace(tmp_name, target)
    except Exception:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise

def split_large_text_files() -> list[dict]:
    if CHUNKS_DIR.exists():
        shutil.rmtree(CHUNKS_DIR)
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

    split_records = []
    for file_path in sorted(SOURCES_DIR.rglob("*")):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in TEXT_EXTS:
            continue
        size = file_path.stat().st_size
        if size <= SPLIT_THRESHOLD:
            continue

        rel_source = file_path.relative_to(REPO_ROOT).as_posix()
        out_dir = CHUNKS_DIR / file_path.relative_to(SOURCES_DIR).parent / file_path.name
        out_dir.mkdir(parents=True, exist_ok=True)

        parts = []
        idx = 1
        with file_path.open("rb") as src_f:
            while True:
                block = src_f.read(CHUNK_SIZE)
                if not block:
                    break
                part_path = out_dir / f"{file_path.name}.part{idx:03d}"
                atomic_write_bytes(part_path, block)
                parts.append({
                    "part": part_path.relative_to(REPO_ROOT).as_posix(),
                    "size": len(block),
                    "sha256": hashlib.sha256(block).hexdigest(),
                })
                idx += 1

        split_records.append({
            "source": rel_source,
            "original_size": size,
            "original_sha256": sha256_file(file_path),
            "parts": parts,
        })
    return split_records

def fold_and_manifest() -> None:
    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
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

    split_records = split_large_text_files()

    entries = []
    for base in (SOURCES_DIR, CHUNKS_DIR):
        if not base.exists():
            continue
        for file_path in sorted(base.rglob("*")):
            if file_path.is_file():
                rel = file_path.relative_to(REPO_ROOT).as_posix()
                entries.append({
                    "path": rel,
                    "size": file_path.stat().st_size,
                    "sha256": sha256_file(file_path),
                })

    manifest_bytes = json.dumps({
        "folded_targets": copied,
        "split_count": len(split_records),
        "splits": split_records,
        "file_count": len(entries),
        "files": entries,
    }, indent=2).encode("utf-8")

    manifest_path = REPO_ROOT / "FOLD_MANIFEST.json"
    atomic_write_bytes(manifest_path, manifest_bytes)

    digest_str = f"{hashlib.sha256(manifest_bytes).hexdigest()}  FOLD_MANIFEST.json\n"
    atomic_write_bytes(REPO_ROOT / "FOLD_MANIFEST.sha256", digest_str.encode("utf-8"))
    print(f"Folded {len(copied)} targets; split {len(split_records)} large text files; manifest files: {len(entries)}")

if __name__ == "__main__":
    fold_and_manifest()
