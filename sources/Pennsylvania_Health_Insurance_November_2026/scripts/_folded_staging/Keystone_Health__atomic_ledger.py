"""Atomic JSON ledger persistence with flock-based cross-process safety.

Design contract (per tech-ref-portal TRP-001):
    - Writes are serialized process-wide AND cross-process via fcntl.flock.
    - Writes are crash-safe: temp file -> fsync -> os.replace (atomic rename).
    - Reads take a shared lock so they never observe a torn write.
    - Zero third-party dependencies: stdlib only (json, os, fcntl, tempfile).

Ownership map:
    AtomicLedger            -> trust this class for all ledger writes
    _verify_integrity()     -> OPTIONAL hook for hash-based tamper detection
                               (activates once LedgerIntegrityPolicy lands)

Cross-platform note:
    fcntl is POSIX-only (fine for Termux/Debian targets). If Windows support
    is ever added, gate fcntl with `hasattr(fcntl, "flock")` and fall back
    to a portal.lock advisory mtime lock.
"""

import fcntl
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Union

# TODO(security): Replace 0o600 placeholder once the compliance requirement
# in TRP-006 (umask 077 bootstrap) is finalized. Track in a constant so it
# is auditable from one place.
LEDGER_FILE_MODE = 0o600          # owner read/write only; tighten or relax per policy
LOCK_FILE_MODE = 0o600            # lock file holds no secrets but keep it consistent


class AtomicLedger:
    """Thread-safe and process-safe atomic JSON ledger manager.

    Usage:
        ledger = AtomicLedger(Path("~/data/ledgers/portal.json"))
        records = ledger.append_record({"id": "TRP-001", "status": "pass"})

    Guarantees:
        1. append_record either fully lands the new record or leaves the
           ledger byte-identical to its prior state (no torn files).
        2. On any failure the temp file is unlinked; no stray .ledger_tmp_*
           files survive a raised exception.
        3. Concurrent readers never see a partial JSON document.
    """

    def __init__(self, storage_path: Union[str, Path]):
        self.storage_path = Path(storage_path).expanduser().resolve()
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        # NOTE: with_suffix(".lock") replaces the extension. If filenames
        # collide across dirs (foo.json vs foo.csv), use
        # f"{self.storage_path.name}.lock" instead — decided: safe here
        # because all ledgers use the .json suffix by convention.
        self.lock_path = self.storage_path.with_suffix(".lock")

        # Touch once at init so the shared-lock read path can use "r+"
        # without FileNotFoundError on first use. Idempotent.
        if not self.lock_path.exists():
            with open(self.lock_path, "w") as _lf:
                pass
            os.chmod(self.lock_path, LOCK_FILE_MODE)

    # ------------------------------------------------------------------ #
    # Read path                                                          #
    # ------------------------------------------------------------------ #

    def read_records(self, take_shared_lock: bool = True) -> List[Dict[str, Any]]:
        """Return all ledger records.

        Args:
            take_shared_lock: Hold LOCK_SH for the duration of the read so
                concurrent writers cannot swap the file mid-read. Pass
                False ONLY when called from inside append_record, which
                already holds LOCK_EX (re-locking the same inode from the
                same process is fine for flock, but skipping it avoids
                deadlocking surprises with mixed fcntl usage).

        Corrupt-or-missing semantics: returns [] rather than raising —
        a failed read must never cascade into a failed write cycle.
        """
        lock_handle = None
        try:
            if take_shared_lock:
                lock_handle = open(self.lock_path, "r")
                fcntl.flock(lock_handle.fileno(), fcntl.LOCK_SH)

            if not self.storage_path.exists():
                return []

            with open(self.storage_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except (json.JSONDecodeError, OSError):
            # TODO(observability): replace silent swallow with the
            # structured logging orchestrator (Phase 4) so corruption
            # events are counted, not just tolerated.
            return []
        finally:
            if lock_handle:
                fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
                lock_handle.close()

    # ------------------------------------------------------------------ #
    # Write path                                                         #
    # ------------------------------------------------------------------ #

    def append_record(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Atomically append one record and return the resulting ledger.

        Lock discipline:
            LOCK_EX on the dedicated .lock file serializes ALL writers
            (threads flock the same inode independently — flock is a
            file-descriptor lock, so thread-vs-thread races on a single
            shared FD don't apply here because we open a fresh FD per
            call).
        """
        with open(self.lock_path, "r+") as lock_file:   # "r+": never truncate the lock inode
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                # Pre-load full state into memory BEFORE opening any
                # write buffer (TRP-001 acceptance criterion: memory
                # validation precedes temp-file creation).
                existing_data = self.read_records(take_shared_lock=False)
                pending_state = existing_data + [record]

                self._validate_pending_state(pending_state)

                target_dir = self.storage_path.parent
                temp_fd, temp_path = tempfile.mkstemp(
                    dir=target_dir, prefix=".ledger_tmp_"
                )
                try:
                    with os.fdopen(temp_fd, "w", encoding="utf-8") as temp_file:
                        json.dump(pending_state, temp_file, indent=2, ensure_ascii=False)
                        temp_file.flush()
                        os.fsync(temp_file.fileno())   # durable before rename

                    os.chmod(temp_path, LEDGER_FILE_MODE)
                    os.replace(temp_path, self.storage_path)   # atomic on POSIX
                except Exception:
                    # Cleanup invariant: no orphaned temp files on failure.
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                    raise

                self._post_write_hook(self.storage_path)

                return pending_state
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    # ------------------------------------------------------------------ #
    # Extension hooks (placeholders — keep signatures stable)             #
    # ------------------------------------------------------------------ #

    def _validate_pending_state(self, state: List[Dict[str, Any]]) -> None:
        """Hook: schema/Pydantic-style validation of the ABOUT-TO-BE-WRITTEN state.

        Placeholder contract:
            - Raise BEFORE any temp file is created if a record is invalid.
            - Keeps `existing_data` untouched so a raise leaves the ledger
              exactly as it was (memory safety per TRP-001).

        TODO(phase-2): wire in the Pydantic ledger record model here,
        e.g. `for r in state: LedgerRecord.model_validate(r)`.
        """
        # PLACEHOLDER — currently accepts everything.
        # Keep this method even while empty: callers and tests already
        # reference this seam for TRP-001 'pre-load memory validation'.
        return None

    def _post_write_hook(self, final_path: Path) -> None:
        """Hook: runs AFTER the atomic rename, while LOCK_EX is still held.

        Intended uses (decide per compliance requirements):
            - Append a sha256 digest sidecar (<ledger>.sha256) for
              tamper-evident reads (pairs with HMAC masking story).
            - Emit a structured telemetry event per Phase 4 observability.
            - Ship decrypted-at-rest journal entries to the webhook
              sanitizer queue.

        IMPORTANT: do NOT introduce blocking I/O here that can raise —
        failures in this hook run under the write lock; raise only for
        "the write did not count" scenarios.
        """
        # PLACEHOLDER — no-op until LedgerIntegrityPolicy is defined.
        return None

    def _verify_integrity(self) -> bool:
        """Placeholder: hash sidecar comparison for corruption detection.

        TODO(security/TRP-002 adjacent): returns True (trusted) until the
        sha256 sidecar format is specced. Once specced:
            1. Read <storage_path>.sha256
            2. Recompute digest of storage_path
            3. Return (match) — and quarantine the file to
               .quarantine/ on mismatch instead of silently returning []
        """
        return True



"""Atomic JSON ledger persistence with flock-based cross-process safety.

Design contract (per tech-ref-portal TRP-001):
    - Writes are serialized process-wide AND cross-process via fcntl.flock.
    - Writes are crash-safe: temp file -> fsync -> os.replace (atomic rename).
    - Reads take a shared lock so they never observe a torn write.
    - Zero third-party dependencies: stdlib only (json, os, fcntl, tempfile).

Ownership map:
    AtomicLedger            -> trust this class for all ledger writes
    _verify_integrity()     -> OPTIONAL hook for hash-based tamper detection
                               (activates once LedgerIntegrityPolicy lands)

Cross-platform note:
    fcntl is POSIX-only (fine for Termux/Debian targets). If Windows support
    is ever added, gate fcntl with `hasattr(fcntl, "flock")` and fall back
    to a portal.lock advisory mtime lock.
"""

import fcntl
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Union

# TODO(security): Replace 0o600 placeholder once the compliance requirement
# in TRP-006 (umask 077 bootstrap) is finalized. Track in a constant so it
# is auditable from one place.
LEDGER_FILE_MODE = 0o600          # owner read/write only; tighten or relax per policy
LOCK_FILE_MODE = 0o600            # lock file holds no secrets but keep it consistent


class AtomicLedger:
    """Thread-safe and process-safe atomic JSON ledger manager.

    Usage:
        ledger = AtomicLedger(Path("~/data/ledgers/portal.json"))
        records = ledger.append_record({"id": "TRP-001", "status": "pass"})

    Guarantees:
        1. append_record either fully lands the new record or leaves the
           ledger byte-identical to its prior state (no torn files).
        2. On any failure the temp file is unlinked; no stray .ledger_tmp_*
           files survive a raised exception.
        3. Concurrent readers never see a partial JSON document.
    """

    def __init__(self, storage_path: Union[str, Path]):
        self.storage_path = Path(storage_path).expanduser().resolve()
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        # NOTE: with_suffix(".lock") replaces the extension. If filenames
        # collide across dirs (foo.json vs foo.csv), use
        # f"{self.storage_path.name}.lock" instead — decided: safe here
        # because all ledgers use the .json suffix by convention.
        self.lock_path = self.storage_path.with_suffix(".lock")

        # Touch once at init so the shared-lock read path can use "r+"
        # without FileNotFoundError on first use. Idempotent.
        if not self.lock_path.exists():
            with open(self.lock_path, "w") as _lf:
                pass
            os.chmod(self.lock_path, LOCK_FILE_MODE)

    # ------------------------------------------------------------------ #
    # Read path                                                          #
    # ------------------------------------------------------------------ #

    def read_records(self, take_shared_lock: bool = True) -> List[Dict[str, Any]]:
        """Return all ledger records.

        Args:
            take_shared_lock: Hold LOCK_SH for the duration of the read so
                concurrent writers cannot swap the file mid-read. Pass
                False ONLY when called from inside append_record, which
                already holds LOCK_EX (re-locking the same inode from the
                same process is fine for flock, but skipping it avoids
                deadlocking surprises with mixed fcntl usage).

        Corrupt-or-missing semantics: returns [] rather than raising —
        a failed read must never cascade into a failed write cycle.
        """
        lock_handle = None
        try:
            if take_shared_lock:
                lock_handle = open(self.lock_path, "r")
                fcntl.flock(lock_handle.fileno(), fcntl.LOCK_SH)

            if not self.storage_path.exists():
                return []

            with open(self.storage_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except (json.JSONDecodeError, OSError):
            # TODO(observability): replace silent swallow with the
            # structured logging orchestrator (Phase 4) so corruption
            # events are counted, not just tolerated.
            return []
        finally:
            if lock_handle:
                fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
                lock_handle.close()

    # ------------------------------------------------------------------ #
    # Write path                                                         #
    # ------------------------------------------------------------------ #

    def append_record(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Atomically append one record and return the resulting ledger.

        Lock discipline:
            LOCK_EX on the dedicated .lock file serializes ALL writers
            (threads flock the same inode independently — flock is a
            file-descriptor lock, so thread-vs-thread races on a single
            shared FD don't apply here because we open a fresh FD per
            call).
        """
        with open(self.lock_path, "r+") as lock_file:   # "r+": never truncate the lock inode
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                # Pre-load full state into memory BEFORE opening any
                # write buffer (TRP-001 acceptance criterion: memory
                # validation precedes temp-file creation).
                existing_data = self.read_records(take_shared_lock=False)
                pending_state = existing_data + [record]

                self._validate_pending_state(pending_state)

                target_dir = self.storage_path.parent
                temp_fd, temp_path = tempfile.mkstemp(
                    dir=target_dir, prefix=".ledger_tmp_"
                )
                try:
                    with os.fdopen(temp_fd, "w", encoding="utf-8") as temp_file:
                        json.dump(pending_state, temp_file, indent=2, ensure_ascii=False)
                        temp_file.flush()
                        os.fsync(temp_file.fileno())   # durable before rename

                    os.chmod(temp_path, LEDGER_FILE_MODE)
                    os.replace(temp_path, self.storage_path)   # atomic on POSIX
                except Exception:
                    # Cleanup invariant: no orphaned temp files on failure.
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                    raise

                self._post_write_hook(self.storage_path)

                return pending_state
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    # ------------------------------------------------------------------ #
    # Extension hooks (placeholders — keep signatures stable)             #
    # ------------------------------------------------------------------ #

    def _validate_pending_state(self, state: List[Dict[str, Any]]) -> None:
        """Hook: schema/Pydantic-style validation of the ABOUT-TO-BE-WRITTEN state.

        Placeholder contract:
            - Raise BEFORE any temp file is created if a record is invalid.
            - Keeps `existing_data` untouched so a raise leaves the ledger
              exactly as it was (memory safety per TRP-001).

        TODO(phase-2): wire in the Pydantic ledger record model here,
        e.g. `for r in state: LedgerRecord.model_validate(r)`.
        """
        # PLACEHOLDER — currently accepts everything.
        # Keep this method even while empty: callers and tests already
        # reference this seam for TRP-001 'pre-load memory validation'.
        return None

    def _post_write_hook(self, final_path: Path) -> None:
        """Hook: runs AFTER the atomic rename, while LOCK_EX is still held.

        Intended uses (decide per compliance requirements):
            - Append a sha256 digest sidecar (<ledger>.sha256) for
              tamper-evident reads (pairs with HMAC masking story).
            - Emit a structured telemetry event per Phase 4 observability.
            - Ship decrypted-at-rest journal entries to the webhook
              sanitizer queue.

        IMPORTANT: do NOT introduce blocking I/O here that can raise —
        failures in this hook run under the write lock; raise only for
        "the write did not count" scenarios.
        """
        # PLACEHOLDER — no-op until LedgerIntegrityPolicy is defined.
        return None

    def _verify_integrity(self) -> bool:
        """Placeholder: hash sidecar comparison for corruption detection.

        TODO(security/TRP-002 adjacent): returns True (trusted) until the
        sha256 sidecar format is specced. Once specced:
            1. Read <storage_path>.sha256
            2. Recompute digest of storage_path
            3. Return (match) — and quarantine the file to
               .quarantine/ on mismatch instead of silently returning []
        """
        return True
