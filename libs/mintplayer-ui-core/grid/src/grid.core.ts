import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/** Bootstrap's grid breakpoints, as the column directive's inputs name them (`xxs` is the unprefixed `col-N`). */
export const GRID_BREAKPOINTS = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;
export type GridBreakpoint = (typeof GRID_BREAKPOINTS)[number];

/** The column directive's inputs: a span (1–12) per breakpoint. */
export type GridColumnInputs = { readonly [K in GridBreakpoint]?: number };

/** The classes for a column's spans; an unset, zero or non-numeric span adds none. */
export function columnClasses(inputs: GridColumnInputs): string | null {
  return (
    GRID_BREAKPOINTS.filter((key) => !!inputs[key])
      .map((key) => (key === 'xxs' ? `col-${inputs[key]}` : `col-${key}-${inputs[key]}`))
      .join(' ') || null
  );
}

/** `.row` on the consumer's element (`bsRow`): a directive core, its view is the element's bag (#458). */
export const gridRowCore = defineCore<Record<never, never>, Record<never, never>, CoreBag>({
  view: () => ({ class: 'row' }),
});

/** `.col` on the consumer's element: an auto-width column. */
export const gridColCore = defineCore<Record<never, never>, Record<never, never>, CoreBag>({
  view: () => ({ class: 'col' }),
});

/** `col-<breakpoint>-<span>` on the consumer's element. */
export const gridColumnCore = defineCore<GridColumnInputs, Record<never, never>, CoreBag>({
  view: ({ inputs }) => ({ class: columnClasses(inputs) }),
});
