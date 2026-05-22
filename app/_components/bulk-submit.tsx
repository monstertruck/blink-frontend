"use client";

import {
  useMemo,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createLink, describeApiError } from "@/lib/api/client";
import styles from "./bulk-submit.module.css";

type LineState =
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "saved"; alreadyExisted: boolean; title: string | null }
  | { kind: "error"; message: string };

type Totals = { saved: number; existed: number; failed: number };

export function BulkSubmit() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [lineStates, setLineStates] = useState<Record<string, LineState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [skipSummary, setSkipSummary] = useState(false);

  const lines = useMemo(() => parseLines(text), [text]);

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    // When the clipboard carries rich text, prefer hrefs from <a> tags over
    // the plain-text fallback. Lets the user paste a list of hyperlinks from
    // a browser and have only the URLs land in the box.
    const html = e.clipboardData.getData("text/html");
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const hrefs = Array.from(doc.querySelectorAll("a[href]"))
      .map((a) => (a as HTMLAnchorElement).getAttribute("href")?.trim())
      .filter((h): h is string => !!h);
    if (hrefs.length === 0) return;
    e.preventDefault();
    setText((prev) => {
      const trimmed = prev.replace(/\s+$/, "");
      const insert = hrefs.join("\n");
      return trimmed ? `${trimmed}\n${insert}` : insert;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || lines.length === 0) return;
    setSubmitting(true);
    setTotals(null);

    const initial: Record<string, LineState> = {};
    for (const url of lines) initial[url] = { kind: "pending" };
    setLineStates(initial);

    let saved = 0;
    let existed = 0;
    let failed = 0;

    for (const url of lines) {
      setLineStates((prev) => ({ ...prev, [url]: { kind: "saving" } }));
      try {
        const r = await createLink({ url, skip_summary: skipSummary });
        if (r.alreadyExisted) existed++;
        else saved++;
        setLineStates((prev) => ({
          ...prev,
          [url]: {
            kind: "saved",
            alreadyExisted: r.alreadyExisted,
            title: r.link.title,
          },
        }));
      } catch (err) {
        failed++;
        setLineStates((prev) => ({
          ...prev,
          [url]: { kind: "error", message: describeApiError(err) },
        }));
      }
    }

    setSubmitting(false);
    setTotals({ saved, existed, failed });
    router.refresh();
  }

  const count = lines.length;
  const buttonLabel = submitting
    ? "Saving…"
    : count <= 1
      ? "Save link"
      : `Save ${count} links`;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>
          Paste one URL per line. Hyperlinks copied from a browser are fine —
          we’ll extract the addresses.
        </span>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLineStates({});
            setTotals(null);
          }}
          onPaste={handlePaste}
          rows={8}
          placeholder={"https://example.com\nhttps://another.com"}
          autoFocus
          disabled={submitting}
        />
      </label>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={skipSummary}
          onChange={(e) => setSkipSummary(e.target.checked)}
          disabled={submitting}
        />
        Skip AI summary
      </label>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          disabled={submitting || count === 0}
        >
          {buttonLabel}
        </button>
        {totals ? (
          <p className={styles.summary}>
            {totals.saved} saved
            {totals.existed > 0 ? `, ${totals.existed} already saved` : ""}
            {totals.failed > 0 ? `, ${totals.failed} failed` : ""}.
          </p>
        ) : null}
      </div>

      {count > 0 ? (
        <ul className={styles.lines}>
          {lines.map((url) => (
            <LineRow key={url} url={url} state={lineStates[url] ?? null} />
          ))}
        </ul>
      ) : null}
    </form>
  );
}

function LineRow({
  url,
  state,
}: {
  url: string;
  state: LineState | null;
}) {
  let icon = "•";
  let iconClass = styles.iconPending;
  let detail: string | null = null;

  if (state?.kind === "saving") {
    icon = "…";
    iconClass = styles.iconSaving;
  } else if (state?.kind === "saved") {
    icon = "✓";
    iconClass = state.alreadyExisted ? styles.iconExists : styles.iconSaved;
    if (state.alreadyExisted) detail = "already saved";
    else if (state.title) detail = state.title;
  } else if (state?.kind === "error") {
    icon = "✗";
    iconClass = styles.iconError;
    detail = state.message;
  }

  return (
    <li className={styles.lineRow}>
      <span className={`${styles.icon} ${iconClass}`}>{icon}</span>
      <span className={styles.url}>{url}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
    </li>
  );
}

function parseLines(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
