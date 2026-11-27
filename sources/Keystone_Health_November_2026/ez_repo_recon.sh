#!/bin/sh
# ez_repo_recon.sh - ONE read-only recon for finalizing/cleaning bilbywilby/Pennsylvania_Health_Insurance_November_2026
# Paste-safe: works pasted into Termux, or run as `sh ez_repo_recon.sh [--no-net] [--no-clone]`.
# Writes ~/ez_repo_recon.py, runs it, and saves ~/ez_recon_<stamp>.txt. Never commits, resets, cleans or pushes.
mkdir -p "$HOME/.cache/ez_recon"
cat > "$HOME/ez_repo_recon.py" <<'PYEOF'
#!/usr/bin/env python3
"""ez_repo_recon.py - read-only recon. ASCII only on purpose (zero-width chars broke an earlier paste).
Writes ONE report file. Packet tests run in a TEMP COPY. Secrets are redacted; risky files are listed by NAME only.
Usage: python3 ez_repo_recon.py [--no-net] [--no-clone] [--repo NAME]   (default repo: the PA November 2026 packet)"""
import datetime, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

NO_NET = "--no-net" in sys.argv
NO_CLONE = NO_NET or "--no-clone" in sys.argv
HOME = Path(os.environ.get("HOME", str(Path.home()))).resolve()
OWNER, NAME = "bilbywilby", "Pennsylvania_Health_Insurance_November_2026"
for _i, _a in enumerate(sys.argv):
    if _a == "--repo" and _i + 1 < len(sys.argv):
        NAME = sys.argv[_i + 1]
URL = "https://github.com/%s/%s.git" % (OWNER, NAME)
STAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
OUT = HOME / ("ez_recon_%s.txt" % STAMP)
SKIP = {".git", ".cache", "node_modules", ".npm", ".npm-global", ".local", ".git-accidental-backup", "__pycache__", ".pytest_cache"}
L, FLAGS = [], []
S = {"target": None, "scratch": False, "git_ok": False}

RED = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "[REDACTED-PRIVATE-KEY]"),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "[REDACTED-GH-TOKEN]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDACTED-GH-PAT]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED-AWS]"),
    (re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"), "[REDACTED-SLACK]"),
    (re.compile(r"://[^/@\s:]+:[^/@\s]+@"), "://[REDACTED-CRED]@"),
    (re.compile(r"(?i)((?:token|secret|passw(?:or)?d|api[_-]?key)\s*[=:]\s*)\S+"), r"\1[REDACTED]"),
    (re.compile(r"[\w.+-]+@([\w-]+\.[\w.-]+)"), r"***@\1"),
]
RISKY = re.compile(r"(^|/)(\.ssh/|\.gnupg/|id_(rsa|ed25519|ecdsa|dsa)|\.env(\.[^/]*)?$|\.netrc$|\.npmrc$|\.wg_private_key$|\.bash_history$|\.python_history$|\.pgpass$|[^/]*\.(pem|key|p12|pfx|kdbx|jks|keystore)$|[^/]*(token|secret|credential)[^/]*$)", re.I)
SECRET_RX = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}")
RELATED = re.compile(r"pennsylvania|(^|[_-])pa[_-]|pennie|keystone|insurance|(october|november)_2026|aca[_-]", re.I)
ZW = ("\u200b", "\ufeff", "\u00a0", "\u2060")
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0", LC_ALL="C", GH_PROMPT_DISABLED="1", GH_NO_UPDATE_NOTIFIER="1")


def red(s):
    for rx, rep in RED:
        s = rx.sub(rep, s)
    return s


def p(s=""):
    for ln in str(s).split("\n"):
        L.append(red(ln.rstrip()))


def flag(sev, msg):
    FLAGS.append((sev, msg))


def run(cmd, cwd=None, timeout=25):
    try:
        r = subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=ENV, capture_output=True, text=True, errors="replace", timeout=timeout)
        return r.returncode, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip()
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT after %ss: %s" % (timeout, " ".join(cmd[:3]))
    except FileNotFoundError:
        return 127, "not found: %s" % cmd[0]
    except Exception as e:
        return 1, "%s: %s" % (type(e).__name__, e)


def git(args, cwd, timeout=25):
    return run(["git"] + list(args), cwd, timeout)


def tail(s, n=5):
    return "\n".join(s.splitlines()[-n:])


def ind(s, n=4):
    return "\n".join(" " * n + x for x in str(s).splitlines())


def mt(path):
    try:
        return datetime.datetime.fromtimestamp(Path(path).stat().st_mtime).strftime("%Y-%m-%d %H:%M")
    except OSError:
        return "?"


def walk(root, maxdepth):
    root = str(root)
    base = root.rstrip(os.sep).count(os.sep)
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP]
        if dp.count(os.sep) - base >= maxdepth:
            dn[:] = []
        yield dp, dn, fn


SECTIONS = []


def section(title):
    def deco(fn):
        def wrap(i, n):
            sys.stderr.write("[%d/%d] %s ...\n" % (i, n, title))
            t0 = time.time()
            p()
            p("=== %s ===" % title)
            try:
                fn()
            except Exception as e:
                p("SECTION FAILED: %s: %s" % (type(e).__name__, e))
                flag("INFO", "section failed: %s (%s)" % (title, type(e).__name__))
            p("(took %.1fs)" % (time.time() - t0))
        SECTIONS.append((title, wrap))
        return wrap
    return deco


@section("1 ENVIRONMENT")
def sec_env():
    p("time: " + datetime.datetime.now().astimezone().isoformat(timespec="seconds"))
    p("home: %s | cwd: %s | args: %s" % (HOME, Path.cwd(), " ".join(sys.argv[1:]) or "-"))
    p("python: %s | TERMUX_VERSION: %s" % (sys.version.split()[0], os.environ.get("TERMUX_VERSION", "-")))
    du = shutil.disk_usage(str(HOME))
    p("disk free: %.1f GB of %.1f GB" % (du.free / 1e9, du.total / 1e9))
    if du.free < 1e9:
        flag("MED", "less than 1 GB free on HOME filesystem")
    for t in ("bash", "sh", "git", "gh", "curl", "zip", "unzip", "sha256sum", "grep", "sed", "jq"):
        w = shutil.which(t)
        if not w:
            p("%-9s MISSING" % t)
            continue
        v = ""
        if t in ("bash", "git", "gh"):
            v = (run([t, "--version"], timeout=8)[1].splitlines() or [""])[0][:60]
        p("%-9s %s -> %s" % (t, v, os.path.realpath(w)))
    sh = shutil.which("sh")
    if sh and "dash" in os.path.realpath(sh):
        flag("INFO", "sh is dash: scripts using [[ ]], arrays or $'..' fail under `sh x.sh`; run them with `bash x.sh`")
    if not shutil.which("gh"):
        flag("INFO", "gh not installed (pkg install gh); `git repo clone` is not a command, use `gh repo clone OWNER/NAME` or `git clone URL`")


@section("2 LOCATE TARGET REPO AND PACKET ZIPS")
def sec_locate():
    dirs, files = [], []
    roots = [(HOME, 3)] + [(Path(x), 2) for x in ("/sdcard/Download", "/storage/emulated/0/Download") if Path(x).is_dir()]
    for r, d in roots:
        for dp, dn, fn in walk(r, d):
            for x in dn:
                if x.lower() == NAME.lower() or (re.search(r"november[_-]?2026", x, re.I) and re.search("pennsylvania|health|insurance", x, re.I)):
                    dirs.append(Path(dp) / x)
            for x in fn:
                if re.search(r"november[_-]?2026", x, re.I) and re.search(r"\.(zip|tgz|tar\.gz)$", x, re.I):
                    files.append(Path(dp) / x)
    for d in dirs[:10]:
        p("dir  %s %-9s %s" % (mt(d), "[git]" if (d / ".git").exists() else "[no .git]", d))
    for f in files[:10]:
        p("file %s %9d  %s" % (mt(f), f.stat().st_size, f))
    if not dirs and not files:
        p("no local copy or zip found")
    exact = [d for d in dirs if d.name.lower() == NAME.lower()]
    pick = ([d for d in exact if (d / ".git").exists()] or exact or [d for d in dirs if (d / ".git").exists()] or dirs or [None])[0]
    if pick is None and not NO_CLONE:
        dest = HOME / ".cache" / "ez_recon" / NAME
        if (dest / ".git").exists():
            pick = dest
            p("reusing scratch clone " + str(dest))
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            rc, out = run(["git", "clone", "--depth", "100", URL, str(dest)], timeout=120)
            p("git clone (scratch) rc=%s: %s" % (rc, tail(out, 3)))
            if rc == 0:
                pick = dest
        if pick:
            S["scratch"] = True
            flag("INFO", "no local copy found; inspecting a scratch clone at %s" % pick)
        else:
            flag("HIGH", "target repo not on device and clone failed (private repo needs `gh auth login`, or no network)")
    S["target"] = pick
    p("TARGET: %s" % (pick or "none"))


@section("3 HOME-DIRECTORY GIT HAZARD")
def sec_home():
    rc, top = git(["rev-parse", "--show-toplevel"], HOME)
    if rc != 0 or Path(top).resolve() != HOME:
        p("HOME is not itself a git repo (toplevel: %s)" % (top if rc == 0 else "none"))
        return
    flag("MED", "HOME itself is a git repository: `git add -A`, `git clean -fd` or `git reset --hard` run from ~ or from any untracked project dir under it acts on the HOME repo")
    p("HOME is a git repo root")
    p("remotes: " + (git(["remote", "-v"], HOME)[1] or "none"))
    p("branch: %s | commits: %s" % (git(["branch", "--show-current"], HOME)[1], git(["rev-list", "--count", "HEAD"], HOME)[1]))
    p("last commits:\n" + ind(git(["log", "-3", "--format=%h %cs %s"], HOME)[1], 2))
    rc, ls = git(["ls-files"], HOME, 60)
    names = ls.splitlines() if rc == 0 else []
    p("tracked files: %d" % len(names))
    bad = [n for n in names if RISKY.search(n)]
    p("tracked files with risky NAMES: %d" % len(bad))
    for n in bad[:20]:
        p("  TRACKED-RISKY " + n)
    if bad:
        flag("HIGH", "%d risky-named files are TRACKED in the HOME repo (e.g. %s); check history before any push" % (len(bad), bad[0]))
    exposed = []
    for n in (".wg_private_key", ".ssh", ".gnupg", ".bash_history", ".python_history", ".npmrc", ".netrc", ".env"):
        if (HOME / n).exists() and not any(x == n or x.startswith(n + "/") for x in names):
            if git(["check-ignore", "-q", "--", n], HOME)[0] != 0:
                exposed.append(n)
    p("sensitive names present, untracked and NOT ignored: " + (", ".join(exposed) or "none"))
    if exposed:
        flag("MED", "`git add -A` from ~ would stage: " + ", ".join(exposed) + " (add to .gitignore_global / ~/.gitignore)")
    rc, ex = git(["config", "--get", "core.excludesfile"], HOME)
    p("core.excludesfile: %s" % (ex if rc == 0 else "unset"))
    gi = HOME / ".gitignore_global"
    if gi.exists():
        p(".gitignore_global:\n" + ind(gi.read_text(errors="replace")[:600], 2))
    rc, st = git(["status", "--porcelain", "--untracked-files=no"], HOME, 60)
    p("modified tracked files: %d" % (len(st.splitlines()) if rc == 0 and st else 0))


@section("4 TARGET REPO STATE")
def sec_target():
    t = S["target"]
    if not t:
        p("no target")
        return
    p("path: %s%s" % (t, "  (scratch clone)" if S["scratch"] else ""))
    rc, top = git(["rev-parse", "--show-toplevel"], t)
    if rc != 0 or Path(top).resolve() != Path(t).resolve():
        p("NOT its own git repo. git toplevel: %s" % (top if rc == 0 else "none"))
        flag("HIGH", "target dir is NOT an independent git repo%s; do not run git clean/reset/add -A in it" % ((" (git sees parent repo %s)" % top) if rc == 0 else ""))
        return
    S["git_ok"] = True
    rc, hd = git(["rev-parse", "--short", "HEAD"], t)
    p("HEAD: %s" % (hd if rc == 0 else "NO COMMITS"))
    if rc != 0:
        flag("HIGH", "target repo has no commits")
    p("branch: %s" % (git(["branch", "--show-current"], t)[1] or "(detached)"))
    rc, up = git(["rev-parse", "--abbrev-ref", "@{u}"], t)
    p("upstream: %s" % (up if rc == 0 else "none"))
    if rc == 0:
        rc2, ab = git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], t)
        p("behind/ahead: %s" % ab.replace("\t", " / "))
        parts = ab.split()
        if rc2 == 0 and len(parts) == 2 and parts[1] != "0":
            flag("INFO", "%s unpushed commit(s) on target" % parts[1])
        if rc2 == 0 and len(parts) == 2 and parts[0] != "0":
            flag("INFO", "%s commit(s) on remote not pulled" % parts[0])
    rem = git(["remote", "-v"], t)[1]
    p("remotes: " + (rem or "none"))
    if not rem:
        flag("HIGH", "target repo has no remote configured")
    rc, stt = git(["status", "--porcelain", "-uall"], t, 60)
    lines = stt.splitlines() if rc == 0 and stt else []
    staged = sum(1 for x in lines if x[:1] not in " ?")
    unst = sum(1 for x in lines if len(x) > 1 and x[1] not in " ?")
    untr = sum(1 for x in lines if x.startswith("??"))
    p("status: staged=%d unstaged=%d untracked=%d" % (staged, unst, untr))
    for x in lines[:15]:
        p("   " + x)
    if lines:
        flag("INFO", "target working tree not clean (staged=%d unstaged=%d untracked=%d)" % (staged, unst, untr))
    p("last commits:\n" + ind(git(["log", "-8", "--format=%h %cs %an | %s"], t)[1], 2))
    p("tags: %s | stashes: %s" % (git(["tag"], t)[1].replace("\n", ",") or "none", len(git(["stash", "list"], t)[1].splitlines())))
    for k in ("core.hooksPath", "commit.gpgsign", "init.defaultBranch", "user.name"):
        rc, v = git(["config", "--show-origin", "--get", k], t)
        p("config %s: %s" % (k, v.replace("\t", " ") if rc == 0 else "unset"))
    rc, ls = git(["ls-files"], t)
    names = ls.splitlines() if rc == 0 else []
    sizes = sorted(((os.path.getsize(t / n), n) for n in names if (t / n).is_file()), reverse=True)
    p("tracked files: %d | total %.0f KB" % (len(names), sum(s for s, _ in sizes) / 1024.0))
    for s, n in sizes[:6]:
        p("   %9d  %s" % (s, n))
    if sizes and sizes[0][0] > 1000000:
        flag("MED", "tracked file over 1 MB: %s" % sizes[0][1])
    have = {k: (t / k).exists() for k in ("README.md", "LICENSE", ".gitignore", "CHANGELOG.md", "MANIFEST.sha256", "data/statutes_2026.json", "REFERENCES.csv", "quarterly_audit.yaml", "validate_audit.py")}
    p("present: " + ", ".join("%s=%s" % (k, "yes" if v else "NO") for k, v in have.items()))
    wf = sorted(x.name for x in (t / ".github" / "workflows").glob("*")) if (t / ".github" / "workflows").is_dir() else []
    p("workflows: " + (", ".join(wf) or "none"))
    if not have["LICENSE"]:
        flag("INFO", "no LICENSE file in target (owner decision; repo is unlicensed until one is added)")


@section("5 PACKET INTEGRITY AND CHECKS (run in a temp copy)")
def sec_checks():
    t = S["target"]
    if not t or not S["git_ok"]:
        p("skipped (no independent target repo)")
        return
    mf = t / "MANIFEST.sha256"
    if mf.exists():
        bad, missing, listed, n = [], [], set(), 0
        for ln in mf.read_text(errors="replace").splitlines():
            m = re.match(r"([0-9a-f]{64})  (.+)$", ln)
            if not m:
                continue
            n += 1
            listed.add(m.group(2))
            f = t / m.group(2)
            if not f.is_file():
                missing.append(m.group(2))
            elif hashlib.sha256(f.read_bytes()).hexdigest() != m.group(1):
                bad.append(m.group(2))
        extra = []
        for dp, dn, fn in walk(t, 8):
            for x in fn:
                rel = os.path.relpath(os.path.join(dp, x), t).replace(os.sep, "/")
                if rel not in listed and rel != "MANIFEST.sha256" and "__pycache__" not in rel:
                    extra.append(rel)
        p("manifest entries: %d | hash mismatches: %d | missing: %d | files not in manifest: %d" % (n, len(bad), len(missing), len(extra)))
        for x in bad[:8]:
            p("  MISMATCH " + x)
        for x in missing[:8]:
            p("  MISSING  " + x)
        for x in extra[:8]:
            p("  UNLISTED " + x)
        if bad or missing:
            flag("HIGH", "MANIFEST.sha256 does not match working tree (%d changed, %d missing)" % (len(bad), len(missing)))
        elif extra:
            flag("INFO", "%d file(s) not covered by MANIFEST.sha256 (regenerate with scripts/hash_manifest.py after edits)" % len(extra))
    else:
        p("no MANIFEST.sha256")
    if not (t / "scripts").is_dir():
        p("no scripts/ dir; packet checks skipped")
        return
    tmp = Path(tempfile.mkdtemp(prefix="ez_recon_"))
    try:
        dst = tmp / "copy"
        shutil.copytree(str(t), str(dst), ignore=shutil.ignore_patterns(".git", "__pycache__", ".pytest_cache"))
        for label, cmd, need in (("validate_packet", ["python3", "scripts/validate_packet.py"], "scripts/validate_packet.py"),
                                 ("provenance_gate", ["python3", "scripts/06_provenance_gate.py"], "scripts/06_provenance_gate.py"),
                                 ("unit tests", ["python3", "-m", "unittest", "discover", "-s", "tests"], "tests")):
            if not (dst / need).exists():
                p("%s: skipped (missing %s)" % (label, need))
                continue
            rc, out = run(cmd, dst, 90)
            p("%s: rc=%s" % (label, rc))
            p(ind(tail(out, 4)))
            if rc != 0:
                flag("HIGH", "%s FAILED in temp copy" % label)
    finally:
        shutil.rmtree(str(tmp), ignore_errors=True)


@section("6 SECRET SCAN (paths and rule names only, never values)")
def sec_secrets():
    t = S["target"]
    if not t or not S["git_ok"]:
        p("skipped")
        return
    hits = []
    rc, ls = git(["ls-files", "-co", "--exclude-standard"], t)
    for n in ls.splitlines() if rc == 0 else []:
        f = t / n
        try:
            if f.is_file() and f.stat().st_size < 2000000:
                m = SECRET_RX.search(f.read_bytes().decode("utf-8", "replace"))
                if m:
                    hits.append("working-tree  %s  (%s...)" % (n, m.group(0)[:6]))
        except OSError:
            pass
        if RISKY.search(n):
            hits.append("risky-name    %s" % n)
    rc, out = git(["log", "--all", "-p", "-n", "300", "--no-color", "--format=@@C@@%h"], t, 90)
    cur = fil = None
    seen = set()
    for ln in out.splitlines() if rc == 0 else []:
        if ln.startswith("@@C@@"):
            cur = ln[5:]
        elif ln.startswith("+++ b/"):
            fil = ln[6:]
        elif ln.startswith("+") and SECRET_RX.search(ln):
            k = (cur, fil)
            if k not in seen:
                seen.add(k)
                hits.append("history       %s  %s" % (cur, fil))
    p("objects: " + " ".join(git(["count-objects", "-vH"], t)[1].split("\n")[:1] + git(["count-objects", "-vH"], t)[1].split("\n")[-2:]))
    p("findings: %d" % len(hits))
    for x in hits[:15]:
        p("  " + x)
    if hits:
        flag("HIGH", "%d possible secret/risky finding(s) in target working tree or history (see section 6)" % len(hits))


@section("7 CONTENT HYGIENE (tracked files)")
def sec_hygiene():
    t = S["target"]
    if not t or not S["git_ok"]:
        p("skipped")
        return
    rc, ls = git(["ls-files", "-s"], t)
    entries = []
    for ln in ls.splitlines() if rc == 0 else []:
        m = re.match(r"(\d+) \S+ \d+\t(.+)$", ln)
        if m:
            entries.append((m.group(1), m.group(2)))
    probs, noexec = [], []
    for mode, n in entries:
        f = t / n
        if not f.is_file():
            continue
        data = f.read_bytes()
        if b"\0" in data:
            continue
        txt = data.decode("utf-8", "replace")
        zw = sum(txt.count(c) for c in ZW)
        crlf = data.count(b"\r\n")
        if zw or crlf:
            probs.append((n, zw, crlf))
        if data.startswith(b"#!") and mode == "100644" and n.startswith("scripts/"):
            noexec.append(n)
    p("tracked text files with zero-width/NBSP/BOM chars or CRLF: %d" % len(probs))
    for n, zw, crlf in probs[:15]:
        p("  %-50s zero-width/nbsp/bom=%d crlf=%d" % (n, zw, crlf))
    p("scripts with shebang but mode 100644 (no exec bit in git): " + (", ".join(noexec[:10]) or "none"))
    if any(z for _, z, _ in probs):
        flag("MED", "invisible characters in tracked files (can break scripts, e.g. U+200B at line start)")
    if noexec:
        flag("INFO", "%d script(s) lack the exec bit in git (git update-index --chmod=+x)" % len(noexec))


@section("8 GITHUB REMOTE")
def sec_github():
    if NO_NET:
        p("skipped (--no-net)")
        return
    slug = "%s/%s" % (OWNER, NAME)
    gh = shutil.which("gh")
    info = None
    if gh:
        rc, out = run(["gh", "auth", "status"], timeout=20)
        p("gh auth status: rc=%s" % rc)
        p(ind(tail(out, 5)))
        if rc != 0:
            flag("MED", "gh is not authenticated (run: gh auth login)")
        rc, out = run(["gh", "repo", "view", slug, "--json", "name,visibility,isEmpty,isArchived,description,defaultBranchRef,licenseInfo,repositoryTopics,hasIssuesEnabled,hasWikiEnabled,pushedAt,diskUsage,url"], timeout=30)
        if rc == 0:
            try:
                info = json.loads(out)
            except ValueError:
                p(out[:400])
        else:
            p("gh repo view failed: " + tail(out, 2))
    else:
        try:
            rq = urllib.request.Request("https://api.github.com/repos/" + slug, headers={"User-Agent": "ez-recon", "Accept": "application/vnd.github+json"})
            d = json.loads(urllib.request.urlopen(rq, timeout=15).read().decode("utf-8"))
            info = {"name": d.get("name"), "visibility": "PRIVATE" if d.get("private") else "PUBLIC", "isEmpty": d.get("size", 1) == 0,
                    "isArchived": d.get("archived"), "description": d.get("description"), "defaultBranchRef": {"name": d.get("default_branch")},
                    "licenseInfo": d.get("license"), "repositoryTopics": d.get("topics") or [], "pushedAt": d.get("pushed_at"), "url": d.get("html_url")}
        except Exception as e:
            p("GitHub API (unauthenticated) failed: %s: %s" % (type(e).__name__, e))
            flag("HIGH", "remote repo not visible unauthenticated (private, not created yet, or no network)")
    if info:
        tops = []
        for x in info.get("repositoryTopics") or []:
            tops.append((x.get("name") or (x.get("topic") or {}).get("name")) if isinstance(x, dict) else x)
        for k in ("url", "visibility", "isEmpty", "isArchived", "pushedAt", "diskUsage", "hasIssuesEnabled", "hasWikiEnabled"):
            if k in info:
                p("%-18s %s" % (k, info[k]))
        p("%-18s %s" % ("default branch", (info.get("defaultBranchRef") or {}).get("name")))
        p("%-18s %s" % ("license", (info.get("licenseInfo") or {}).get("name") if info.get("licenseInfo") else "NONE"))
        p("%-18s %s" % ("description", info.get("description") or "NONE"))
        p("%-18s %s" % ("topics", ", ".join(t for t in tops if t) or "NONE"))
        if info.get("isEmpty"):
            flag("HIGH", "remote repo is EMPTY: nothing has been pushed yet")
        if not info.get("description"):
            flag("INFO", "remote repo has no description")
        if not tops:
            flag("INFO", "remote repo has no topics")
        if not info.get("licenseInfo"):
            flag("INFO", "remote repo has no license")
    if gh:
        rc, out = run(["gh", "api", "repos/%s/branches" % slug, "--jq", ".[].name"], timeout=25)
        p("remote branches: " + (out.replace("\n", ", ") if rc == 0 else "unavailable"))
        for lab, cmd in (("open PRs", ["gh", "pr", "list", "-R", slug, "--state", "open", "--json", "number", "--jq", "length"]),
                         ("open issues", ["gh", "issue", "list", "-R", slug, "--state", "open", "--json", "number", "--jq", "length"])):
            rc, out = run(cmd, timeout=25)
            p("%s: %s" % (lab, out if rc == 0 else "unavailable"))
        rc, out = run(["gh", "run", "list", "-R", slug, "-L", "5"], timeout=25)
        p("recent workflow runs: " + (out[:500] if rc == 0 and out else "none/unavailable"))
    t = S["target"]
    if t and S["git_ok"]:
        rc, rem = git(["ls-remote", "--heads", "origin"], t, 40)
        p("git ls-remote origin: rc=%s %s" % (rc, rem[:300]))
        rc2, loc = git(["rev-parse", "HEAD"], t)
        if rc == 0 and rc2 == 0:
            sh = [x.split()[0] for x in rem.splitlines() if x.strip()]
            p("local HEAD %s on remote heads: %s" % (loc[:8], "YES" if loc in sh else "NO"))
            if sh and loc not in sh:
                flag("INFO", "local HEAD not equal to any remote branch head (push/pull needed)")
    if gh:
        rc, out = run(["gh", "repo", "list", OWNER, "--limit", "200", "--json", "name,visibility,isEmpty,isArchived,pushedAt"], timeout=40)
        if rc == 0:
            try:
                rows = [r for r in json.loads(out) if RELATED.search(r["name"])]
                rows.sort(key=lambda r: r.get("pushedAt") or "", reverse=True)
                p("related repos on %s (%d):" % (OWNER, len(rows)))
                for r in rows[:25]:
                    p("  %-55s %-8s empty=%-5s archived=%-5s pushed=%s" % (r["name"], r["visibility"], r["isEmpty"], r["isArchived"], (r.get("pushedAt") or "")[:10]))
            except ValueError:
                p(out[:300])


@section("9 RELATED LOCAL PROJECT FOLDERS AND FILES")
def sec_related():
    n = 0
    for dp, dn, fn in walk(HOME, 2):
        for x in sorted(dn) + sorted(fn):
            if not RELATED.search(x):
                continue
            f = Path(dp) / x
            if n >= 25:
                break
            n += 1
            if f.is_dir():
                extra = ""
                if (f / ".git").exists():
                    extra = " git:" + (git(["remote", "get-url", "origin"], f)[1].splitlines() or ["no-remote"])[-1] + " last:" + git(["log", "-1", "--format=%cs"], f)[1][-10:]
                p("dir  %s %s%s" % (mt(f), f, extra))
            else:
                sz = f.stat().st_size
                p("file %s %9d %s" % (mt(f), sz, f))
                if sz == 0 and x.endswith(".html"):
                    flag("INFO", "zero-byte file %s" % f)


def _hook_dirs():
    ds = []
    for cwd in (HOME, S["target"]):
        if cwd:
            rc, v = git(["config", "--get", "core.hooksPath"], cwd)
            if rc == 0 and v:
                ds.append(Path(os.path.expanduser(v.splitlines()[-1])))
    ds += [HOME / ".git-hooks", HOME / ".config" / "git-hooks", HOME / ".git-hooks-global"]
    if S["target"]:
        ds.append(Path(S["target"]) / ".git" / "hooks")
    ds.append(HOME / ".git" / "hooks")
    out, seen = [], set()
    for d in ds:
        d = d if d.is_absolute() else (HOME / d)
        if d.is_dir() and str(d) not in seen:
            seen.add(str(d))
            out.append(d)
    return out


@section("10 GIT HOOKS (invalid grep patterns, commit-msg rules)")
def sec_hooks():
    g = git(["config", "--global", "--list", "--show-origin"], HOME)[1]
    keep = [x for x in g.splitlines() if re.search(r"core\.(hookspath|excludesfile|autocrlf)|init\.defaultbranch|commit\.gpgsign|credential\.helper", x, re.I)]
    p("global git config (selected):\n" + ind("\n".join(keep) or "none", 2))
    bad = 0
    for d in _hook_dirs():
        p("hooks dir: %s" % d)
        for f in sorted(d.iterdir()):
            if not f.is_file() or f.name.endswith(".sample"):
                continue
            try:
                txt = f.read_text(errors="replace")
            except OSError:
                continue
            lines = txt.splitlines()
            p("  %-18s %6d B exec=%s first: %s" % (f.name, f.stat().st_size, os.access(str(f), os.X_OK), (lines[0] if lines else "")[:50]))
            for i, ln in enumerate(lines, 1):
                if "grep" not in ln or ln.lstrip().startswith("#"):
                    continue
                mode = ["-P"] if re.search(r"\s-\w*P", ln) else (["-E"] if re.search(r"\s-\w*E|egrep", ln) else [])
                for tok in re.findall(r"'([^']*)'|\"([^\"]*)\"", ln):
                    pat = tok[0] or tok[1]
                    if "[" not in pat or "$" in pat and "[" not in pat.split("$")[0]:
                        continue
                    rc, out = run(["grep"] + mode + ["-e", pat, os.devnull], timeout=5)
                    if rc == 2 and re.search(r"invalid|unmatched|unbalanced|trailing|bad", out, re.I):
                        bad += 1
                        p("    INVALID-REGEX %s:%d %s pattern=%r -> %s" % (f.name, i, " ".join(mode) or "BRE", pat[:60], out.splitlines()[-1][:60]))
            if f.name == "commit-msg":
                for i, ln in enumerate(lines, 1):
                    if re.search(r"feat|fix|docs|chore|conventional|regex|\^\(", ln, re.I):
                        p("    rule  %d: %s" % (i, ln.strip()[:110]))
    if bad:
        flag("HIGH", "%d invalid grep pattern(s) in git hooks (this is the 'grep: Invalid range end' error); see section 10" % bad)
    else:
        p("no invalid grep patterns detected in hook files")


@section("11 SHELL-SCRIPT HAZARDS AND DASHBOARD BINDING")
def sec_misc():
    hits = []
    for pat in ("*.sh", "*.py", "*.md"):
        for f in HOME.glob(pat):
            try:
                txt = f.read_text(errors="replace")
            except OSError:
                continue
            z = sum(txt.count(c) for c in ZW)
            if z:
                hits.append((f.name, z))
    p("top-level ~/*.sh|py|md files containing zero-width/NBSP/BOM chars: %d" % len(hits))
    for n, z in sorted(hits)[:15]:
        p("  %-40s %d" % (n, z))
    if any(n.endswith(".sh") for n, _ in hits):
        flag("MED", "invisible characters in ~ scripts (e.g. %s): 'not found' errors on every line; strip with: sed -i 's/\\xe2\\x80\\x8b//g' FILE" % [n for n, _ in hits if n.endswith(".sh")][0])
    for c in (HOME / "dashboard.py", HOME / "projects" / "xlean-omega" / "lib" / "ultra" / "dashboard.py"):
        if c.exists():
            p("dashboard file: %s" % c)
            for i, ln in enumerate(c.read_text(errors="replace").splitlines(), 1):
                if re.search(r"app\.run|host\s*=|0\.0\.0\.0|DASHBOARD_TOKEN", ln):
                    p("  %d: %s" % (i, ln.strip()[:120]))
                    if "0.0.0.0" in ln:
                        flag("MED", "%s binds 0.0.0.0 (all interfaces); use 127.0.0.1 unless LAN/Tailscale access is intended" % c.name)


def main():
    n = len(SECTIONS)
    for i, (title, fn) in enumerate(SECTIONS, 1):
        fn(i, n)
    order = {"HIGH": 0, "MED": 1, "INFO": 2}
    head = ["ez_repo_recon report %s | target repo: %s/%s" % (STAMP, OWNER, NAME), "", "=== FLAGS (%d) ===" % len(FLAGS)]
    for sev, msg in sorted(FLAGS, key=lambda x: order[x[0]]):
        head.append("[%s] %s" % (sev, red(msg)))
    if not FLAGS:
        head.append("none")
    body = head + L + ["", "=== END (report saved to %s) ===" % OUT]
    text = "\n".join(body) + "\n"
    OUT.write_text(text)
    os.chmod(str(OUT), 0o600)
    print(text)


if __name__ == "__main__":
    main()
PYEOF
python3 "$HOME/ez_repo_recon.py" "$@"
