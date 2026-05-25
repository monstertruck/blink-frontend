import { listCategories, listLinks } from "@/lib/api/client";
import type { LinkResponse } from "@/lib/api/types";
import { SuggestList } from "./_components/suggest-list";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function pickRandom(links: LinkResponse[], n: number): LinkResponse[] {
  const shuffled = [...links];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

export default async function Suggest() {
  let suggestions: LinkResponse[] = [];
  let categories: string[] = [];
  let fetchError: string | null = null;

  try {
    const [unread, cats] = await Promise.all([
      listLinks({ status: "unread", limit: 500 }),
      listCategories(true),
    ]);
    suggestions = pickRandom(unread, 10);
    categories = cats.map((c) => c.category).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Suggested</h1>
      </header>

      {fetchError ? (
        <p className={styles.error}>Couldn't reach the backend: {fetchError}</p>
      ) : suggestions.length === 0 ? (
        <p className={styles.empty}>
          No unread links. Head to <strong>Add</strong> to save some.
        </p>
      ) : (
        <SuggestList links={suggestions} categories={categories} />
      )}
    </main>
  );
}
