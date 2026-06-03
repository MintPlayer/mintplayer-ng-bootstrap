/** Bootstrap breakpoint names the navbar expands at. */
export type NavbarBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** `detail` of the `expandedchange` event the navbar fires when the collapse toggles. */
export interface NavbarExpandedChangeEventDetail {
  /** Whether the collapse is now (visually) expanded. */
  expanded: boolean;
}
