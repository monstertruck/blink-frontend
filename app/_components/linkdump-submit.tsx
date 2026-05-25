"use client";

import { useReducer, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLink, deleteLink, updateLink, describeApiError } from "@/lib/api/client";
import styles from "./linkdump-submit.module.css";

type LinkState =
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "saved"; alreadyExisted: boolean; title: string | null; id: number | null; fallback?: boolean }
  | { kind: "error"; message: string }
  | { kind: "skipped" };

type Phase =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "submitting"; urls: string[]; states: Record<string, LinkState> }
  | { kind: "done"; saved: number; existed: number; failed: number }
  | { kind: "fetchError"; message: string };

export function LinkDumpSubmit() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  // Ref so the async submit loop always reads the latest skipped set
  const skippedRef = useRef(new Set<string>());
  // AbortController for the currently in-flight createLink call
  const abortRef = useRef<AbortController | null>(null);
  // Trigger re-renders when skippedRef changes
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  function skipUrl(u: string) {
    skippedRef.current.add(u);
    abortRef.current?.abort();
    forceRender();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    skippedRef.current = new Set();
    setPhase({ kind: "fetching" });

    let urls: string[];
    try {
      const res = await fetch("/api/linkdump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase({ kind: "fetchError", message: data.error ?? `Error ${res.status}` });
        return;
      }
      urls = data.urls as string[];
    } catch (err) {
      setPhase({
        kind: "fetchError",
        message: err instanceof Error ? err.message : "Failed to fetch page",
      });
      return;
    }

    if (urls.length === 0) {
      setPhase({ kind: "done", saved: 0, existed: 0, failed: 0 });
      return;
    }

    const initial: Record<string, LinkState> = {};
    for (const u of urls) initial[u] = { kind: "pending" };
    setPhase({ kind: "submitting", urls, states: initial });

    let saved = 0;
    let existed = 0;
    let failed = 0;

    for (const u of urls) {
      if (skippedRef.current.has(u)) {
        setPhase((prev) =>
          prev.kind === "submitting"
            ? { ...prev, states: { ...prev.states, [u]: { kind: "skipped" } } }
            : prev,
        );
        continue;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setPhase((prev) =>
        prev.kind === "submitting"
          ? { ...prev, states: { ...prev.states, [u]: { kind: "saving" } } }
          : prev,
      );

      try {
        const r = await createLink({ url: u, skip_summary: true }, controller.signal);
        if (r.alreadyExisted) existed++;
        else saved++;
        setPhase((prev) =>
          prev.kind === "submitting"
            ? {
                ...prev,
                states: {
                  ...prev.states,
                  [u]: { kind: "saved", alreadyExisted: r.alreadyExisted, title: r.link.title, id: r.link.id },
                },
              }
            : prev,
        );
      } catch {
        if (skippedRef.current.has(u)) {
          // aborted by user skip — already marked skipped above via skipUrl
        } else {
          try {
            const r = await createLink({ url: u, title: u, skip_summary: true });
            if (r.link.id !== null) {
              await updateLink(r.link.id, { category: "uncategorized" });
            }
            if (r.alreadyExisted) existed++;
            else saved++;
            setPhase((prev) =>
              prev.kind === "submitting"
                ? {
                    ...prev,
                    states: {
                      ...prev.states,
                      [u]: { kind: "saved", alreadyExisted: r.alreadyExisted, title: r.link.title, id: r.link.id, fallback: true },
                    },
                  }
                : prev,
            );
          } catch (fallbackErr) {
            failed++;
            setPhase((prev) =>
              prev.kind === "submitting"
                ? {
                    ...prev,
                    states: {
                      ...prev.states,
                      [u]: { kind: "error", message: describeApiError(fallbackErr) },
                    },
                  }
                : prev,
            );
          }
        }
      }
    }

    abortRef.current = null;
    setPhase({ kind: "done", saved, existed, failed });
    router.refresh();
  }

  function handleReset() {
    setUrl("");
    skippedRef.current = new Set();
    setPhase({ kind: "idle" });
  }

  const busy = phase.kind === "fetching" || phase.kind === "submitting";
  const submitLabel =
    phase.kind === "fetching"
      ? "Fetching page…"
      : phase.kind === "submitting"
        ? `Saving… (${
            Object.values(phase.states).filter(
              (s) => s.kind === "saved" || s.kind === "error" || s.kind === "skipped",
            ).length
          }/${phase.urls.length})`
        : "Add";

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Add linkdump</span>
          <input
            type="url"
            className={styles.input}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (phase.kind !== "submitting" && phase.kind !== "fetching") {
                setPhase({ kind: "idle" });
              }
            }}
            placeholder="https://example.com/my-links"
            autoComplete="off"
            disabled={busy}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={!url.trim() || busy}>
            {submitLabel}
          </button>
          {(phase.kind === "done" || phase.kind === "fetchError") && (
            <button type="button" className={styles.reset} onClick={handleReset}>
              Clear
            </button>
          )}
          {phase.kind === "done" && (
            <p className={styles.note}>
              {phase.saved === 0 && phase.existed === 0 && phase.failed === 0
                ? "No links found."
                : `${phase.saved} saved${phase.existed > 0 ? `, ${phase.existed} already saved` : ""}${phase.failed > 0 ? `, ${phase.failed} failed` : ""}.`}
            </p>
          )}
          {phase.kind === "fetchError" && (
            <p className={`${styles.note} ${styles.noteError}`}>{phase.message}</p>
          )}
        </div>
      </form>

      {phase.kind === "submitting" && (
        <ul className={styles.lines}>
          {phase.urls.map((u) => {
            const state = phase.states[u] ?? { kind: "pending" };
            return (
              <LineRow
                key={u}
                url={u}
                state={state}
                skipped={skippedRef.current.has(u)}
                onSkip={() => skipUrl(u)}
                onDeleted={() => router.refresh()}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LineRow({
  url,
  state,
  skipped,
  onSkip,
  onDeleted,
}: {
  url: string;
  state: LinkState;
  skipped: boolean;
  onSkip: () => void;
  onDeleted: () => void;
}) {
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  let icon = "•";
  let iconClass = styles.iconPending;
  let detail: string | null = null;

  if (skipped || state.kind === "skipped") {
    icon = "–";
    iconClass = styles.iconSkipped;
    detail = "skipped";
  } else if (state.kind === "saving") {
    icon = "…";
    iconClass = styles.iconSaving;
  } else if (state.kind === "saved") {
    icon = "✓";
    iconClass = state.alreadyExisted ? styles.iconExists : styles.iconSaved;
    if (state.alreadyExisted) detail = "already saved";
    else if (state.fallback) detail = "uncategorized";
    else if (state.title) detail = state.title;
  } else if (state.kind === "error") {
    icon = "✗";
    iconClass = styles.iconError;
    detail = state.message;
  }

  const isSaved = !skipped && state.kind === "saved";
  const canSkip = !skipped && state.kind !== "skipped" && !isSaved;

  function handleDelete() {
    if (state.kind !== "saved" || state.id === null) return;
    setDeleted(true);
    deleteLink(state.id).catch(() => setDeleted(false));
    onDeleted();
  }

  return (
    <li className={`${styles.lineRow}${skipped || state.kind === "skipped" ? ` ${styles.lineRowSkipped}` : ""}`}>
      <span className={`${styles.icon} ${iconClass}`}>{icon}</span>
      <span className={styles.url}>{url}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
      {isSaved && (
        <button
          type="button"
          className={styles.skipBtn}
          onClick={handleDelete}
          aria-label="Delete link"
          title="Delete"
        >
          ×
        </button>
      )}
      {canSkip && (
        <button
          type="button"
          className={styles.skipBtn}
          onClick={onSkip}
          aria-label="Skip this link"
          title="Skip"
        >
          ×
        </button>
      )}
    </li>
  );
}
