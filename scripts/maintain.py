#!/usr/bin/env python3
"""maintain.py — full maintenance cycle:

  1. repo-sync     ff-only sync main repo from origin/main
  2. wiki-sync     ff-only sync wiki clone from origin/master
  3. wiki-repair   enforce ASCII-slug pipe links, banner, missing ES pages
  4. mirror        mirror wiki/*.md + _Sidebar.md + _Footer.md -> repo/wiki/,
                   remove orphans whose filenames no longer exist upstream
  5. handover      refresh HANDOVER payloads (root + both sub-copies)
  6. manifest      stage content FIRST, then regenerate + verify manifest
  7. push          commit & push repo (origin main) and wiki (origin master)
  8. dependabot    list open alerts (dismissals need --dismiss, off by default)

Usage: python3 maintain.py [--steps 1-6,8] [--skip-dependabot]
Default: all steps, dependabot LIST-only (never auto-dismiss).
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile
from datetime import date
from pathlib import Path

HOME      = Path.home()
REPO      = HOME / "pa_health_repos" / "PA_Health_Folded_2026"
WIKI      = HOME / "pa_health_wikis" / "Pennsylvania_Health_Insurance_2026.wiki"
GHSA_REPO = "bilbywilby/Pennsylvania_Health_Insurance_2026"
MANIFEST  = "FOLD_MANIFEST.sha256"
BANNER_EN = "> ⚠️ **Disclaimer:** Educational information only — not legal, medical, or financial advice. Laws change; verify citations against current statutes before filing anything.\n"
BANNER_ES = "> ⚠️ **Aviso:** Información educativa únicamente — no es asesoría legal, médica ni financiera. Las leyes cambian; verifique las citas antes de presentar cualquier documento.\n"

STEP_NAMES = ["repo-sync", "wiki-sync", "wiki-repair", "mirror",
              "handover", "manifest", "push", "dependabot"]

def die(m): print(f"FATAL: {m}", file=sys.stderr); sys.exit(1)
def sh(args, cwd=REPO, check=True):
    r = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if r.check_needed if False else (r.returncode != 0 and check):
        die(f"{' '.join(args)}\n{r.stderr.strip()}")
    return r.stdout

def atomic_write(path: Path, data: bytes) -> bool:
    """True if bytes or mode changed; False if identical 0600 already."""
    if path.exists() and path.read_bytes() == data \
       and path.stat().st_mode & 0o777 == 0o600:
        return False
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.chmod(tmp, 0o600); os.replace(tmp, path)
    finally:
        Path(tmp).unlink(missing_ok=True)
    return True

def step_repo_sync():
    sh(["git", "fetch", "--quiet", "origin", "main"])
    sh(["git", "merge", "--ff-only", "origin/main"])
    print("repo-sync: OK")

def step_wiki_sync():
    if not (WIKI / ".git").is_dir():
        die(f"wiki clone missing: {WIKI} — run the seed/clone step once")
    sh(["git", "pull", "--ff-only", "origin", "master"], cwd=WIKI)
    print("wiki-sync: OK")

def step_wiki_repair():
    """Fix known link-convention drift in wiki pages (idempotent)."""
    fixes = 0
    REPLACES = {
        "[[Start Here]]":       "[[Start Here|Start-Here]]",
        "[[Template Library]]": "[[Template Library|Template-Library]]",
        "[[Avoid These Mistakes]]": "[[Avoid These Mistakes|Avoid-These-Mistakes]]",
        "[[Citations & Sources]]":  "[[Citations & Sources|Citations-and-Sources]]",
        "[[Surprise Bill Playbook]]": "[[Surprise Bill Playbook|Surprise-Bill-Playbook]]",
        "[[Medical Debt Defense Playbook]]": "[[Medical Debt Defense Playbook|Medical-Debt-Defense-Playbook]]",
        "[[Hospital Financial Assistance Guide]]": "[[Hospital Financial Assistance Guide|Hospital-Financial-Assistance-Guide]]",
        "[[Insurer Dispute Playbook]]": "[[Insurer Dispute Playbook|Insurer-Dispute-Playbook]]",
        "[[Empiece aquí]]":  "[[Empiece aquí|Empiece-aqui]]",
    }
    for p in WIKI.glob("*.md"):
        if p.name.startswith("_"): continue
        t = p.read_text(encoding="utf-8", errors="replace"); orig = t
        for old, new in REPLACES.items(): t = t.replace(old, new)
        if "⚠️" not in t:  # ensure banner on consumer-facing pages
            lines = t.split("\n")
            banner = BANNER_ES if "Guia-" in p.name or "Inicio" in p.name \
                     or "Empiece" in p.name else BANNER_EN
            t = banner + t
        if t != orig:
            atomic_write(p, t.encode()); fixes += 1
    print(f"wiki-repair: {fixes} page(s) touched")

def step_mirror():
    (REPO / "wiki").mkdir(exist_ok=True)
    wiki_pages = {p.name: p for p in WIKI.rglob("*.md")}
    synced = removed = 0
    for name, src in wiki_pages.items():
        if atomic_write(REPO / "wiki" / name, src.read_bytes()): synced += 1
    for dst in (REPO / "wiki").rglob("*.md"):
        if dst.name not in wiki_pages:   # orphan: deleted upstream
            dst.unlink(); removed += 1
    print(f"mirror: {len(wiki_pages)} mirrored, {synced} updated, {removed} orphan(s) removed")

def step_handover():
    base = sh(["git", "rev-parse", "--short", "HEAD"]).strip()
    HANDOVER = {
        "repository": {"name": "PA_Health_Folded_2026", "remote": "origin/main",
                       "base_verified_commit": base, "manifest_file": MANIFEST,
                       "audit_date": date.today().isoformat()},
        "completed_work": [
            "Normalized invisible and non-standard Unicode characters across sources, top-level docs, and folded scripts (commits 82db0b8 and c9967d0).",
            "Repaired unescaped inner quotes and comments in dispute_template_escalation.schema.json and data/debts.json copies.",
            "Replaced placeholder stubs in HANDOVER.json copies with valid JSON (commit 2a53d1e) and verified FOLD_MANIFEST.sha256.",
            "Dismissed Dependabot moderate alerts #91-#93 (vendored agents snapshot) as not_used; refreshed root HANDOVER.json and wiki mirror."],
        "forensic_standards": {
            "variance_thresholds_pct": {"pass_max_exclusive": 15,
                "potential_audit_min_inclusive": 15,
                "potential_audit_max_inclusive": 40,
                "critical_overcharge_min_exclusive": 40},
            "version_conflict_rule": "v_in > v_t",
            "regulatory_frameworks": ["No Surprises Act (45 CFR § 149)",
                "IRS Section 501(r)", "PA Act 252-2023", "PA SB 1071",
                "PA FCEUA / UTPCPL", "42 Pa.C.S. § 5525(a)"],
            "py2027_benchmarks": {
                "individual_approved_weighted_avg_pct": 15.97,
                "small_group_approved_weighted_avg_pct": 10.28,
                "denied_requested_premium_increases_usd": 94700000,
                "pennie_enrollment_approx": {"peak_2025": 497000,
                                             "september_2026": 417000},
                "cost_sharing_limits_2027_usd": {"self_only": 12000,
                                                 "family": 24000}}},
        "open_follow_ups": [
            {"id": "dependabot-moderate-alerts", "status": "resolved",
             "detail": "3 moderate alerts (#91,#92,#93, vendored 'agents' under sources/_extracted_sept2026) dismissed 2026-11-27 as not_used with documented rationale."},
            {"id": "jsonc-classification", "status": "open",
             "detail": "tsconfig.* and Pond_Funding.json are JSONC/JSON5, not strict JSON — validator must skip or classify them."}],
    }
    payload = (json.dumps(HANDOVER, indent=2, ensure_ascii=False) + "\n").encode()
    touched = 0
    for rel in ("HANDOVER.json",
                "scripts/folded/projects__keystone_health__HANDOVER.json",
                "sources/keystone_health/HANDOVER.json"):
        p = REPO / rel
        if p.is_file() and atomic_write(p, payload): touched += 1
        elif not p.is_file(): print(f"handover: WARN missing {rel}")
    print(f"handover: {touched} copy(ies) updated (base {base})")

def step_manifest():
    sh(["git", "add", "-A"])   # stage content FIRST so new files are tracked
    tracked = [e for e in sh(["git", "ls-files", "-z"]).split("\0")
               if e and e != MANIFEST]
    lines = []
    for rel in tracked:
        h = hashlib.sha256()
        with open(REPO / rel, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
        lines.append(f"{h.hexdigest()}  {rel}")
    if atomic_write(REPO / MANIFEST, ("\n".join(lines) + "\n").encode()) is False \
       and lines != (REPO / MANIFEST).read_text(encoding="utf-8").rstrip("\n").split("\n"):
        pass  # identical content, mode already enforced
    sh(["git", "add", MANIFEST])
    # independent verification: rehash every entry
    bad = 0
    for ln in (REPO / MANIFEST).read_text(encoding="utf-8").rstrip("\n").split("\n"):
        digest, rel = ln.split("  ", 1)
        h = hashlib.sha256()
        with open(REPO / rel, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
        if h.hexdigest() != digest: print(f"  MISMATCH: {rel}"); bad += 1
    if bad: die(f"{bad} manifest verification failure(s)")
    print(f"manifest: verified ({len(lines)} entries)")

def step_push():
    r = subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=REPO)
    if r.returncode == 0:
        print("push: no staged changes")
    else:
        sh(["git", "commit", "-m",
            "chore(maintain): sync wiki mirror, refresh handover and manifest"])
        sh(["git", "push", "origin", "HEAD:main"])
        print("push: pushed HEAD -> origin/main")
    wr = subprocess.run(["git", "status", "--porcelain"], cwd=WIKI,
                        text=True, capture_output=True)
    if wr.stdout.strip():
        sh(["git", "add", "-A"], cwd=WIKI)
        if subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=WIKI).returncode:
            sh(["git", "commit", "-m", "chore(maintain): wiki repairs"], cwd=WIKI)
            sh(["git", "push", "origin", "master"], cwd=WIKI)
            print("push: wiki repairs pushed -> origin/master")
    ab = sh(["git", "rev-list", "--left-right", "--count",
             "HEAD...origin/main"]).strip()
    print(f"sync-state: {ab}")

def step_dependabot(dismiss=False):
    r = subprocess.run(["gh", "api", "--paginate",
        f"repos/{GHSA_REPO}/dependabot/alerts?state=open"],
        capture_output=True, text=True)
    if r.returncode != 0:
        print(f"dependabot: warn gh api rc={r.returncode}: {r.stderr.strip()}"); return
    alerts = json.loads(r.stdout) if r.stdout.strip() else []
    print(f"dependabot: {len(alerts)} open alert(s) (all severities)")
    for a in alerts:
        dep = a.get("dependency", {})
        print(f"  #{a.get('number')} | {dep.get('package',{}).get('name','?')} | "
              f"{a.get('security_advisory',{}).get('ghsa_id','?')} | "
              f"{dep.get('manifest_path','?')}")
    if dismiss:
        for a in alerts:
            if a.get("dependency", {}).get("manifest_path", "") \
                 .startswith("sources/_extracted_sept2026/"):
                d = subprocess.run(["gh", "api", "-X", "PATCH",
                    f"repos/{GHSA_REPO}/dependabot/alerts/{a['number']}",
                    "-f", "state=dismissed", "-f", "dismissed_reason=not_used",
                    "-f", "dismissed_comment=Vendored archive snapshot under sources/_extracted_sept2026; not an active dependency."],
                    capture_output=True, text=True)
                print(f"  dismissed #{a['number']}" if d.returncode == 0
                      else f"  FAIL #{a['number']}: {d.stderr.strip()}")

def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--steps", default=",".join(STEP_NAMES[:-1]) + ",dependabot",
                    help="comma-separated steps (names or indices 1-8)")
    ap.add_argument("--dismiss", action="store_true",
                    help="DANGEROUS: dismiss vendored dependabot alerts")
    args = ap.parse_args()
    chosen = set()
    for tok in args.steps.split(","):
        tok = tok.strip()
        if tok.isdigit(): chosen.add(STEP_NAMES[int(tok) - 1])
        else: chosen.add(tok)
    unknown = chosen - set(STEP_NAMES)
    if unknown: die(f"unknown step(s): {unknown}")
    if not (REPO / ".git").is_dir(): die(f"not a repo: {REPO}")

    runners = {"repo-sync": step_repo_sync, "wiki-sync": step_wiki_sync,
               "wiki-repair": step_wiki_repair, "mirror": step_mirror,
               "handover": step_handover, "manifest": step_manifest,
               "push": step_push,
               "dependabot": lambda: step_dependabot(args.dismiss)}
    for name in STEP_NAMES:
        if name in chosen:
            print(f"== {name} ==")
            runners[name]()
    print("MAINTAIN: DONE")

if __name__ == "__main__":
    main()
