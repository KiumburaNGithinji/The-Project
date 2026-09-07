/**
 * Reordering helpers shared by the mentor editor's drag-and-drop list.
 *
 * Everything works on the rendered array rather than raw `position` numbers,
 * so the result always matches the order the mentor is actually looking at —
 * even if positions have drifted, tied, or left gaps.
 */

export type Ordered = { id: string; position: number };

/** Order exactly as the UI does: by position, then id to break ties. */
export function byPosition<T extends Ordered>(a: T, b: T) {
  return a.position - b.position || a.id.localeCompare(b.id);
}

/**
 * Move `id` one slot in `direction`. Returns a new array, or null when the
 * item is already at that end (or isn't in the list).
 */
export function shiftById<T extends { id: string }>(
  list: T[],
  id: string,
  direction: "up" | "down",
): T[] | null {
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return null;

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= list.length) return null;

  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export type SwapPlan =
  | { kind: "none" }
  | { kind: "swap"; a: { id: string; position: number }; b: { id: string; position: number } }
  | { kind: "renumber"; rows: { id: string; position: number }[] };

/**
 * Work out the minimal set of writes for one arrow click.
 *
 * The normal case is a two-row position swap. When the two rows share a
 * position — which makes a swap a no-op and leaves the order ambiguous — the
 * whole sibling list is renumbered sequentially instead, repairing it.
 */
export function planMove<T extends Ordered>(
  siblings: T[],
  id: string,
  direction: "up" | "down",
): SwapPlan {
  const ordered = [...siblings].sort(byPosition);
  const from = ordered.findIndex((x) => x.id === id);
  if (from < 0) return { kind: "none" };

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return { kind: "none" };

  const a = ordered[from];
  const b = ordered[to];

  if (a.position === b.position) {
    const next = shiftById(ordered, id, direction) ?? ordered;
    return {
      kind: "renumber",
      rows: next.map((row, i) => ({ id: row.id, position: i + 1 })),
    };
  }

  return {
    kind: "swap",
    a: { id: a.id, position: b.position },
    b: { id: b.id, position: a.position },
  };
}

/**
 * Move `id` to `toIndex` in the rendered order. Returns a new array, or null
 * when nothing would change (or the item isn't in the list).
 */
export function moveToIndex<T extends { id: string }>(
  list: T[],
  id: string,
  toIndex: number,
): T[] | null {
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return null;

  const to = Math.max(0, Math.min(list.length - 1, toIndex));
  if (to === from) return null;

  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Plan a drag. A drop can land anywhere in the list, so there is no two-row
 * swap to be clever about: renumber the siblings sequentially and write only
 * the rows whose position actually changed — usually a handful, not the lot.
 */
export function planReorder<T extends Ordered>(
  siblings: T[],
  id: string,
  toIndex: number,
): SwapPlan {
  const ordered = [...siblings].sort(byPosition);
  const next = moveToIndex(ordered, id, toIndex);
  if (!next) return { kind: "none" };

  const was = new Map(ordered.map((row) => [row.id, row.position]));
  const rows = next
    .map((row, i) => ({ id: row.id, position: i + 1 }))
    .filter((row) => was.get(row.id) !== row.position);

  return rows.length ? { kind: "renumber", rows } : { kind: "none" };
}
