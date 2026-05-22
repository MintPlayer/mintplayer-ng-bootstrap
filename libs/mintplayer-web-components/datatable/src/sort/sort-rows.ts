import type { SortColumn } from './compute-next-sort';
/**
 * Apply a multi-column sort to an array of rows. Primary column wins; later
 * columns break ties. Stable on equal-equal comparisons (preserves input order).
 */
export function sortRows<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<SortColumn>): T[] {
  if (columns.length === 0) return rows.slice();
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const col of columns) {
        const av = readKey(a.row, col.property);
        const bv = readKey(b.row, col.property);
        const cmp = compare(av, bv);
        if (cmp !== 0) {
          return col.direction === 'ascending' ? cmp : -cmp;
        }
      }
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

function readKey(row: unknown, key: string): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  return (row as Record<string, unknown>)[key];
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}
