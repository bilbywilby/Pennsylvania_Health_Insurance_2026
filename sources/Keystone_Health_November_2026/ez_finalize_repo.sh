#!/bin/sh
# ez_finalize_repo.sh - build a clean, independent git repo from the packet zip, verify it, commit, publish.
# Paste-safe (works pasted into Termux or as `bash ez_finalize_repo.sh [options]`). Writes ~/ez_finalize_repo.py and runs it.
# Safe by design: no git clean/reset, no force-push, never deletes anything under /sdcard, never edits files outside
# ~/Pennsylvania_Health_Insurance_November_2026 and ~/pa_nov2026_review. Run in plain English: it stops and tells you why.
# Options: --zip PATH  --use-dir PATH  --create public|private  --polish  --no-push  --skip-hook  --remote-url URL
mkdir -p "$HOME/.cache/ez_finalize"
cat > "$HOME/ez_finalize_repo.py" <<'PYEOF'
#!/usr/bin/env python3
"""ez_finalize_repo.py - ASCII only. Exit codes: 0 ok | 2 precondition | 3 no GitHub auth (local repo ready)
| 4 remote repo missing | 5 pre-commit hook failed | 6 push failed | 7 remote has different history."""
import argparse, datetime, hashlib, os, re, shutil, subprocess, sys, zipfile
from pathlib import Path

HOME = Path(os.environ.get("HOME", str(Path.home()))).resolve()
OWNER, NAME = "bilbywilby", "Pennsylvania_Health_Insurance_November_2026"
SSH_URL = "git@github.com:%s/%s.git" % (OWNER, NAME)
HTTPS_URL = "https://github.com/%s/%s.git" % (OWNER, NAME)
STAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
LOG = HOME / ("ez_finalize_%s.txt" % STAMP)
WORK = HOME / NAME
REVIEW = HOME / "pa_nov2026_review" / STAMP
MSG = "docs: add November 2026 PY2027 audit packet"
DESC = "Audit of Pennsylvania ACA individual and small-group markets, plan year 2027: PID approved rates, enrollment, reproducible calculations, verification ledger (Nov 2026)"
TOPICS = ["pennsylvania", "aca", "health-insurance", "pennie", "rate-review", "audit", "open-data"]
KNOWN_300_TO_301 = {"README.md", "CHANGELOG.md", "MANIFEST.sha256", "scripts/push_to_github.sh", "scripts/validate_packet.py", "tests/test_packet.py"}
SKIP = {".git", "__pycache__", ".pytest_cache"}
ZW = ("\u200b", "\ufeff", "\u00a0", "\u2060")
RED = [
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "[REDACTED]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDACTED]"),
    (re.compile(r"://[^/@\s:]+:[^/@\s]+@"), "://[REDACTED]@"),
]
ENV = dict(os.environ, GIT_TERMINAL_PROMPT="0", LC_ALL="C", GH_PROMPT_DISABLED="1", GH_NO_UPDATE_NOTIFIER="1",
           GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new")
LINES = []


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


def run(cmd, cwd=None, timeout=60):
    try:
        r = subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=ENV, capture_output=True, text=True, errors="replace", timeout=timeout)
        return r.returncode, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip()
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT after %ss: %s" % (timeout, " ".join(cmd[:3]))
    except FileNotFoundError:
        return 127, "not found: %s" % cmd[0]
    except Exception as e:
        return 1, "%s: %s" % (type(e).__name__, e)


def git(args, cwd=None, creds=(), timeout=90):
    return run(["git"] + list(creds) + list(args), cwd or WORK, timeout)


def sha_tree(root, skip_top=None):
    out = {}
    root = Path(root)
    for dp, dn, fn in os.walk(str(root)):
        rel_dir = os.path.relpath(dp, str(root))
        dn[:] = [d for d in dn if d not in SKIP and not (rel_dir == "." and d == skip_top)]
        for f in fn:
            p = Path(dp) / f
            out[os.path.relpath(str(p), str(root)).replace(os.sep, "/")] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def verify_manifest(base):
    mf = Path(base) / "MANIFEST.sha256"
    if not mf.exists():
        return None
    bad, missing, n = [], [], 0
    for ln in mf.read_text(errors="replace").splitlines():
        m = re.match(r"([0-9a-f]{64})  (.+)$", ln)
        if not m:
            continue
        n += 1
        f = Path(base) / m.group(2)
        if not f.is_file():
            missing.append(m.group(2))
        elif hashlib.sha256(f.read_bytes()).hexdigest() != m.group(1):
            bad.append(m.group(2))
    return n, bad, missing


def find_zip(args):
    if args.zip:
        z = Path(args.zip).expanduser()
        return z if z.is_file() else None
    cands = []
    for d in (HOME / "storage" / "downloads", Path("/sdcard/Download"), Path("/storage/emulated/0/Download"), HOME / "downloads", HOME):
        if d.is_dir():
            cands += [f for f in d.glob("*November_2026*.zip")]
    seen, uniq = set(), []
    for f in sorted(cands, key=lambda f: f.stat().st_mtime, reverse=True):
        r = os.path.realpath(str(f))
        if r not in seen:
            seen.add(r)
            uniq.append(f)
    for f in uniq[:6]:
        say("  zip candidate: %s  %d bytes  %s" % (f, f.stat().st_size, datetime.datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M")))
    return uniq[0] if uniq else None


def extract(zpath):
    tmp = HOME / ".cache" / "ez_finalize" / STAMP
    tmp.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(str(zpath)) as z:
        for n in z.namelist():
            if not str((tmp / n).resolve()).startswith(str(tmp.resolve())):
                die(2, "zip contains an unsafe path: %s" % n)
        z.extractall(str(tmp))
    kids = [k for k in tmp.iterdir()]
    return kids[0] if len(kids) == 1 and kids[0].is_dir() else tmp


def compare_sdcard(base_tree):
    outers, seen = [], set()
    for d in (Path("/sdcard/Download"), Path("/storage/emulated/0/Download"), HOME / "storage" / "downloads"):
        o = d / NAME
        if o.is_dir() and os.path.realpath(str(o)) not in seen:
            seen.add(os.path.realpath(str(o)))
            outers.append(o)
    for o in outers:
        for label, d, skip in (("outer", o, NAME), ("nested", o / NAME, None)):
            if not d.is_dir():
                continue
            t = sha_tree(d, skip_top=skip)
            changed = sorted(k for k in t if k in base_tree and t[k] != base_tree[k])
            extra = sorted(k for k in t if k not in base_tree)
            unexpected = [k for k in changed if k not in KNOWN_300_TO_301]
            say("  %s copy %s: %d files, %d differ from zip (%d are known v3.0.0->v3.0.1 changes), %d extra" % (label, d, len(t), len(changed), len(changed) - len(unexpected), len(extra)))
            if unexpected or extra:
                for k in (unexpected + extra)[:10]:
                    dst = REVIEW / label / k
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(str(d / k), str(dst))
                    say("    possible edit kept for review: %s" % k)
                say("    copied to %s (nothing under /sdcard was touched)" % (REVIEW / label))


def hygiene(root):
    bad = []
    for dp, dn, fn in os.walk(str(root)):
        dn[:] = [d for d in dn if d not in SKIP]
        for f in fn:
            p = Path(dp) / f
            try:
                txt = p.read_bytes().decode("utf-8")
            except UnicodeDecodeError:
                continue
            z = sum(txt.count(c) for c in ZW)
            if z:
                bad.append((os.path.relpath(str(p), str(root)), z))
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip")
    ap.add_argument("--use-dir")
    ap.add_argument("--remote-url")
    ap.add_argument("--create", choices=["public", "private"])
    ap.add_argument("--polish", action="store_true")
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--skip-hook", action="store_true")
    args = ap.parse_args()

    say("ez_finalize_repo %s | %s/%s" % (STAMP, OWNER, NAME))
    say("== 1 preconditions")
    if not shutil.which("git"):
        die(2, "git not installed (pkg install git)")
    free = shutil.disk_usage(str(HOME)).free
    say("  free space: %.2f GB" % (free / 1e9))
    if free < 150e6:
        die(2, "less than 150 MB free on internal storage")

    say("== 2 source")
    if args.use_dir:
        src = Path(args.use_dir).expanduser()
        if not src.is_dir():
            die(2, "--use-dir is not a directory: %s" % src)
        base = src
        say("  using directory %s (not the zip)" % src)
    else:
        z = find_zip(args)
        if not z:
            die(2, "no *November_2026*.zip found in Download folders; pass --zip PATH")
        say("  using zip: %s (sha256 %s)" % (z, hashlib.sha256(z.read_bytes()).hexdigest()[:16]))
        base = extract(z)
    mv = verify_manifest(base)
    if mv is None:
        die(2, "no MANIFEST.sha256 in source; refusing to publish an unverifiable packet")
    n, bad, missing = mv
    say("  manifest: %d entries, %d mismatched, %d missing" % (n, len(bad), len(missing)))
    if bad or missing:
        die(2, "source fails its own manifest: %s" % ", ".join((bad + missing)[:5]))
    base_tree = sha_tree(base)
    say("  comparing with copies in Download (read-only):")
    compare_sdcard(base_tree)

    say("== 3 work directory (internal storage, not /sdcard)")
    resume = False
    if WORK.exists():
        if not (WORK / ".git").exists():
            die(2, "%s exists but is not a git repo. Rename it first: mv %s %s.old" % (WORK, WORK, WORK))
        wt = sha_tree(WORK)
        diff = sorted(set(k for k in wt if wt.get(k) != base_tree.get(k)) | set(k for k in base_tree if k not in wt))
        if diff:
            die(2, "existing repo %s differs from the packet in %d file(s) (%s). Not overwriting; review with `git -C %s status`." % (WORK, len(diff), ", ".join(diff[:5]), WORK))
        resume = True
        say("  existing repo matches the packet exactly: resuming")
    else:
        shutil.copytree(str(base), str(WORK), ignore=shutil.ignore_patterns(".git", "__pycache__", ".pytest_cache"))
        for f in list((WORK / "scripts").glob("*.py")) + list((WORK / "scripts").glob("*.sh")):
            f.chmod(0o755)
        say("  created %s" % WORK)

    say("== 4 checks in the work directory")
    hz = hygiene(WORK)
    say("  invisible characters in files: %d" % len(hz))
    if hz:
        die(2, "invisible characters found: %s" % ", ".join("%s(%d)" % x for x in hz[:5]))
    for label, cmd in (("validate_packet", ["python3", "scripts/validate_packet.py"]), ("provenance_gate", ["python3", "scripts/06_provenance_gate.py"]),
                       ("unit tests", ["python3", "-m", "unittest", "discover", "-s", "tests"])):
        rc, out = run(cmd, WORK, 120)
        say("  %s: rc=%d %s" % (label, rc, out.splitlines()[-1][:90] if out else ""))
        if rc != 0:
            die(2, "%s failed:\n%s" % (label, "\n".join(out.splitlines()[-8:])))
    for dp, dn, fn in os.walk(str(WORK)):
        for d in list(dn):
            if d in ("__pycache__", ".pytest_cache"):
                shutil.rmtree(os.path.join(dp, d), ignore_errors=True)
                dn.remove(d)
    mv2 = verify_manifest(WORK)
    if mv2 and (mv2[1] or mv2[2]):
        die(2, "manifest no longer matches after checks: %s" % ", ".join((mv2[1] + mv2[2])[:5]))

    say("== 5 git (independent repo)")
    if not (WORK / ".git").exists():
        rc, out = run(["git", "init", "-b", "main"], WORK)
        if rc != 0:
            rc, out = run(["git", "init"], WORK)
            run(["git", "checkout", "-b", "main"], WORK)
    rc, top = git(["rev-parse", "--show-toplevel"])
    if rc != 0 or Path(top).resolve() != WORK.resolve():
        die(2, "git toplevel is %s, expected %s" % (top, WORK))
    say("  repo root: %s" % top)
    for k in ("user.name", "user.email"):
        if not git(["config", "--get", k])[1]:
            die(2, "git %s is not set. Run: git config --global %s \"YOUR VALUE\"" % (k, k))
    git(["add", "-A"])
    rc, staged = git(["diff", "--cached", "--name-only"])
    nstaged = len(staged.splitlines()) if staged else 0
    has_head = git(["rev-parse", "--verify", "HEAD"])[0] == 0
    if nstaged or not has_head:
        say("  committing %d file(s): %s" % (nstaged, MSG))
        rc, out = git(["commit", "-m", MSG])
        if rc != 0 and args.skip_hook:
            say("  hook/commit failed; retrying with --no-verify (you passed --skip-hook)")
            rc, out = git(["commit", "--no-verify", "-m", MSG])
        if rc != 0:
            say(out[-900:])
            hp = git(["config", "--get", "core.hooksPath"])[1]
            if hp:
                hook = Path(os.path.expanduser(hp)) / "pre-commit"
                if hook.exists():
                    say("  active pre-commit hook (first 40 lines):")
                    say("\n".join("    " + x for x in hook.read_text(errors="replace").splitlines()[:40]))
            die(5, "commit failed (see above). Fix the cause, or re-run with --skip-hook to bypass your hook once.")
    else:
        say("  nothing to commit: HEAD already contains the packet")
    say("  HEAD: " + git(["log", "-1", "--format=%h %s"])[1])
    say("  status: " + git(["status", "-sb"])[1].splitlines()[0])
    if args.no_push:
        say("--no-push given: stopping before any network step")
        finish(0)

    say("== 6 remote and authentication")
    creds, method, url = [], None, None
    rc, cur = git(["remote", "get-url", "origin"])
    if args.remote_url:
        url, method = args.remote_url, "custom"
    elif rc == 0:
        if NAME.lower() not in cur.lower():
            die(2, "origin already points somewhere else (%s); not changing it" % cur)
        url = cur
        method = "ssh" if cur.startswith("git@") else "https"
    else:
        r1, o1 = run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=accept-new", "-T", "git@github.com"], timeout=25)
        if "successfully authenticated" in o1:
            url, method = SSH_URL, "ssh"
        elif shutil.which("gh") and run(["gh", "auth", "status"], timeout=20)[0] == 0:
            url, method = HTTPS_URL, "https"
    if method == "https" and shutil.which("gh") and run(["gh", "auth", "status"], timeout=20)[0] == 0:
        creds = ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"]
    if not url:
        say("  Local repo is committed and ready at %s" % WORK)
        say("  No GitHub authentication available. Do ONE of these, then re-run this script:")
        say("    gh auth login -p https -w        (shows a code; open the link in your phone browser)")
        say("    or add your SSH key at github.com/settings/keys (Keystone_Health already uses SSH)")
        finish(3)
    if rc != 0:
        git(["remote", "add", "origin", url])
    say("  method: %s | origin: %s" % (method, url))

    rc, out = git(["ls-remote", "origin"], creds=creds, timeout=60)
    if rc != 0:
        if re.search(r"not found|does not exist|Could not read from remote repository", out, re.I) and args.create and shutil.which("gh") and run(["gh", "auth", "status"], timeout=20)[0] == 0:
            say("  creating %s/%s as %s" % (OWNER, NAME, args.create))
            rc2, o2 = run(["gh", "repo", "create", "%s/%s" % (OWNER, NAME), "--" + args.create, "--description", DESC], timeout=60)
            say("  " + o2[-200:])
            if rc2 != 0:
                die(4, "could not create the repository")
            out = ""
            creds = ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"] if method == "https" else creds
        elif re.search(r"not found|does not exist", out, re.I):
            die(4, "remote repository does not exist (or your login cannot see it). Create it EMPTY (no README/license) at https://github.com/new named %s, or re-run with --create public|private after `gh auth login`.\n%s" % (NAME, out[-200:]))
        else:
            die(6, "cannot reach remote: %s" % out[-300:])
    head = git(["rev-parse", "HEAD"])[1]
    refs = dict((ln.split()[1], ln.split()[0]) for ln in out.splitlines() if len(ln.split()) == 2 and ln.split()[1].startswith("refs/"))
    rmain = refs.get("refs/heads/main")
    say("  remote refs: %s" % (", ".join(sorted(refs)) or "none (empty repository)"))
    if rmain == head:
        say("  remote main already equals local HEAD: nothing to push")
    else:
        if rmain:
            rc, fo = git(["fetch", "origin", "main"], creds=creds)
            if rc != 0 or git(["merge-base", "--is-ancestor", rmain, head])[0] != 0:
                die(7, "remote main (%s) is not an ancestor of your local HEAD. NOT forcing. Inspect: git -C %s fetch origin && git -C %s log --oneline origin/main" % (rmain[:8], WORK, WORK))
        say("== 7 push")
        rc, out = git(["push", "-u", "origin", "main"], creds=creds, timeout=120)
        say("  " + out[-400:].replace("\n", "\n  "))
        if rc != 0:
            hint = "push failed."
            if re.search(r"workflow", out, re.I):
                hint += " Token lacks the workflow scope: run `gh auth refresh -s workflow` and re-run."
            if re.search(r"publickey|Permission denied", out, re.I):
                hint += " SSH key not authorized for this repo."
            die(6, hint)
    rc, out = git(["ls-remote", "origin", "refs/heads/main"], creds=creds)
    ok = rc == 0 and out.split()[:1] == [head]
    say("  verify: remote main %s local HEAD (%s)" % ("EQUALS" if ok else "DOES NOT EQUAL", head[:8]))
    if not ok:
        die(6, "post-push verification failed")

    if args.polish:
        say("== 8 polish (description + topics)")
        if shutil.which("gh") and run(["gh", "auth", "status"], timeout=20)[0] == 0:
            cmd = ["gh", "repo", "edit", "%s/%s" % (OWNER, NAME), "--description", DESC]
            for t in TOPICS:
                cmd += ["--add-topic", t]
            rc, out = run(cmd, timeout=60)
            say("  gh repo edit: rc=%d %s" % (rc, out[-150:]))
        else:
            say("  skipped: gh not authenticated")
    say("")
    say("DONE. Published %s" % HTTPS_URL.replace(".git", ""))
    say("Next: the folders under /sdcard/Download are now redundant copies; delete them yourself after you open the repo page. Never run git inside /sdcard.")
    finish(0)


if __name__ == "__main__":
    main()
PYEOF
python3 "$HOME/ez_finalize_repo.py" "$@"
