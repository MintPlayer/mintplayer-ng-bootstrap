export type SortDirection = 'ascending' | 'descending';

export interface SortColumn {
  property: string;
  direction: SortDirection;
}

/**
 * Pure helper extracted from `datatable-sort-base.ts`. Computes the next
 * sort-columns array after a header click.
 *
 * Single-click on the same column toggles direction (asc → desc) and clears
 * any other sorts. Single-click on a different column replaces with an
 * ascending sort on that column.
 *
 * Shift-click: additive multi-column behaviour — adds the column ascending
 * if missing; toggles asc → desc if already ascending; removes it entirely
 * if already descending.
 */
export function computeNextSort(
  current: ReadonlyArray<SortColumn>,
  columnName: string,
  shiftKey: boolean,
): SortColumn[] {
  if (shiftKey) {
    const existingIndex = current.findIndex((c) => c.property === columnName);
    if (existingIndex === -1) {
      return [...current, { property: columnName, direction: 'ascending' as const }];
    }
    if (current[existingIndex].direction === 'ascending') {
      return current.map((c, i) =>
        i === existingIndex ? { ...c, direction: 'descending' as const } : c,
      );
    }
    return current.filter((_, i) => i !== existingIndex);
  }

  const existingSingle = current.length === 1 && current[0].property === columnName;
  return [
    {
      property: columnName,
      direction:
        existingSingle && current[0].direction === 'ascending'
          ? ('descending' as const)
          : ('ascending' as const),
    },
  ];
}
