import { BulkSubmit } from "../_components/bulk-submit";
import styles from "../page.module.css";

export const metadata = {
  title: "Add link — Blink",
};

export default function AddLinkPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Add link</h1>
        <p className={styles.subtitle}>
          One URL or many — paste them in.
        </p>
      </header>

      <BulkSubmit />
    </main>
  );
}
