#!/bin/sh
# ez_reconcile_repo.sh - fix the "remote already has web-uploaded files" situation without force-pushing.
# Paste-safe: works pasted into Termux or as `bash ez_reconcile_repo.sh [options]`. Writes ~/ez_reconcile_repo.py and runs it.
# DEFAULT = PLAN ONLY (reads GitHub, changes nothing). Then run again with --apply or --push.
# Options: --apply (build + check the cleanup commit locally) | --push (apply, push fast-forward only, swap work dir)
#          --zip PATH  --remote-url URL  --skip-hook
# Never force-pushes, never touches your current ~/Pennsylvania_Health_Insurance_November_2026 until a successful push
# (then it is RENAMED into ~/pa_nov2026_review, not deleted), never touches /sdcard.
mkdir -p "$HOME/.cache/ez_reconcile"
cat > "$HOME/ez_reconcile_repo.py" <<'PYEOF'
#!/usr/bin/env python3
"""ez_reconcile_repo.py - ASCII only. Exit codes: 0 ok | 2 precondition | 3 no GitHub login | 5 hook failed | 6 push failed | 7 remote moved."""
import argparse, datetime, hashlib, os, re, shutil, subprocess, sys, zipfile
from pathlib import Path

HOME = Path(os.environ.get("HOME", str(Path.home()))).resolve()
OWNER, NAME = "bilbywilby", "Pennsylvania_Health_Insurance_November_2026"
SSH_URL = "git@github.com:%s/%s.git" % (OWNER, NAME)
STAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
LOG = HOME / ("ez_reconcile_%s.txt" % STAMP)
WORK = HOME / NAME
CACHE = HOME / ".cache" / "ez_reconcile" / STAMP
REVIEW = HOME / "pa_nov2026_review" / STAMP
SKIP = {".git", "__pycache__", ".pytest_cache"}
BENIGN = {"example.com", "example.org", "pa.gov", "pid.state.pa.us", "cms.hhs.gov", "pennie.com", "github.com", "users.noreply.github.com", "pahealthaudit.org"}
SECRET_RX = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}")
AI_RX = re.compile(r"^\s*Model:\s*\S+|^\s*-{2,}\s*(User|Assistant)\s*-{2,}|<citation\s+src=|\bas an AI (language )?model\b", re.I | re.M)
EMAIL_RX = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.[A-Za-z.]{2,})")
PHONE_RX = re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b")
RED = [(re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "[REDACTED]"), (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDACTED]"),
       (re.compile(r"://[^/@\s:]+:[^/@\s]+@"), "://[REDACTED]@")]
ENV = dict(os.environ, GIT_TERMINAL_PROMPT="0", LC_ALL="C",
           GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new")
LINES = []
CREDS = []
HTTPS_URL = "https://github.com/%s/%s.git" % (OWNER, NAME)


def say(s=""):
    for ln in str(s).split("\n"):
        for rx, rep in RED:
            ln = rx.sub(rep, ln)
        LINES.append(ln)
        print(ln)


def finish(code):
    LOG.write_text("\n".join(LINES) + "\n")
    os.chmod(str(LOG), 0o600)
    print("[log: %s]" % LOG)
    sys.exit(code)


def die(code, msg):
    say("")
    say("STOP (exit %d): %s" % (code, msg))
    finish(code)


def run(cmd, cwd=None, timeout=120):
    try:
        r = subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=ENV, capture_output=True, text=True, errors="replace", timeout=timeout)
        return r.returncode, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip()
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT: " + " ".join(cmd[:3])
    except FileNotFoundError:
        return 127, "not found: " + cmd[0]


def git(args, cwd, timeout=120):
    return run(["git"] + CREDS + list(args), cwd, timeout)


def gh_ok():
    return bool(shutil.which("gh")) and run(["gh", "auth", "status"], timeout=20)[0] == 0


def choose_url(args):
    global CREDS
    if args.remote_url:
        url = args.remote_url
    else:
        r, o = run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=accept-new", "-T", "git@github.com"], timeout=25)
        if "successfully authenticated" in o:
            return SSH_URL
        say("  ssh to GitHub: NOT authenticated (%s)" % ((o.strip().splitlines() or ["no output"])[-1][:80]))
        url = HTTPS_URL
        if not gh_ok():
            die(3, "No GitHub login works (SSH key rejected, gh not logged in). Run:  gh auth login -p https -w   then open the link it prints and enter the code; then re-run this script. Nothing was changed.")
    if url.startswith("https://") and gh_ok():
        CREDS = ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"]
        say("  using HTTPS with your gh login")
    return url


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_text(p):
    b = Path(p).read_bytes()
    return "" if (b"\0" in b[:4096] or len(b) > 3000000) else b.decode("utf-8", "replace")


def flags_for(p):
    t, f = read_text(p), ""
    if AI_RX.search(t):
        f += "T"
    if SECRET_RX.search(t):
        f += "S"
    if any(d.lower() not in BENIGN for d in EMAIL_RX.findall(t)):
        f += "E"
    if PHONE_RX.search(t):
        f += "P"
    return f or "-"


def tree(root):
    out = {}
    for dp, dn, fn in os.walk(str(root)):
        dn[:] = [d for d in dn if d not in SKIP]
        for f in fn:
            p = Path(dp) / f
            out[os.path.relpath(str(p), str(root)).replace(os.sep, "/")] = p
    return out


def find_zip(args):
    if args.zip:
        z = Path(args.zip).expanduser()
        return z if z.is_file() else None
    cands, notes = [], []
    for d in (HOME / "storage" / "downloads", Path("/sdcard/Download"), Path("/storage/emulated/0/Download"), HOME / "downloads", HOME):
        ok = d.is_dir() and os.access(str(d), os.R_OK)
        notes.append("%s=%s" % (d, "readable" if ok else "no"))
        if ok:
            try:
                cands += list(d.glob("*November_2026*.zip"))
            except OSError:
                pass
    say("  searched: " + ", ".join(notes))
    seen, uniq = set(), []
    for f in sorted(cands, key=lambda f: f.stat().st_mtime, reverse=True):
        if os.path.realpath(str(f)) not in seen:
            seen.add(os.path.realpath(str(f)))
            uniq.append(f)
    for f in uniq[:5]:
        say("  zip: %s (%d bytes)" % (f, f.stat().st_size))
    for f in uniq:
        try:
            with zipfile.ZipFile(str(f)) as zz:
                if any(n.endswith("CHANGELOG.md") and any(v in zz.read(n) for v in (b"3.0.1", b"3.1.0")) for n in zz.namelist()):
                    return f
        except (zipfile.BadZipFile, OSError):
            continue
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--push", action="store_true")
    ap.add_argument("--zip")
    ap.add_argument("--remote-url")
    ap.add_argument("--skip-hook", action="store_true")
    args = ap.parse_args()
    mode = "PUSH" if args.push else ("APPLY" if args.apply else "PLAN ONLY")
    say("ez_reconcile_repo %s | mode: %s" % (STAMP, mode))

    say("== 1 preconditions")
    if not shutil.which("git"):
        die(2, "git not installed")
    free = shutil.disk_usage(str(HOME)).free
    say("  free space %.2f GB" % (free / 1e9))
    if free < 200e6:
        die(2, "less than 200 MB free")
    url = choose_url(args)
    say("  remote: " + url)
    if (WORK / ".git").exists():
        say("  your current work dir: " + git(["status", "-sb"], WORK)[1].splitlines()[0] + "  (left untouched; the state is only read)")
        if args.apply or args.push:
            REVIEW.mkdir(parents=True, exist_ok=True)
            rc, out = git(["bundle", "create", str(REVIEW / "work_dir_backup.bundle"), "--all"], WORK)
            say("  backup bundle of your local repo: %s" % ("ok -> " + str(REVIEW / "work_dir_backup.bundle") if rc == 0 else "FAILED: " + out[-120:]))

    say("== 2 packet zip (needs v3.0.1 or later)")
    z = find_zip(args)
    if not z:
        die(2, "no v3.0.1-or-later packet zip found. Download Pennsylvania_Health_Insurance_November_2026_v3.1.0-beta.1.zip to your phone Downloads (if /sdcard is unreadable run termux-setup-storage), or pass --zip PATH")
    pk = CACHE / "packet"
    pk.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(str(z)) as zf:
        for n in zf.namelist():
            if not str((pk / n).resolve()).startswith(str(pk.resolve())):
                die(2, "unsafe path in zip: " + n)
        zf.extractall(str(pk))
    kids = list(pk.iterdir())
    proot = kids[0] if len(kids) == 1 and kids[0].is_dir() else pk
    bad = []
    for ln in (proot / "MANIFEST.sha256").read_text().splitlines():
        m = re.match(r"([0-9a-f]{64})  (.+)$", ln)
        if m and (not (proot / m.group(2)).is_file() or sha(proot / m.group(2)) != m.group(1)):
            bad.append(m.group(2))
    say("  using %s | manifest mismatches: %d" % (z, len(bad)))
    if bad:
        die(2, "zip fails its own manifest: " + ", ".join(bad[:5]))
    P = tree(proot)

    say("== 3 fresh read-only clone of GitHub")
    clone = CACHE / "clone"
    rc, out = run(["git"] + CREDS + ["clone", url, str(clone)], timeout=180)
    if rc != 0:
        die(2, "clone failed (SSH key or repo access?): " + out[-300:])
    rc, head0 = git(["rev-parse", "HEAD"], clone)
    say("  remote main: %s | commits: %s" % (head0[:8], git(["rev-list", "--count", "HEAD"], clone)[1]))
    say("  history:\n" + "\n".join("    " + x for x in git(["log", "-8", "--format=%h %cs %s"], clone)[1].splitlines()))
    git(["bundle", "create", str(CACHE / "remote_state.bundle"), "--all"], clone)
    R = tree(clone)
    say("  files on remote main: %d | packet files: %d" % (len(R), len(P)))

    say("== 4 classification")
    keep, same, replace, dups, variants, extras = [], [], [], [], [], []
    by_base = {}
    for prel in P:
        by_base.setdefault(prel.rsplit("/", 1)[-1], []).append(prel)
    for rel in sorted(R):
        if rel == ".gitignore":
            keep.append((rel, "merge remote + packet lines"))
        elif rel == "LICENSE" or rel.startswith("LICENSE") or rel == "SECURITY.md" or (rel.startswith(".github/") and rel not in P):
            keep.append((rel, "preserved"))
        elif rel in P:
            (same if sha(R[rel]) == sha(P[rel]) else replace).append(rel)
        elif "/" not in rel and rel in by_base and False:
            pass
        elif "/" not in rel and any(sha(R[rel]) == sha(P[x]) for x in by_base.get(rel, [])):
            dups.append(rel)
        elif "/" not in rel and rel in by_base:
            variants.append(rel)
        else:
            extras.append(rel)
    say("  KEEP (%d): %s" % (len(keep), ", ".join(k for k, _ in keep)[:300]))
    say("  identical to packet at same path (%d) | REPLACED by packet version (%d): %s" % (len(same), len(replace), ", ".join(replace)[:200]))
    say("  REMOVE flat duplicates of packet files, identical content (%d): %s" % (len(dups), ", ".join(dups)[:400]))
    say("  REMOVE flat variants, same name but DIFFERENT content (%d; saved for diff): %s" % (len(variants), ", ".join(variants)[:400]))
    tot = sum(R[e].stat().st_size for e in extras)
    say("  REMOVE other root files not in the packet (%d, %.1f MB)   flags: T=AI-transcript markers S=secret-like E=emails P=phones" % (len(extras), tot / 1e6))
    flagged = []
    for e in extras:
        f = flags_for(R[e])
        flagged.append((e, f))
        say("    %9d  %-4s %s" % (R[e].stat().st_size, f, e))
    sec = [e for e, f in flagged if "S" in f]
    if sec:
        say("  WARNING: secret-like strings in: " + ", ".join(sec) + " (history keeps them; rotate any real credential)")
    ntr = sum(1 for _, f in flagged if "T" in f)
    say("  AI-transcript files: %d (these violate the project's own provenance gate)" % ntr)
    rm_all = dups + variants + extras
    say("  RESULT: tree = %d packet files + %d preserved; %d files leave the tree (history keeps them)" % (len(P), len(keep), len(rm_all)))
    if not (args.apply or args.push):
        say("")
        say("PLAN ONLY. Nothing was changed. If this looks right: re-run with --push (or --apply first to check locally).")
        finish(0)

    say("== 5 build the cleanup commit (on top of remote history)")
    for rel in variants + extras:
        d = REVIEW / "removed_from_repo" / rel
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(str(R[rel]), str(d))
    say("  copies of removed variants/extras saved in %s" % (REVIEW / "removed_from_repo"))
    for i in range(0, len(rm_all), 40):
        rc, out = git(["rm", "-q", "--"] + rm_all[i:i + 40], clone)
        if rc != 0:
            die(2, "git rm failed: " + out[-200:])
    for rel, src in P.items():
        if rel == ".gitignore":
            continue
        dst = clone / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(str(src), str(dst))
        if rel.startswith("scripts/") and rel.endswith((".py", ".sh")):
            dst.chmod(0o755)
    gi_pk = P[".gitignore"].read_text() if ".gitignore" in P else ""
    gi_rm = (clone / ".gitignore").read_text() if (clone / ".gitignore").exists() else ""
    have = set(gi_rm.splitlines())
    add = [x for x in gi_pk.splitlines() if x.strip() and not x.startswith("#") and x not in have]
    (clone / ".gitignore").write_text(gi_rm.rstrip() + ("\n\n# --- audit packet (Nov 2026) ---\n" + "\n".join(add) + "\n" if add else "\n") if gi_rm else gi_pk)
    rc, out = run(["python3", "scripts/hash_manifest.py"], clone)
    say("  manifest regenerated: " + out.splitlines()[-1] if out else "  manifest regenerated")
    git(["add", "-A"], clone)
    allowed = set(P) | {k for k, _ in keep} | {".gitignore", "MANIFEST.sha256"}
    left = [f for f in git(["ls-files"], clone)[1].splitlines() if f not in allowed]
    if left:
        die(2, "unexpected files would remain in the tree: " + ", ".join(left[:8]))
    say("  staged: " + git(["diff", "--cached", "--shortstat"], clone)[1])

    say("== 6 checks on the exact tree to be committed")
    for label, cmd in (("validate_packet", ["python3", "scripts/validate_packet.py"]), ("provenance_gate", ["python3", "scripts/06_provenance_gate.py"]),
                       ("unit tests", ["python3", "-m", "unittest", "discover", "-s", "tests"])):
        rc, out = run(cmd, clone)
        say("  %s: rc=%d %s" % (label, rc, out.splitlines()[-1][:80] if out else ""))
        if rc != 0:
            die(2, "%s failed:\n%s" % (label, "\n".join(out.splitlines()[-8:])))
    for dp, dn, fn in os.walk(str(clone)):
        for d in list(dn):
            if d in ("__pycache__", ".pytest_cache"):
                shutil.rmtree(os.path.join(dp, d), ignore_errors=True)
                dn.remove(d)
    git(["add", "-A"], clone)
    if git(["diff", "--cached", "--quiet"], clone)[0] == 0:
        say("  remote main already matches the packet tree exactly: nothing to commit or push")
        say("")
        say("DONE (no change needed). https://github.com/%s/%s" % (OWNER, NAME))
        finish(0)
    for k in ("user.name", "user.email"):
        if not git(["config", "--get", k], clone)[1]:
            die(2, "git %s not set: git config --global %s \"VALUE\"" % (k, k))
    ver = (proot / "VERSION").read_text().strip() if (proot / "VERSION").exists() else "3.0.1"
    if rm_all:
        msg = ["-m", "refactor: restructure repo around the November 2026 audit packet (v%s)" % ver,
               "-m", "Replaces web-uploaded flat files with the verified packet layout. %d unreviewed or duplicate root files leave the tree (recoverable from history). LICENSE, SECURITY.md and .github are preserved." % len(rm_all)]
    else:
        msg = ["-m", "docs: update November 2026 audit packet to v%s" % ver,
               "-m", "Updates packet files only; no files removed. LICENSE, SECURITY.md and .github are preserved."]
    rc, out = git(["commit"] + msg, clone)
    if rc != 0 and args.skip_hook:
        rc, out = git(["commit", "--no-verify"] + msg, clone)
    if rc != 0:
        say(out[-700:])
        die(5, "commit failed (your global pre-commit hook?). Fix it or re-run with --skip-hook once.")
    new = git(["rev-parse", "HEAD"], clone)[1]
    say("  committed %s on top of remote main %s" % (new[:8], head0[:8]))
    if not args.push:
        say("")
        say("APPLY ONLY: commit is ready in %s (not pushed). Re-run with --push to publish." % clone)
        finish(0)

    say("== 7 push (fast-forward only)")
    rc, out = git(["ls-remote", "origin", "refs/heads/main"], clone, 60)
    if rc != 0 or out.split()[:1] != [head0]:
        die(7, "remote main moved since the clone (%s). Re-run to rebuild on top of it." % out[:60])
    rc, out = git(["push", "origin", "main"], clone, 180)
    say("  " + out[-300:].replace("\n", "\n  "))
    if rc != 0:
        hint = " Token lacks the workflow scope: gh auth refresh -s workflow." if re.search("workflow", out, re.I) else ""
        die(6, "push failed (not forced)." + hint)
    rc, out = git(["ls-remote", "origin", "refs/heads/main"], clone, 60)
    ok = out.split()[:1] == [new]
    say("  verify: remote main %s new commit" % ("EQUALS" if ok else "DOES NOT EQUAL"))
    if not ok:
        die(6, "post-push verification failed")

    say("== 8 swap your work dir for the clean clone")
    if WORK.exists():
        old = REVIEW / "old_work_dir"
        REVIEW.mkdir(parents=True, exist_ok=True)
        shutil.move(str(WORK), str(old))
        say("  old work dir kept at " + str(old))
    shutil.move(str(clone), str(WORK))
    if CREDS:
        run(["git", "config", "--local", "--add", "credential.helper", ""], WORK)
        run(["git", "config", "--local", "--add", "credential.helper", "!gh auth git-credential"], WORK)
        say("  set repo-local credential helper (gh) so plain `git push` works in the new work dir")
    say("  new work dir: %s | %s" % (WORK, git(["status", "-sb"], WORK)[1].splitlines()[0]))
    say("")
    say("DONE. https://github.com/%s/%s" % (OWNER, NAME))
    say("History still contains the removed files. If any contained anything sensitive, tell me BEFORE doing anything else; a history rewrite is a separate, explicit decision.")
    finish(0)


if __name__ == "__main__":
    main()
PYEOF
python3 "$HOME/ez_reconcile_repo.py" "$@"
