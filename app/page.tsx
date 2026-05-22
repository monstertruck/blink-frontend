import { listCategories, listLinks } from "@/lib/api/client";
import type { CategoryCount, LinkResponse } from "@/lib/api/types";
import { LinksBrowser } from "./_components/links-browser";
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
      listLinks({ limit: 500 }),
      listCategories(true),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const categoryNames = categories
    .map((c) => c.category)
    .sort((a, b) => a.localeCompare(b));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Read links</h1>
        <p className={styles.subtitle}>Browse what you’ve saved, and read some links.</p>
      </header>

      {fetchError ? (
        <p className={styles.error}>
          Couldn’t reach the backend: {fetchError}
        </p>
      ) : links.length === 0 ? (
        <p className={styles.empty}>
          No links saved yet. Head to <strong>Add</strong> to paste some.
        </p>
      ) : (
        <LinksBrowser links={links} categories={categoryNames} />
      )}
    </main>
  );
}
