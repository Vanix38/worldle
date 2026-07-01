import type { FieldOrder, FieldOrderMap } from "@/types/game";

export interface OrderGroup {
  label: string;
  /** Leaf values when this node has no children. */
  items: string[];
  /** Nested subgroups (e.g. saga → arcs → episodes). */
  children?: OrderGroup[];
  /** All selectable leaf values in this subtree. */
  leaves: string[];
}

export function isGroupedFieldOrder(
  order: FieldOrder | undefined,
): order is FieldOrderMap {
  return order != null && !Array.isArray(order) && typeof order === "object";
}

/** Flat chronological list used for comparison and ranking. */
export function flattenFieldOrder(order: FieldOrder | undefined): string[] {
  if (!order) return [];
  if (Array.isArray(order)) return [...order];
  const flat: string[] = [];
  for (const val of Object.values(order)) {
    flat.push(...flattenFieldOrder(val));
  }
  return flat;
}

export function fieldOrderHasItems(order: FieldOrder | undefined): boolean {
  return flattenFieldOrder(order).length > 0;
}

function toOrderGroup(label: string, value: FieldOrder): OrderGroup {
  if (Array.isArray(value)) {
    const items = [...value];
    return { label, items, leaves: items };
  }
  const children = Object.entries(value).map(([childLabel, childVal]) =>
    toOrderGroup(childLabel, childVal),
  );
  const leaves = children.flatMap((c) => c.leaves);
  return { label, items: [], children, leaves };
}

/** Groups for spoiler setup UI; null when order is a flat array. */
export function getOrderGroups(order: FieldOrder | undefined): OrderGroup[] | null {
  if (!isGroupedFieldOrder(order)) return null;
  return Object.entries(order).map(([label, val]) => toOrderGroup(label, val));
}
