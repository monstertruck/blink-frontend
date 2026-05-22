import { listCategories, listLinks } from "@/lib/api/client";
import type { LinkResponse } from "@/lib/api/types";
import { SuggestList } from "./_components/suggest-list";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function pickDiverse(links: LinkResponse[], n: number): LinkResponse[] {
  const groups = new Map<string, LinkResponse[]>();
  for (const link of links) {
    const cat = link.category || "uncategorized";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(link);
  }
  for (const group of groups.values()) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  }
  const cats = [...groups.keys()];
  for (let i = cats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }
  const result: LinkResponse[] = [];
  const pointers = new Map(cats.map((c) => [c, 0]));
  outer: while (result.length < n) {
    let any = false;
    for (const cat of cats) {
      if (result.length >= n) break outer;
      const group = groups.get(cat)!;
      const i = pointers.get(cat)!;
      if (i < group.length) {
        result.push(group[i]);
        pointers.set(cat, i + 1);
        any = true;
      }
    }
    if (!any) break;
  }
  return result;
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
    suggestions = pickDiverse(unread, 10);
    categories = cats.map((c) => c.category).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const catCount = new Set(suggestions.map((l) => l.category)).size;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Suggested</h1>
        {suggestions.length > 0 && (
          <p className={styles.subtitle}>
            {suggestions.length} unread link{suggestions.length !== 1 ? "s" : ""} across{" "}
            {catCount} categor{catCount !== 1 ? "ies" : "y"}.
          </p>
        )}
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
