"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLink, deleteLink, setLinkStatus } from "@/lib/api/client";
import type { LinkResponse, LinkStatus } from "@/lib/api/types";
import { CategorySelect } from "./category-select";
import styles from "./links-browser.module.css";

type Props = {
  links: LinkResponse[];
  categories: string[];
};

const PAGE = 10;

export function LinksBrowser({ links, categories }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<LinkStatus | "">("");
  const [visible, setVisible] = useState(PAGE);

  // Reset paging whenever the result set changes.
  useEffect(() => {
    setVisible(PAGE);
  }, [query, category, status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links
      .filter((l) => !category || l.category === category)
      .filter((l) => !status || l.status === status)
      .filter((l) => !q || matches(l, q));
  }, [links, query, category, status]);

  // Backend has no ORDER BY; show newest (highest id) first.
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [filtered],
  );

  const shown = sorted.slice(0, visible);
  const hasMore = sorted.length > visible;

  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search title, URL, or summary…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search links"
        />
        <select
          className={styles.filter}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className={styles.filter}
          value={status}
          onChange={(e) => setStatus(e.target.value as LinkStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      <p className={styles.count}>
        {sorted.length === 0
          ? "No matches."
          : `Showing ${shown.length} of ${sorted.length}.`}
      </p>

      {sorted.length > 0 && (
        <ul className={styles.list}>
          {shown.map((link) => (
            <LinkRow
              key={link.id ?? link.url}
              link={link}
              categories={categories}
            />
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          className={styles.showMore}
          onClick={() => setVisible((v) => v + PAGE)}
        >
          Show {Math.min(PAGE, sorted.length - visible)} more
        </button>
      ) : null}
    </div>
  );
}

function LinkRow({
  link,
  categories,
}: {
  link: LinkResponse;
  categories: string[];
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<LinkStatus | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const displayStatus = pendingStatus ?? link.status;

  // Drop optimistic state once the refreshed server data matches it.
  useEffect(() => {
    if (pendingStatus !== null && pendingStatus === link.status) {
      setPendingStatus(null);
    }
  }, [link.status, pendingStatus]);

  function updateStatus(next: LinkStatus) {
    if (link.id === null) return;
    if (next === displayStatus) return;
    setPendingStatus(next);
    setLinkStatus(link.id, next)
      .then(() => router.refresh())
      .catch(() => setPendingStatus(null));
  }

  function handleDelete() {
    if (link.id === null) return;
    setDeleted(true);
    deleteLink(link.id)
      .then(() => router.refresh())
      .catch(() => setDeleted(false));
  }

  async function handleRecategorize() {
    if (link.id === null) return;
    setRecategorizing(true);
    try {
      await deleteLink(link.id);
      await createLink({
        url: link.url,
        ...(link.title ? { title: link.title } : {}),
        skip_summary: true,
      });
      router.refresh();
    } catch {
      setRecategorizing(false);
    }
  }

  const display = link.title?.trim() || link.url;
  const canToggle = link.id !== null;

  if (deleted) return null;

  return (
    <li className={`${styles.row}${recategorizing ? ` ${styles.rowBusy}` : ""}`}>
      <div className={styles.rowTop}>
        <a
          className={styles.title}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => updateStatus("read")}
        >
          {display}
        </a>
        <div className={styles.meta}>
          {link.id !== null ? (
            <CategorySelect
              linkId={link.id}
              current={link.category}
              options={categories}
            />
          ) : (
            <span className={styles.badge}>{link.category}</span>
          )}
          <button
            type="button"
            className={`${styles.status} ${
              displayStatus === "read" ? styles.statusRead : styles.statusUnread
            }`}
            onClick={() =>
              updateStatus(displayStatus === "read" ? "unread" : "read")
            }
            disabled={!canToggle}
            aria-label={`Mark as ${
              displayStatus === "read" ? "unread" : "read"
            }`}
            title={`Click to mark as ${
              displayStatus === "read" ? "unread" : "read"
            }`}
          >
            {displayStatus}
          </button>
          <button
            type="button"
            className={styles.recategorizeBtn}
            onClick={handleRecategorize}
            disabled={link.id === null || recategorizing}
            aria-label="Re-categorize link"
            title="Delete and re-add to re-run categorization"
          >
            {recategorizing ? "…" : "↻"}
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={link.id === null || recategorizing}
            aria-label="Delete link"
            title="Delete link"
          >
            ×
          </button>
        </div>
      </div>
      {link.summary ? (
        <p className={styles.summary}>{link.summary}</p>
      ) : null}
    </li>
  );
}

function matches(link: LinkResponse, q: string): boolean {
  if (link.url.toLowerCase().includes(q)) return true;
  if (link.title && link.title.toLowerCase().includes(q)) return true;
  if (link.summary.toLowerCase().includes(q)) return true;
  return false;
}
