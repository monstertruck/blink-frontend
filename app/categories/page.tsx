import { listCategories } from "@/lib/api/client";
import type { CategoryCount } from "@/lib/api/types";
import { AddCategory } from "../_components/add-category";
import sharedStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories — Blink",
};

export default async function CategoriesPage() {
  let categories: CategoryCount[] = [];
  let fetchError: string | null = null;

  try {
    categories = await listCategories(true);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const sorted = [...categories].sort((a, b) =>
    a.category.localeCompare(b.category),
  );

  return (
    <main className={sharedStyles.page}>
      <header className={sharedStyles.header}>
        <h1 className={sharedStyles.title}>Categories</h1>
        <p className={sharedStyles.subtitle}>
          Add new categories and see how links are distributed across them.
        </p>
      </header>

      <AddCategory />

      <section>
        {fetchError ? (
          <p className={sharedStyles.error}>
            Couldn’t reach the backend: {fetchError}
          </p>
        ) : sorted.length === 0 ? (
          <p className={sharedStyles.empty}>
            No categories yet. Add one above.
          </p>
        ) : (
          <ul className={styles.list}>
            {sorted.map(({ category, count }) => (
              <li key={category} className={styles.row}>
                <span className={styles.name}>{category.replace(/_/g, " ")}</span>
                <span
                  className={`${styles.count} ${count === 0 ? styles.countZero : ""}`}
                >
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
