/** Matches the `@container (max-width: 22rem)` threshold in the stylesheet. */
export const STACK_THRESHOLD_PX = 352;

/**
 * Whether the input group should pair its corners vertically at this host
 * width. A width of 0 means "not measured yet" (no layout, a detached host,
 * jsdom), not "narrow", so it never stacks.
 */
export function isStackedWidth(width: number): boolean {
  return width > 0 && width <= STACK_THRESHOLD_PX;
}
