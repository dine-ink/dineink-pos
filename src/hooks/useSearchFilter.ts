import { useMemo } from "react";

// Hoists the lowercase-and-includes mechanics shared by every searchable
// list screen — callers still supply their own field list via
// `getSearchableText`, so each screen's existing match scope is unchanged.
export function useSearchFilter<T>(
  items: T[],
  search: string,
  getSearchableText: (item: T) => (string | null | undefined)[],
): T[] {
  return useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      getSearchableText(item).some((field) => (field || "").toLowerCase().includes(query)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search]);
}
