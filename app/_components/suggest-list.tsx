"use client";

import { useEffect, useState } from "react";
import { createLink, deleteLink, setLinkStatus } from "@/lib/api/client";
import type { LinkResponse, LinkStatus } from "@/lib/api/types";
import { CategorySelect } from "./category-select";
import styles from "./suggest-list.module.css";

type Props = {
  links: LinkResponse[];
  categories: string[];
};

export function SuggestList({ links, categories }: Props) {
  return (
    <ul className={styles.list}>
      {links.map((link) => (
        <SuggestCard
          key={link.id ?? link.url}
          link={link}
          categories={categories}
        />
      ))}
    </ul>
  );
}

function SuggestCard({
  link,
  categories,
}: {
  link: LinkResponse;
  categories: string[];
}) {
  const [pendingStatus, setPendingStatus] = useState<LinkStatus | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const displayStatus = pendingStatus ?? link.status;

  useEffect(() => {
    if (pendingStatus !== null && pendingStatus === link.status) {
      setPendingStatus(null);
    }
  }, [link.status, pendingStatus]);

  function updateStatus(next: LinkStatus) {
    if (link.id === null) return;
    if (next === displayStatus) return;
    setPendingStatus(next);
    setLinkStatus(link.id, next).catch(() => setPendingStatus(null));
  }

  function handleDelete() {
    if (link.id === null) return;
    setDeleted(true);
    deleteLink(link.id).catch(() => setDeleted(false));
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
      setDeleted(true);
    } catch {
      setRecategorizing(false);
    }
  }

  if (deleted) return null;

  const display = link.title?.trim() || link.url;

  return (
    <li
      className={`${styles.card}${recategorizing ? ` ${styles.cardBusy}` : ""}`}
    >
      <div className={styles.body}>
        <a
          className={styles.title}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => updateStatus("read")}
        >
          {display}
        </a>
        <span className={styles.url}>{link.url}</span>
        {link.summary ? (
          <p className={styles.summary}>{link.summary}</p>
        ) : null}
      </div>
      <div className={styles.footer}>
        {link.id !== null ? (
          <CategorySelect
            linkId={link.id}
            current={link.category}
            options={categories}
          />
        ) : (
          <span className={styles.badge}>{link.category}</span>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.status} ${
              displayStatus === "read"
                ? styles.statusRead
                : styles.statusUnread
            }`}
            onClick={() =>
              updateStatus(displayStatus === "read" ? "unread" : "read")
            }
            disabled={link.id === null}
            aria-label={`Mark as ${displayStatus === "read" ? "unread" : "read"}`}
            title={`Click to mark as ${displayStatus === "read" ? "unread" : "read"}`}
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
    </li>
  );
}
