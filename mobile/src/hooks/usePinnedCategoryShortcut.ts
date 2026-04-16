import { useCallback, useEffect, useState } from "react";
import {
  type CategoryShortcutId,
  loadPinnedCategoryIds,
  togglePinnedCategory,
} from "@/src/home/pinnedCategoryShortcuts";

export function usePinnedCategoryShortcut(categoryId: CategoryShortcutId) {
  const [pinned, setPinned] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = await loadPinnedCategoryIds();
      if (!cancelled) {
        setPinned(ids.includes(categoryId));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const toggle = useCallback(async () => {
    const next = await togglePinnedCategory(categoryId);
    setPinned(next.includes(categoryId));
  }, [categoryId]);

  return { pinned, toggle, ready };
}
