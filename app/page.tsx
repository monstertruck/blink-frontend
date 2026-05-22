import { listCategories, listLinks } from "@/lib/api/client";
import type { CategoryCount, LinkResponse } from "@/lib/api/types";
import { CategorySelect } from "./_components/category-select";
import styles from "./page.module.css";

// The link list is per-user, mutable state — render fresh on every request
// instead of letting Next.js prerender it at build time.
export const dynamic = "force-dynamic";

export default async function ReadLinks() {
  let links: LinkResponse[] = [];
  let categories: CategoryCount[] = [];
  let fetchError: string | null = null;

  try {
    [links, categories] = await Promise.all([
      listLinks({ limit: 100 }),
      listCategories(true),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  // Backend has no ORDER BY yet; show newest (highest id) first.
  const sortedLinks = [...links].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  const categoryNames = categories
    .map((c) => c.category)
    .sort((a, b) => a.localeCompare(b));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Read links</h1>
        <p className={styles.subtitle}>Browse and triage what you’ve saved.</p>
      </header>

      <section className={styles.list}>
        {fetchError ? (
          <p className={styles.error}>
            Couldn’t reach the backend: {fetchError}
          </p>
        ) : sortedLinks.length === 0 ? (
          <p className={styles.empty}>
            No links saved yet. Head to <strong>Add link</strong> to paste some.
          </p>
        ) : (
          <ul className={styles.items}>
            {sortedLinks.map((link) => (
              <LinkItem
                key={link.id ?? link.url}
                link={link}
                categories={categoryNames}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function LinkItem({
  link,
  categories,
}: {
  link: LinkResponse;
  categories: string[];
}) {
  const display = link.title?.trim() || link.url;
  return (
    <li className={styles.item}>
      <a
        className={styles.itemTitle}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {display}
      </a>
      {link.title ? <div className={styles.itemUrl}>{link.url}</div> : null}
      {link.summary ? (
        <p className={styles.itemSummary}>{link.summary}</p>
      ) : null}
      <div className={styles.itemMeta}>
        {link.id !== null ? (
          <CategorySelect
            linkId={link.id}
            current={link.category}
            options={categories}
          />
        ) : (
          <span className={styles.badge}>{link.category}</span>
        )}
        <span className={`${styles.badge} ${styles.badgeStatus}`}>
          {link.status}
        </span>
      </div>
    </li>
  );
}
