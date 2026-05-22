"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCategory, describeApiError } from "@/lib/api/client";
import styles from "./add-category.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export function AddCategory() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setStatus({ kind: "submitting" });
    try {
      const result = await createCategory(trimmed);
      setName("");
      setStatus({ kind: "ok", message: `Added "${result.name}".` });
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: describeApiError(err) });
    }
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a category…"
        aria-label="New category name"
      />
      <button
        className={styles.submit}
        type="submit"
        disabled={isSubmitting || !name.trim()}
      >
        {isSubmitting ? "Adding…" : "Add"}
      </button>
      {status.kind === "ok" && (
        <span className={`${styles.status} ${styles.statusOk}`}>
          {status.message}
        </span>
      )}
      {status.kind === "error" && (
        <span className={`${styles.status} ${styles.statusError}`}>
          {status.message}
        </span>
      )}
    </form>
  );
}
