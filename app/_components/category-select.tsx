"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { describeApiError, updateLink } from "@/lib/api/client";
import styles from "./category-select.module.css";

type Props = {
  linkId: number;
  current: string;
  options: string[];
};

export function CategorySelect({ linkId, current, options }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the server refresh has landed, `current` will equal `pending`. Drop
  // the optimistic value so the prop becomes the source of truth again.
  useEffect(() => {
    if (pending !== null && pending === current) setPending(null);
  }, [current, pending]);

  const displayed = pending ?? current;
  const optionList = options.includes(displayed)
    ? options
    : [displayed, ...options];

  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === current) return;
    setError(null);
    setPending(next);
    setSaving(true);
    try {
      await updateLink(linkId, { category: next });
      router.refresh();
    } catch (err) {
      setError(describeApiError(err));
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className={styles.wrap}>
      <select
        className={styles.select}
        value={displayed}
        onChange={handleChange}
        disabled={saving}
        aria-label="Category"
      >
        {optionList.map((opt) => (
          <option key={opt} value={opt}>
            {formatName(opt)}
          </option>
        ))}
      </select>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

function formatName(name: string): string {
  return name.replace(/_/g, " ");
}
