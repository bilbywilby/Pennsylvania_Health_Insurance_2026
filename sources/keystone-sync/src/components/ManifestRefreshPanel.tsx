import { startTransition, useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";

export interface ManifestRefreshResult {
  ok: boolean;
  statusMessage: string;
  manifestHash: string | null;
  checkedAt: string | null;
}

export interface ManifestRefreshPayload {
  scope: "manifest" | "manifest-and-bundle";
  pruneBuildArtifacts: boolean;
}

interface OptimisticManifestPatch {
  statusMessage: string;
  checkedAt: string;
}

const INITIAL_STATE: ManifestRefreshResult = {
  ok: false,
  statusMessage: "Ready to refresh MANIFEST.sha256.",
  manifestHash: null,
  checkedAt: null,
};

async function refreshManifestAction(
  _previousState: ManifestRefreshResult,
  formData: FormData,
): Promise<ManifestRefreshResult> {
  const scopeRaw = formData.get("scope");
  const scope: ManifestRefreshPayload["scope"] =
    scopeRaw === "manifest-and-bundle" ? "manifest-and-bundle" : "manifest";
  const pruneBuildArtifacts = formData.get("pruneBuildArtifacts") === "on";

  const payload: ManifestRefreshPayload = {
    scope,
    pruneBuildArtifacts,
  };

  try {
    const response = await fetch("/api/manifest/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: false,
        statusMessage: `Manifest refresh failed (HTTP ${response.status}) for scope "${scope}".`,
        manifestHash: null,
        checkedAt: new Date().toISOString(),
      };
    }

    const data = (await response.json()) as {
      message?: string;
      manifestHash?: string;
    };

    return {
      ok: true,
      statusMessage: data.message ?? `Refreshed ${scope} successfully.`,
      manifestHash: data.manifestHash ?? null,
      checkedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Network or bridge error";
    return {
      ok: false,
      statusMessage: `Manifest refresh error: ${detail}`,
      manifestHash: null,
      checkedAt: new Date().toISOString(),
    };
  }
}

function ManifestSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Refreshing Manifest..." : label}
    </button>
  );
}

export function ManifestRefreshPanel() {
  const [state, formAction, isPending] = useActionState(
    refreshManifestAction,
    INITIAL_STATE,
  );

  const [optimisticState, applyOptimistic] = useOptimistic<
    ManifestRefreshResult,
    OptimisticManifestPatch
  >(state, (currentState, patch) => ({
    statusMessage, ...currentState: patch.statusMessage,
    checkedAt: patch.checkedAt,
  }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scopeLabel =
      formData.get("scope") === "manifest-and-bundle"
        ? "MANIFEST.sha256 + bundle guard"
        : "MANIFEST.sha256";

    startTransition(() => {
      applyOptimistic({
        statusMessage: `Refreshing ${scopeLabel} (Just now...)`,
        checkedAt: "Just now...",
      });
      formAction(formData);
    });
  }

  const displayCheckedAt = optimisticState.checkedAt;
  const isIsoTimestamp =
    typeof displayCheckedAt === "string" && !Number.isNaN(Date.parse(displayCheckedAt)) && displayCheckedAt !== "Just now...";

  return (
    <section aria-label="Manifest Refresh">
      <form action={formAction} onSubmit={handleSubmit}>
        <label htmlFor="manifest-scope">Refresh Scope</label>
        <select id="manifest-scope" name="scope" defaultValue="manifest">
          <option value="manifest">MANIFEST.sha256 only</option>
          <option value="manifest-and-bundle">MANIFEST.sha256 + bundle guard check</option>
        </select>

        <label>
          <input type="checkbox" name="pruneBuildArtifacts" defaultChecked />
          Prune temporary build and cache artifacts
        </label>

        <ManifestSubmitButton label="Refresh Manifest" />
      </form>

      <div role="status" aria-live="polite">
        <p>{isPending ? optimisticState.statusMessage : state.statusMessage}</p>
        {state.manifestHash ? (
          <p>
            Digest: <code>{state.manifestHash}</code>
          </p>
        ) : null}
        {displayCheckedAt ? (
          <p>
            Last updated:{" "}
            {isIsoTimestamp ? (
              <time dateTime={displayCheckedAt}>{displayCheckedAt}</time>
            ) : (
              <span>{displayCheckedAt}</span>
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
